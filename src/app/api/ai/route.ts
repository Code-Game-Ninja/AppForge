import { NextRequest, NextResponse } from 'next/server';
import { AIError } from '@/lib/ai/contracts';
import { validateOrigin, validateRequest } from '@/lib/ai/security';
import { analyze, aiLimits } from '@/lib/ai/service';
import { providerConfiguration } from '@/lib/ai/provider';
import { readLimitedText } from '@/lib/ai/http';

export const runtime = 'nodejs';
export const maxDuration = 180;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET() {
  try {
    const config = providerConfiguration();
    return NextResponse.json({ available: true, provider: config.label || (config.provider === 'openai' ? 'OpenAI' : config.provider === 'ollama' ? 'Ollama' : 'the configured AI provider') }, { headers });
  } catch { return NextResponse.json({ available: false, provider: null }, { headers }); }
}

export async function POST(request: NextRequest) {
  try {
    validateOrigin(request.headers.get('origin'), request.nextUrl.origin, process.env.APPFORGE_ORIGIN);
    if (request.headers.get('sec-fetch-site') === 'cross-site') throw new AIError('invalid_origin', 'Open the assistant from AppForge to make this request.', 403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AIError('invalid_request', 'Send a valid assistant request.', 415);
    if (Number(request.headers.get('content-length')) > 12_000) throw new AIError('request_too_large', 'The request is too large. Shorten your description.', 413);
    aiLimits.checkRequest();
    let body: string;
    try { body = await readLimitedText(new Response(request.body), 12_000); }
    catch (error) { if (error instanceof AIError && error.code === 'source_too_large') throw new AIError('request_too_large', 'The request is too large. Shorten your description.', 413); throw error; }
    let value: unknown;
    try { value = JSON.parse(body); } catch { throw new AIError('invalid_request', 'Send a valid assistant request.'); }
    const result = await analyze(validateRequest(value));
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof AIError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { ...headers, ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) } });
    // Do not forward provider errors, request bodies, or credentials to clients.
    return NextResponse.json({ error: 'The assistant could not complete this request. Try again later.', code: 'assistant_unavailable' }, { status: 503, headers });
  }
}
