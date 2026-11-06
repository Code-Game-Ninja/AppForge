import { AIError } from './contracts';

export async function readLimitedText(response: Response, limit: number): Promise<string> {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new AIError('source_too_large', 'This source is too large to inspect safely.', 422); }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new AIError('source_too_large', 'This source is too large to inspect safely.', 422); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(result);
}

export async function readLimitedJson(response: Response, limit: number): Promise<unknown> {
  const text = await readLimitedText(response, limit);
  try { return JSON.parse(text); } catch { throw new AIError('invalid_upstream', 'The service returned an unreadable response. Try again later.', 502); }
}
