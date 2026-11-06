const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the real pure TypeScript modules using the project's existing compiler.
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}
const data = load('src/lib/data.ts');
const discovery = load('src/lib/discovery.ts');
const apps = data.CURATED_APPS.map(data.sourceToApp);
const find = name => apps.find(app => app.name === name);

test('catalog covers every category and has unique canonical source repositories', () => {
  assert.ok(apps.length >= 130);
  assert.equal(new Set(apps.map(discovery.appKey)).size, apps.length);
  for (const category of discovery.CATEGORIES) assert.ok(apps.some(app => app.category === category.id), category.id);
  for (const app of apps) { assert.equal(app.stats.stars, 0); assert.equal(app.lastUpdated, ''); assert.equal(app.dataSource, 'catalog'); }
});
test('all collection and starter stack projects exist in the catalog', () => {
  const keys = new Set(apps.map(discovery.appKey));
  for (const collection of discovery.COLLECTIONS) for (const repo of collection.repos) assert.ok(keys.has(repo.toLowerCase()), repo);
  for (const stack of discovery.BUILD_STACKS) for (const step of stack.steps) assert.ok(keys.has(step.repo.toLowerCase()), step.repo);
});
test('search ranks exact names above incidental description matches', () => {
  const fake = { ...find('VLC'), name: 'A different app', shortDescription: 'Works with Ollama models' };
  const result = discovery.searchCatalog([fake, find('Ollama')], 'ollama');
  assert.equal(result[0].name, 'Ollama');
});
test('multi-term search, punctuation, categories, and repository names work', () => {
  assert.equal(discovery.searchCatalog(apps, 'Next.js')[0].name, 'Next.js');
  assert.ok(discovery.searchCatalog(apps, 'password manager').some(app => app.name === 'KeePassXC'));
  assert.ok(discovery.searchCatalog(apps, 'ai local').some(app => app.name === 'Ollama'));
  assert.equal(discovery.searchCatalog(apps, 'microsoft/vscode')[0].name, 'Visual Studio Code');
  assert.ok(discovery.searchCatalog(apps, 'finance').length >= 5);
  assert.equal(discovery.searchCatalog(apps, 'zzzz-no-match').length, 0);
  assert.equal(discovery.searchCatalog(apps, '   ').length, apps.length);
});
test('recommendations use several seeds, explain relevance, and exclude existing results', () => {
  const seeds = [find('Ollama'), find('ComfyUI')];
  const excluded = [discovery.appKey(find('Open WebUI'))];
  const recs = discovery.recommendApps(apps, seeds, excluded, 8);
  assert.ok(recs.length > 0);
  for (const app of recs) {
    assert.ok(!seeds.some(seed => discovery.appKey(seed) === discovery.appKey(app)));
    assert.ok(!excluded.includes(discovery.appKey(app)));
    assert.ok(app.recommendationReason);
  }
  assert.ok(recs.some(app => app.name === 'llama.cpp'));
});
test('high star counts do not cause irrelevant recommendations', () => {
  const irrelevant = { ...find('OpenTTD'), stats: { stars: 9999999 } };
  const recs = discovery.recommendApps([irrelevant, find('Open WebUI')], [find('Ollama')]);
  assert.deepEqual(recs.map(app => app.name), ['Open WebUI']);
});
test('GitHub refresh preserves editorial identity and uses current metadata without duplicates', () => {
  const local = find('Visual Studio Code');
  const live = { ...local, id: 'api-id', slug: 'VSCode', name: 'vscode', category: 'utilities', platforms: [], topics: ['new-topic'], dataSource: 'github', stats: { stars: 123, forks: 20, watchers: 10, openIssues: 4 }, lastUpdated: '2026-11-01T12:00:00Z' };
  const merged = discovery.mergeApps([local], [live]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, 'Visual Studio Code');
  assert.equal(merged[0].category, 'developer-tools');
  assert.equal(merged[0].stats.stars, 123);
  assert.equal(merged[0].dataSource, 'github');
  assert.ok(merged[0].platforms.includes('windows'));
  assert.ok(merged[0].topics.includes('new-topic'));
  const fallback = discovery.mergeApps(merged, [local]);
  assert.equal(fallback[0].stats.stars, 123, 'offline data never erases known GitHub statistics');
  assert.equal(fallback[0].dataSource, 'github');
});
