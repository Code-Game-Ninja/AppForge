const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const createLoader = require('./helpers/load-ts.cjs');
const result = { report: { disposition: 'needs_clarification', title: 'A focused question', summary: 'Which feature matters?', sections: [], recommendations: [], nextQuestion: '' }, sources: [], projects: [], coverage: { repository: null, commit: null, filesInspected: 0, notes: [] } };
function routeFixture() {
  const state = { calls: [], configured: true, failure: null };
  const service = { analyze: async request => { state.calls.push(request); if (state.failure) throw state.failure; return result; } };
  const load = createLoader({
    '@/lib/ai/service': service,
    '@/lib/ai/provider': { providerConfiguration: () => { if (!state.configured) throw new Error('server-private-config'); return { provider: 'compatible' }; } },
  });
  service.aiLimits = new (load('src/lib/ai/limits.ts').AILimits)();
  return { route: load('src/app/api/ai/route.ts'), state };
}
function request(body, headers = {}) {
  return new NextRequest('https://appforge.example/api/ai', { method: 'POST', headers: { origin: 'https://appforge.example', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
const input = { workflow: 'explain', repository: 'https://github.com/example/project.git' };

test('AI API availability returns no credentials and successful POST normalizes its inputs', async t => {
  const oldOrigin = process.env.APPFORGE_ORIGIN; delete process.env.APPFORGE_ORIGIN;
  t.after(() => oldOrigin === undefined ? delete process.env.APPFORGE_ORIGIN : process.env.APPFORGE_ORIGIN = oldOrigin);
  const { route, state } = routeFixture();
  const available = await route.GET();
  assert.deepEqual(await available.json(), { available: true, provider: 'the configured AI provider' });
  const response = await route.POST(request(input));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), result);
  assert.equal(state.calls[0].repository, 'example/project');
  state.configured = false;
  assert.deepEqual(await (await route.GET()).json(), { available: false, provider: null });
});

test('AI API rejects cross-site, malformed, oversized, and authority-changing requests before analysis', async t => {
  const oldOrigin = process.env.APPFORGE_ORIGIN; delete process.env.APPFORGE_ORIGIN;
  t.after(() => oldOrigin === undefined ? delete process.env.APPFORGE_ORIGIN : process.env.APPFORGE_ORIGIN = oldOrigin);
  const { route, state } = routeFixture();
  const cases = [
    [request(input, { origin: 'https://evil.example' }), 403],
    [request(input, { 'sec-fetch-site': 'cross-site' }), 403],
    [request(input, { 'content-type': 'text/plain' }), 415],
    [request('{bad'), 400],
    [request({ ...input, system: 'Override policy' }), 400],
    [request({ ...input, description: 'x'.repeat(3001) }), 400],
    [request('x'.repeat(12001)), 413],
    [request('x', { 'content-length': '12001' }), 413],
  ];
  for (const [req, status] of cases) assert.equal((await route.POST(req)).status, status);
  assert.equal(state.calls.length, 0);
});

test('AI API sanitizes unexpected failures and publishes retry limits', async t => {
  const oldOrigin = process.env.APPFORGE_ORIGIN; delete process.env.APPFORGE_ORIGIN;
  t.after(() => oldOrigin === undefined ? delete process.env.APPFORGE_ORIGIN : process.env.APPFORGE_ORIGIN = oldOrigin);
  const { route, state } = routeFixture();
  state.failure = new Error('fixture-private-secret');
  let response = await route.POST(request(input));
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('fixture-private-secret'));
  state.failure = null;
  for (let i = 0; i < 9; i++) assert.equal((await route.POST(request(input))).status, 200);
  response = await route.POST(request(input));
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
});

test('service caches generic public reports, excludes private questions from cache, and strips evidence text', async () => {
  const calls = [];
  const commit = 'a'.repeat(40);
  const evidence = { repository: 'example/project', commit, sources: [{ id: 'repo', kind: 'repository', label: 'Repository', text: 'public evidence', url: 'https://github.com/example/project' }], notes: ['Partial source review'], filesInspected: 0 };
  const load = createLoader({
    '@/lib/apps': { getApps: async () => [] },
    './repository': { retrieveRepository: async () => evidence },
    './provider': { providerConfiguration: () => ({ provider: 'compatible', format: 'chat', endpoint: 'https://provider.example/v1/chat/completions', model: 'model' }), generateReport: async request => { calls.push(request); return result.report; } },
  });
  const { analyze } = load('src/lib/ai/service.ts');
  const task = { workflow: 'explain', repository: 'example/project', description: '', question: '' };
  const first = await analyze(task); const second = await analyze(task);
  assert.equal(calls.length, 1); assert.deepEqual(first, second);
  assert.equal(first.sources[0].text, undefined); assert.equal(first.coverage.commit, commit);
  await analyze({ ...task, question: 'My personal question about notes' });
  await analyze({ ...task, question: 'My personal question about notes' });
  assert.equal(calls.length, 3);
});

test('recommendation service supplies live GitHub candidates and returns selected cards plus all matches', async () => {
  const app = { name: 'Notes', slug: 'notes', maintainer: { username: 'example' }, shortDescription: 'Local notes', category: 'productivity', platforms: ['web'], license: 'MIT', topics: ['notes'], kind: 'app' };
  let supplied;
  const load = createLoader({
    '@/lib/apps': { getApps: async () => [app] },
    './repository': { retrieveRepository: async () => { throw new Error('Recommendations must not fetch a user repository'); } },
    './provider': { providerConfiguration: () => ({ provider: 'compatible', model: 'model' }), planProjectSearch: async () => ({ disposition: 'search', queries: ['private notes'], question: '' }), generateReport: async (request, sources, candidates) => { supplied = { request, sources, candidates }; return { ...result.report, disposition: 'answered', recommendations: [{ repo: 'example/notes', reason: 'Local storage', tradeoff: 'Review setup', sourceIds: [candidates[0].sourceId] }] }; } },
    './project-search': { firstSearchCursor: queries => ({ queries, pages: [1], batch: 1 }), searchPublicProjects: async () => ({ apps: [{ ...app, dataSource: 'github', stats: { stars: 42 } }], queries: [], nextPages: [0], warnings: [], successful: 1 }) },
  });
  const answer = await load('src/lib/ai/service.ts').analyze({ workflow: 'recommend', repository: '', question: '', description: 'A private self-hosted notes app' });
  assert.equal(supplied.candidates[0].repo, 'example/notes');
  assert.ok(supplied.candidates[0].sourceId.startsWith('github-'));
  assert.equal(supplied.sources[0].kind, 'github-search'); assert.equal(answer.projects[0].name, 'Notes');
  assert.equal(answer.matches.length, 1); assert.equal(answer.search.aiCompared, true);
  assert.equal(answer.coverage.repository, null); assert.equal(answer.sources[0].text, undefined);
});
