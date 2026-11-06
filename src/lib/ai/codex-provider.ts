import 'server-only';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { AIError } from './contracts';
import { connectionError } from './provider-error';

// This version was checked against a local capture server: with the settings
// below it sends no tools. Fail closed on upgrades until that check is repeated.
export const VERIFIED_CODEX_VERSION = '0.166.0-alpha.5.1';

interface CodexConnection {
  codexPath: string;
  endpoint: string;
  model: string;
  key: string;
  label: string;
  reasoningEffort: string;
  serviceTier: string;
}

function unavailable() {
  return new AIError('ai_client_unavailable', 'The AI client is unavailable. The site owner needs to install the supported Codex client and check its server configuration.', 503);
}

function clientEnvironment(clientHome: string, directory: string, key: string): NodeJS.ProcessEnv {
  // Never inherit the site's secrets, the user's Codex config, plugins, hooks,
  // MCP connections, shell profile, or browser/computer-use service variables.
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production', CODEX_HOME: clientHome, USERPROFILE: clientHome, HOME: clientHome, TEMP: directory, TMP: directory, TMPDIR: directory, APPFORGE_AI_TOKEN: key };
  for (const name of ['SystemRoot', 'WINDIR']) if (process.env[name]) env[name] = process.env[name];
  return env;
}

function runClient(binary: string, args: string[], directory: string, env: NodeJS.ProcessEnv, input = '', parseEvents = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: directory, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let pending = '';
    let bytes = 0;
    let completed = false;
    let settled = false;
    const finish = (error?: AIError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { child.kill(); reject(error); } else resolve(stdout);
    };
    const timer = setTimeout(() => finish(new AIError('ai_unavailable', 'The AI service took too long to respond. Try a more focused question.', 503)), 60_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > 750_000) { finish(new AIError('invalid_answer', 'The answer exceeded the response limit. Try a more focused question.', 502)); return; }
      if (!parseEvents) { stdout += chunk; return; }
      pending += chunk;
      let at: number;
      while ((at = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, at); pending = pending.slice(at + 1);
        if (!line.trim()) continue;
        let event: { type?: string; item?: { type?: string; text?: unknown }; error?: { message?: string }; message?: string };
        try { event = JSON.parse(line); } catch { finish(new AIError('invalid_answer', 'The AI client returned an unreadable answer. Try again later.', 502)); return; }
        if (!event || typeof event !== 'object') { finish(new AIError('invalid_answer', 'The AI client returned an unreadable answer. Try again later.', 502)); return; }
        if (event.item && !['agent_message', 'reasoning'].includes(event.item.type || '')) {
          finish(new AIError('invalid_answer', 'The AI client attempted an unsupported action. Try a repository question.', 502)); return;
        }
        if (event.type === 'item.completed' && event.item?.type === 'agent_message' && typeof event.item.text === 'string') stdout = event.item.text;
        if (event.type === 'turn.completed') completed = true;
        if (event.type === 'turn.failed' || event.type === 'error') stderr = (stderr + '\n' + (event.error?.message || event.message || '')).slice(-16_000);
      }
    });
    child.stderr.on('data', (chunk: string) => { stderr = (stderr + chunk).slice(-16_000); });
    child.on('error', () => finish(unavailable()));
    child.stdin.on('error', () => finish(unavailable()));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) {
        if (/\bcontent_filter\b/i.test(stderr)) finish(new AIError('ai_refused', 'The AI provider declined this request.', 422));
        else if (/unauthorized_client_error|unauthorized client detected|\b401\b|\b403\b|invalid.api.key|authentication/i.test(stderr)) finish(connectionError(stderr));
        else if (/\b429\b|rate.limit/i.test(stderr)) finish(new AIError('ai_rate_limited', 'The AI provider is busy. Try again later.', 503));
        else if (/stream disconnected|error sending request|connection failed/i.test(stderr)) finish(new AIError('ai_unavailable', 'The AI service could not complete this request. Try again later.', 503));
        else finish(unavailable());
        return;
      }
      if (parseEvents && (!completed || pending.trim() || !stdout)) { finish(new AIError('incomplete_answer', 'The answer was interrupted. Try a more focused question.', 502)); return; }
      finish();
    });
    child.stdin.end(input);
  });
}

export async function generateCodexStructured(config: CodexConnection, input: { role: 'developer' | 'user'; content: string }[], schema: object): Promise<{ value: unknown; refused: boolean }> {
  if (!isAbsolute(config.codexPath) || !config.endpoint.endsWith('/responses')) throw unavailable();
  const directory = await mkdtemp(join(tmpdir(), 'appforge-ai-'));
  try {
    const clientHome = join(directory, 'client-home');
    await mkdir(clientHome, { mode: 0o700 });
    const env = clientEnvironment(clientHome, directory, config.key);
    const version = await runClient(config.codexPath, ['--version'], directory, env);
    if (version.trim() !== `codex-cli ${VERIFIED_CODEX_VERSION}`) throw unavailable();
    const instructionsFile = join(directory, 'instructions.md');
    const schemaFile = join(directory, 'answer.schema.json');
    await writeFile(instructionsFile, input.filter(message => message.role === 'developer').map(message => message.content).join('\n\n'), { mode: 0o600 });
    await writeFile(schemaFile, JSON.stringify(schema), { mode: 0o600 });
    const settings: Record<string, string | number | boolean> = {
      model: config.model, model_provider: 'appforge', approval_policy: 'never', sandbox_mode: 'read-only',
      model_instructions_file: instructionsFile, project_doc_max_bytes: 0, web_search: 'disabled',
      'model_providers.appforge.name': config.label,
      'model_providers.appforge.base_url': config.endpoint.slice(0, -'/responses'.length),
      'model_providers.appforge.env_key': 'APPFORGE_AI_TOKEN', 'model_providers.appforge.wire_api': 'responses',
      'model_providers.appforge.request_max_retries': 0, 'model_providers.appforge.stream_max_retries': 0,
      'features.shell_tool': false, 'features.view_image': false, 'features.multi_agent': false, 'features.hooks': false, 'features.memories': false,
      'features.remote_plugin': false, 'features.shell_snapshot': false, 'features.enable_request_compression': false,
      'features.apps': false, 'features.code_mode': false, 'features.apply_patch_freeform': false,
      'shell_environment_policy.inherit': 'none',
    };
    if (config.reasoningEffort) settings.model_reasoning_effort = config.reasoningEffort;
    if (config.serviceTier) settings.service_tier = config.serviceTier === 'priority' ? 'fast' : config.serviceTier;
    const args = ['exec', '--ignore-user-config', '--strict-config', '--skip-git-repo-check', '--ephemeral', '--json', '--color', 'never', '--cd', directory, '--output-schema', schemaFile];
    // JSON string quoting is also valid TOML string quoting here. Values are
    // individual argv entries; no shell interpolates commands or user content.
    for (const [key, value] of Object.entries(settings)) args.push('-c', `${key}=${JSON.stringify(value)}`);
    args.push('-');
    let answer: string;
    try { answer = await runClient(config.codexPath, args, directory, env, input.filter(message => message.role === 'user').map(message => message.content).join('\n\n'), true); }
    catch (error) { if (error instanceof AIError && error.code === 'ai_refused') return { value: null, refused: true }; throw error; }
    try { return { value: JSON.parse(answer), refused: false }; }
    catch { throw new AIError('invalid_answer', 'The answer could not be validated. Try a more focused question.', 502); }
  } finally {
    // Only delete the directory created by this invocation, under the temp root.
    const target = relative(tmpdir(), directory);
    if (target.startsWith('appforge-ai-') && !target.includes('..') && !isAbsolute(target)) await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
