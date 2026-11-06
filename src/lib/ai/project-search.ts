import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mapRepoToApp } from '@/lib/adapters';
import type { GitHubRepo } from '@/lib/github';
import type { App } from '@/types';
import { AIError } from './contracts';
import type { ProjectSearchCoverage } from './contracts';
import { readLimitedJson } from './http';
import { parseRepository, sanitizeEvidence } from './security';
import { validSearchQuery } from './search-policy';

const PER_PAGE = 25;
const MAX_PAGE = 40; // GitHub exposes at most 1,000 results per repository query.
const cursorKey = process.env.AI_SEARCH_CURSOR_SECRET || randomBytes(32).toString('hex');
interface SearchCursor { queries: string[]; pages: number[]; descriptionHash: string; expires: number; batch: number }
const descriptionHash = (description: string) => createHash('sha256').update(description.trim()).digest('hex');
const restrictedQuery = (query: string) => `${query} in:name,description,readme is:public archived:false fork:false`;
const searchURL = (query: string) => `https://github.com/search?${new URLSearchParams({ q: restrictedQuery(query), type: 'repositories' })}`;
export function firstSearchCursor(queries: string[], description: string): SearchCursor {
  return { queries, pages: queries.map(() => 1), descriptionHash: descriptionHash(description), expires: Date.now() + 1_800_000, batch: 1 };
}
export function encodeSearchCursor(cursor: SearchCursor): string {
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  return `${payload}.${createHmac('sha256', cursorKey).update(payload).digest('base64url')}`;
}
export function decodeSearchCursor(value: string, description: string): SearchCursor {
  const invalid = () => { throw new AIError('invalid_cursor', 'This search has expired or changed. Start a new search.', 400); };
  if (value.length > 1800) return invalid();
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra || !/^[a-zA-Z0-9_-]+$/.test(payload)) return invalid();
  const expected = createHmac('sha256', cursorKey).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return invalid();
  let data: SearchCursor;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return invalid(); }
  if (!data || !Array.isArray(data.queries) || !data.queries.length || data.queries.length > 3 || !data.queries.every(validSearchQuery) || !Array.isArray(data.pages) || data.pages.length !== data.queries.length || !data.pages.every(page => Number.isInteger(page) && page >= 0 && page <= MAX_PAGE) || !data.pages.some(page => page > 0) || data.descriptionHash !== descriptionHash(description) || !Number.isFinite(data.expires) || data.expires <= Date.now() || data.expires > Date.now() + 1_800_000 || !Number.isInteger(data.batch) || data.batch < 2 || data.batch > 80) return invalid();
  return data;
}

function normalizeRepository(value: unknown): GitHubRepo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.private !== false || raw.archived === true || raw.fork === true || typeof raw.full_name !== 'string') return null;
  let parsed;
  try { parsed = parseRepository(raw.full_name); } catch { return null; }
  const owner = raw.owner as Record<string, unknown> | undefined;
  if (!owner || typeof owner.login !== 'string' || owner.login.toLowerCase() !== parsed.owner.toLowerCase() || raw.name !== parsed.repo) return null;
  const secrets = [process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '', process.env.GITHUB_TOKEN || ''];
  if (sanitizeEvidence(raw.full_name, secrets).credentialsRedacted) return null;
  const text = (value: unknown, max: number) => typeof value === 'string' ? sanitizeEvidence(value.slice(0, max), secrets).text : '';
  const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const license = raw.license as Record<string, unknown> | null;
  const spdx = text(license?.spdx_id, 60);
  const topics = Array.isArray(raw.topics) ? raw.topics.filter(topic => typeof topic === 'string' && /^[a-zA-Z0-9-]{1,50}$/.test(topic)).slice(0, 20) as string[] : [];
  const url = `https://github.com/${parsed.fullName}`;
  return {
    id: count(raw.id), name: parsed.repo, full_name: parsed.fullName, description: text(raw.description, 1200) || null,
    html_url: url, homepage: null, stargazers_count: count(raw.stargazers_count), forks_count: count(raw.forks_count), watchers_count: count(raw.watchers_count), open_issues_count: count(raw.open_issues_count),
    license: spdx ? { key: spdx.toLowerCase(), name: spdx, spdx_id: spdx } : null, topics, language: text(raw.language, 60) || null,
    created_at: date(raw.created_at), updated_at: date(raw.updated_at), pushed_at: date(raw.pushed_at), default_branch: text(raw.default_branch, 100),
    owner: { login: parsed.owner, avatar_url: `https://github.com/${parsed.owner}.png`, html_url: `https://github.com/${parsed.owner}`, type: owner.type === 'Organization' ? 'Organization' : 'User' },
  };
}

async function searchPage(query: string, page: number) {
  const params = new URLSearchParams({ q: restrictedQuery(query), per_page: String(PER_PAGE), page: String(page) });
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.startsWith('your_')) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let response: Response;
  try { response = await fetch(`https://api.github.com/search/repositories?${params}`, { headers, redirect: 'error', signal: AbortSignal.timeout(8000), next: { revalidate: 600 } }); }
  catch { throw new AIError('github_unavailable', 'GitHub search could not be reached. Try again later.', 503); }
  if (!response.ok) throw new AIError('github_unavailable', response.status === 403 || response.status === 429 ? 'GitHub’s search limit was reached. Try again later or add a server-side GitHub token.' : 'GitHub could not complete this search. Try again later.', 503);
  const data = await readLimitedJson(response, 2_000_000) as Record<string, unknown>;
  if (!data || !Array.isArray(data.items) || typeof data.total_count !== 'number' || !Number.isSafeInteger(data.total_count) || data.total_count < 0) throw new AIError('invalid_upstream', 'GitHub returned unreadable search results. Try again later.', 502);
  const items = data.items.slice(0, PER_PAGE).map(normalizeRepository).filter((repo): repo is GitHubRepo => repo !== null);
  return { items, totalCount: data.total_count, incomplete: data.incomplete_results === true, rawCount: Math.min(data.items.length, PER_PAGE), url: searchURL(query) };
}

export async function searchPublicProjects(cursor: SearchCursor): Promise<{ apps: App[]; queries: ProjectSearchCoverage['queries']; nextPages: number[]; warnings: string[]; successful: number }> {
  const responses = await Promise.allSettled(cursor.queries.map((query, index) => cursor.pages[index] ? searchPage(query, cursor.pages[index]) : Promise.resolve(null)));
  const repositories = new Map<string, GitHubRepo>();
  const queries: ProjectSearchCoverage['queries'] = [];
  const nextPages = [...cursor.pages];
  const warnings: string[] = [];
  let successful = 0;
  responses.forEach((response, index) => {
    const query = cursor.queries[index];
    if (response.status === 'rejected') {
      warnings.push(response.reason instanceof AIError ? response.reason.message : 'One GitHub search could not be completed.');
      queries.push({ query, url: searchURL(query), totalCount: null, incomplete: true });
      return; // Retry the failed page on the next request; never silently skip it.
    }
    if (!response.value) { queries.push({ query, url: searchURL(query), totalCount: null, incomplete: false }); return; }
    successful++;
    const result = response.value;
    queries.push({ query, url: result.url, totalCount: result.totalCount, incomplete: result.incomplete });
    for (const repo of result.items) repositories.set(repo.full_name.toLowerCase(), repo);
    const page = cursor.pages[index];
    nextPages[index] = result.rawCount === PER_PAGE && page < MAX_PAGE && page * PER_PAGE < Math.min(result.totalCount, 1000) ? page + 1 : 0;
    if (result.incomplete) warnings.push('GitHub marked part of this search as incomplete. Try a narrower description for better coverage.');
    if (result.items.length < result.rawCount) warnings.push('Some results were excluded because their public repository metadata could not be validated.');
    if (result.totalCount > 1000) warnings.push('GitHub exposes the first 1,000 results per query. Refine your description or explore the linked GitHub search for broader coverage.');
  });
  return { apps: await Promise.all(Array.from(repositories.values()).map(repo => mapRepoToApp(repo))), queries, nextPages, warnings: Array.from(new Set(warnings)), successful };
}
