import 'server-only';
import { AIError, reportSchema } from './contracts';
import type { AIReport, AIRequest, EvidenceSource, ProjectSearchPlan } from './contracts';
import { AI_INSTRUCTIONS } from './policy';
import { validateReport } from './security';
import { readLimitedJson, readLimitedText } from './http';
import { SEARCH_INSTRUCTIONS, searchPlanSchema, validateSearchPlan } from './search-policy';
import { generateCodexStructured } from './codex-provider';
import { connectionError } from './provider-error';
import { isAbsolute } from 'node:path';

export function providerConfiguration() {
  const provider = process.env.AI_PROVIDER || 'compatible';
  if (!['openai', 'compatible', 'ollama'].includes(provider)) throw new AIError('provider_unavailable', 'The assistant is not available right now.', 503);
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
  const model = process.env.AI_MODEL || '';
  if (!model || (provider !== 'ollama' && (!key || key.startsWith('your_')))) throw new AIError('ai_not_configured', 'The AI assistant is not connected yet. You can still browse projects and their documentation.', 503);
  const format = provider === 'ollama' ? 'ollama' : process.env.AI_API_FORMAT || (provider === 'openai' ? 'responses' : 'chat');
  if (!['responses', 'chat', 'ollama'].includes(format) || (provider !== 'ollama' && format === 'ollama')) throw new AIError('provider_unavailable', 'The assistant is not available right now.', 503);
  let base = process.env.AI_BASE_URL || (provider === 'openai' ? 'https://api.openai.com/v1' : provider === 'ollama' ? 'http://127.0.0.1:11434' : '');
  let endpoint = process.env.AI_ENDPOINT || '';
  try {
    const validateURL = (value: string) => {
      const url = new URL(value);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) throw new Error();
      return url.href.replace(/\/$/, '');
    };
    if (endpoint) endpoint = validateURL(endpoint);
    else {
      base = validateURL(base);
      endpoint = `${base}/${format === 'responses' ? 'responses' : format === 'ollama' ? 'api/chat' : 'chat/completions'}`;
    }
  } catch { throw new AIError('provider_unavailable', 'The assistant is not available right now.', 503); }
  const label = (process.env.AI_PROVIDER_NAME || (provider === 'openai' ? 'OpenAI' : provider === 'ollama' ? 'Ollama' : 'the configured AI provider')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 60);
  const transport = process.env.AI_TRANSPORT || 'http';
  const codexPath = process.env.AI_CODEX_PATH || '';
  const reasoningEffort = process.env.AI_REASONING_EFFORT || '';
  const configuredTier = process.env.AI_SERVICE_TIER || '';
  const serviceTier = configuredTier === 'fast' ? 'priority' : configuredTier;
  if (!['http', 'codex'].includes(transport) || !['', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(reasoningEffort) || !['', 'auto', 'default', 'priority', 'flex'].includes(serviceTier)) throw new AIError('provider_unavailable', 'The assistant is not available right now.', 503);
  if (transport === 'codex' && (format !== 'responses' || !isAbsolute(codexPath) || !endpoint.endsWith('/responses') || !['', 'priority'].includes(serviceTier))) throw new AIError('ai_client_unavailable', 'The AI client needs a supported server configuration.', 503);
  return { provider, format, key, model, endpoint, label, transport, codexPath, reasoningEffort, serviceTier };
}

export function buildModelInput(request: AIRequest, sources: EvidenceSource[], candidates: { repo: string; sourceId: string }[]) {
  return [
    { role: 'developer' as const, content: AI_INSTRUCTIONS },
    { role: 'user' as const, content: JSON.stringify({ task: { workflow: request.workflow, repository: request.repository, description: request.description, question: request.question }, untrustedEvidence: sources, allowedRecommendations: candidates }) },
  ];
}

async function generateStructured(input: { role: 'developer' | 'user'; content: string }[], schema: object, name: string, maxTokens: number): Promise<{ value: unknown; refused: boolean }> {
  const config = providerConfiguration();
  if (config.transport === 'codex') return generateCodexStructured(config, input, schema);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.provider !== 'ollama') headers.Authorization = `Bearer ${config.key}`;
  let payload: object;
  if (config.format === 'responses') {
    payload = { model: config.model, input, store: false, stream: false, max_output_tokens: maxTokens + (config.reasoningEffort && config.reasoningEffort !== 'none' ? 8000 : 0), ...(config.reasoningEffort ? { reasoning: { effort: config.reasoningEffort } } : {}), ...(config.serviceTier ? { service_tier: config.serviceTier } : {}), text: { format: { type: 'json_schema', name, strict: true, schema } } };
  } else {
    const messages = input.map(message => ({ ...message, role: message.role === 'developer' ? 'system' : message.role }));
    payload = config.provider === 'ollama' ? { model: config.model, messages, stream: false, format: schema, options: { num_predict: maxTokens } } : { model: config.model, messages, max_tokens: maxTokens, response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } } };
  }
  let response: Response;
  try { response = await fetch(config.endpoint, { method: 'POST', headers, body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(60_000), cache: 'no-store' }); }
  catch { throw new AIError('ai_unavailable', 'The AI service could not be reached. Try again later.', 503); }
  if (response.status === 401 || response.status === 403) {
    const diagnostic = await readLimitedText(response, 16_000).catch(() => '');
    throw connectionError(diagnostic);
  }
  if (!response.ok) throw new AIError(response.status === 429 ? 'ai_rate_limited' : 'ai_unavailable', response.status === 429 ? 'The AI provider is busy. Try again later.' : 'The AI provider could not answer this request. Try again later.', 503);
  const raw = await readLimitedJson(response, 250_000) as Record<string, unknown>;
  let text = '';
  let refused = false;
  if (config.format === 'responses') {
    if (raw.status === 'incomplete' && (raw.incomplete_details as { reason?: string } | undefined)?.reason === 'content_filter') return { value: null, refused: true };
    if (raw.status !== 'completed') throw new AIError('incomplete_answer', 'The answer was interrupted. Try a more focused question.', 502);
    const output = Array.isArray(raw.output) ? raw.output : [];
    for (const item of output) {
      if (!item || typeof item !== 'object' || item.type !== 'message') continue;
      for (const content of Array.isArray(item.content) ? item.content : []) {
        if (!content || typeof content !== 'object') continue;
        if (content.type === 'refusal') refused = true;
        if (content.type === 'output_text' && typeof content.text === 'string') text += content.text;
      }
    }
  } else if (config.provider === 'ollama') {
    const message = raw.message as { content?: string } | undefined;
    text = typeof message?.content === 'string' ? message.content : '';
    if (raw.done !== true) throw new AIError('incomplete_answer', 'The answer was interrupted. Try a more focused question.', 502);
  } else {
    const choices = raw.choices as { finish_reason?: string; message?: { content?: string; refusal?: string } }[] | undefined;
    const choice = choices?.[0];
    refused = !!choice?.message?.refusal;
    if (!refused && choice?.finish_reason !== 'stop') throw new AIError('incomplete_answer', 'The answer was interrupted. Try a more focused question.', 502);
    text = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  }
  if (refused) return { value: null, refused: true };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new AIError('invalid_answer', 'The answer could not be validated. Try a more focused question.', 502); }
  return { value: parsed, refused: false };
}

export async function generateReport(request: AIRequest, sources: EvidenceSource[], candidates: { repo: string; sourceId: string }[]): Promise<AIReport> {
  const config = providerConfiguration();
  const output = await generateStructured(buildModelInput(request, sources, candidates), reportSchema(sources.map(source => source.id), candidates.map(candidate => candidate.repo)), 'appforge_research', 5000);
  if (output.refused) return { disposition: 'refused', title: 'Try a different question', summary: 'The assistant cannot help with this request. Ask about project capabilities, setup, architecture, or an original implementation plan.', sections: [], recommendations: [], nextQuestion: '' };
  return validateReport(output.value, sources.map(source => source.id), candidates.map(candidate => candidate.repo), [config.key, process.env.GITHUB_TOKEN || ''], candidates);
}

export async function planProjectSearch(description: string): Promise<ProjectSearchPlan> {
  const config = providerConfiguration();
  const output = await generateStructured([{ role: 'developer', content: SEARCH_INSTRUCTIONS }, { role: 'user', content: JSON.stringify({ untrustedDescription: description }) }], searchPlanSchema, 'appforge_search_plan', 800);
  if (output.refused) return { disposition: 'refused', queries: [], question: 'Ask about apps, tools, or a project you want to build.' };
  return validateSearchPlan(output.value, [config.key, process.env.GITHUB_TOKEN || '']);
}
