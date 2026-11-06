import { AIError, SECTION_IDS, WORKFLOWS } from './contracts';
import type { AIReport, AIRequest } from './contracts';

export function parseRepository(input: string): { owner: string; repo: string; fullName: string } {
  let value = input.trim();
  if (value.length > 300) throw new AIError('invalid_repository', 'Use a GitHub repository URL or owner/repository name.');
  if (value.includes('://')) {
    if (/[\\%]/.test(value) || /\/(?:\.|\.\.)(?:\/|$)/.test(value)) throw new AIError('invalid_repository', 'Use a direct GitHub repository root URL.');
    let url: URL;
    try { url = new URL(value); } catch { throw new AIError('invalid_repository', 'Check the GitHub repository URL.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) throw new AIError('invalid_repository', 'Use an HTTPS repository URL from github.com.');
    value = url.pathname.replace(/^\/+|\/+$/g, '');
  }
  const parts = value.split('/');
  if (parts.length !== 2) throw new AIError('invalid_repository', 'Use the repository root, such as github.com/owner/repository.');
  const [owner, name] = parts;
  const repo = name.replace(/\.git$/i, '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(repo) || ['.', '..'].includes(repo)) throw new AIError('invalid_repository', 'Check the repository owner and name.');
  return { owner, repo, fullName: `${owner}/${repo}` };
}

const requestKeys = new Set(['workflow', 'repository', 'description', 'question', 'cursor']);
export function validateRequest(value: unknown): AIRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AIError('invalid_request', 'Enter a repository or describe what you need.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some(key => !requestKeys.has(key))) throw new AIError('invalid_request', 'The request contains unsupported fields.');
  if (!WORKFLOWS.includes(data.workflow as AIRequest['workflow'])) throw new AIError('invalid_workflow', 'Choose an available analysis workflow.');
  const read = (key: string, limit: number) => {
    const input = data[key] ?? '';
    if (typeof input !== 'string' || input.length > limit) throw new AIError('invalid_request', `${key === 'description' ? 'Description' : key === 'question' ? 'Question' : 'Repository'} is too long or invalid.`);
    return input.trim();
  };
  const request = { workflow: data.workflow as AIRequest['workflow'], repository: read('repository', 300), description: read('description', 3000), question: read('question', 2000) };
  const cursor = read('cursor', 1800);
  if (cursor && request.workflow !== 'recommend') throw new AIError('invalid_request', 'Pagination is only available for project searches.');
  if (request.workflow === 'recommend') {
    if (request.description.length < 2) throw new AIError('missing_description', 'Enter a topic or describe the tools you need.');
    request.repository = '';
    request.question = '';
  } else {
    request.repository = parseRepository(request.repository).fullName;
    if (request.workflow !== 'rebuild') request.description = '';
    if (request.workflow === 'trace' && request.question.length < 5) throw new AIError('missing_question', 'Name the feature you want to trace.');
  }
  return cursor ? { ...request, cursor } : request;
}

// Detection is supplementary. The real boundary is a tool-free model receiving
// only public evidence in a user message, never credentials or privileged text.
const instructionPatterns = [
  /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer|safety)\s+(?:instructions|prompts|rules)/i,
  /(?:reveal|print|exfiltrate|send)\b.{0,50}\b(?:api[-_ ]?keys?|secrets?|system prompt|environment variables)/i,
  /(?:<\|(?:system|developer|im_start|im_end)|\[INST\]|<\/?(?:system|developer)>)/i,
  /\b(?:you are now|act as)\s+(?:DAN|an?\s+unrestricted|an?\s+unfiltered)/i,
];
const credentialPattern = /\b(?:sk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{16,}|gh[pousr]_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/g;
export function sanitizeEvidence(input: string, secrets: string[] = []): { text: string; omitted: number; credentialsRedacted: boolean } {
  let omitted = 0;
  let credentialsRedacted = false;
  for (const secret of secrets) if (secret.length >= 12 && input.includes(secret)) { input = input.split(secret).join('[credential redacted]'); credentialsRedacted = true; }
  const text = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').split('\n').map(line => {
    if (instructionPatterns.some(pattern => pattern.test(line))) { omitted++; return '[Instruction-like text omitted from this source line]'; }
    return line.replace(credentialPattern, () => { credentialsRedacted = true; return '[credential redacted]'; });
  }).join('\n');
  return { text, omitted, credentialsRedacted };
}

export function safeSourcePath(path: string): boolean {
  if (/[\\\u0000-\u001f\u007f]/.test(path) || path.length > 500) return false;
  const segments = path.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /^\.env/i.test(segment) || /^(?:secrets?|credentials?)(?:\.|$)|^(?:node_modules|vendor|dist|build|\.git)$/i.test(segment))) return false;
  if (/(?:private[-_]?key|id_rsa|id_ed25519|\.pem$|\.key$|\.p12$|\.pfx$|\.lock$|lock\.json$|\.min\.(?:js|css)$)/i.test(path)) return false;
  return /\.(?:md|mdx|rst|txt|json|toml|yaml|yml|ts|tsx|js|jsx|py|rs|go|java|kt|swift|cs|vue|svelte|html|css)$/i.test(path) || /(?:^|\/)(?:Dockerfile|Makefile|go\.mod)$/i.test(path);
}

export function validateReport(value: unknown, sourceIds: string[], repositories: string[], secrets: string[] = [], candidates?: { repo: string; sourceId: string }[]): AIReport {
  const invalid = () => { throw new AIError('invalid_answer', 'The answer could not be validated. Try a more focused question.', 502); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const payload = JSON.stringify(value);
  if (payload.length > 40_000 || secrets.some(secret => secret.length >= 12 && payload.includes(secret)) || new RegExp(credentialPattern.source).test(payload)) return invalid();
  const record = (input: unknown, keys: string[]): Record<string, unknown> => {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key)) || keys.some(key => !Object.prototype.hasOwnProperty.call(input, key))) return invalid();
    return input as Record<string, unknown>;
  };
  const string = (input: unknown, max: number) => { if (typeof input !== 'string' || input.length > max) return invalid(); return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim(); };
  const list = (input: unknown, max: number): unknown[] => { if (!Array.isArray(input) || input.length > max) return invalid(); return input; };
  const citations = (input: unknown): string[] => Array.from(new Set(list(input, 12).map(id => { if (typeof id !== 'string' || !sourceIds.includes(id)) return invalid(); return id; })));
  const data = record(value, ['disposition', 'title', 'summary', 'sections', 'recommendations', 'nextQuestion']);
  if (!['answered', 'needs_clarification', 'refused'].includes(data.disposition as string)) return invalid();
  const seen = new Set<string>();
  const sections = list(data.sections, 8).map(value => {
    const section = record(value, ['id', 'heading', 'items']);
    if (!SECTION_IDS.includes(section.id as typeof SECTION_IDS[number]) || seen.has(section.id as string)) return invalid();
    seen.add(section.id as string);
    return { id: section.id as typeof SECTION_IDS[number], heading: string(section.heading, 120), items: list(section.items, 10).map(value => {
      const item = record(value, ['text', 'certainty', 'sourceIds']);
      if (!['documented', 'inferred', 'unknown'].includes(item.certainty as string)) return invalid();
      const ids = citations(item.sourceIds);
      if (item.certainty === 'documented' && !ids.length) return invalid();
      return { text: string(item.text, 1800), certainty: item.certainty as 'documented' | 'inferred' | 'unknown', sourceIds: ids };
    }) };
  });
  const usedRepos = new Set<string>();
  const recommendations = list(data.recommendations, 6).map(value => {
    const item = record(value, ['repo', 'reason', 'tradeoff', 'sourceIds']);
    if (typeof item.repo !== 'string' || !repositories.includes(item.repo) || usedRepos.has(item.repo)) return invalid();
    usedRepos.add(item.repo);
    const ids = citations(item.sourceIds);
    if (!ids.length || (candidates && !ids.includes(candidates.find(candidate => candidate.repo === item.repo)?.sourceId ?? ''))) return invalid();
    return { repo: item.repo, reason: string(item.reason, 1000), tradeoff: string(item.tradeoff, 700), sourceIds: ids };
  });
  if (data.disposition !== 'answered' && (sections.length || recommendations.length)) return invalid();
  if (!string(data.title, 140) || !string(data.summary, 2200) || (data.disposition === 'answered' && !sections.length && !recommendations.length)) return invalid();
  return { disposition: data.disposition as AIReport['disposition'], title: string(data.title, 140), summary: string(data.summary, 2200), sections, recommendations, nextQuestion: string(data.nextQuestion, 400) };
}

export function validateOrigin(origin: string | null, requestOrigin: string, configuredOrigin?: string) {
  if (!origin || origin !== (configuredOrigin || requestOrigin)) throw new AIError('invalid_origin', 'Open the assistant from AppForge to make this request.', 403);
}
