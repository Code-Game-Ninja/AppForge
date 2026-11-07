import 'server-only';
import { createHash } from 'node:crypto';
import { getApps } from '@/lib/apps';
import { appKey, searchCatalog } from '@/lib/discovery';
import type { App } from '@/types';
import { AIError } from './contracts';
import type { AIReport, AIRequest, AIResult, EvidenceSource, ProjectSearchPlan } from './contracts';
import { generateReport, planProjectSearch } from './provider';
import { decodeSearchCursor, encodeSearchCursor, firstSearchCursor, searchPublicProjects } from './project-search';
import { fallbackSearchPlan } from './search-policy';
import { sanitizeEvidence } from './security';

function plainReport(title: string, summary: string, question = ''): AIReport {
  return { disposition: 'answered', title, summary, sections: [{ id: 'overview', heading: 'Search scope', items: [{ text: 'Browse the repository matches and review each project’s documentation for capabilities, setup, and platform requirements.', certainty: 'inferred', sourceIds: [] }] }], recommendations: [], nextQuestion: question };
}
function stopReport(plan: ProjectSearchPlan): AIResult {
  return { report: { disposition: plan.disposition === 'refused' ? 'refused' : 'needs_clarification', title: plan.disposition === 'refused' ? 'Try a different project search' : 'What would you like to find?', summary: plan.question, sections: [], recommendations: [], nextQuestion: plan.disposition === 'refused' ? '' : plan.question }, sources: [], projects: [], matches: [], coverage: { repository: null, commit: null, filesInspected: 0, notes: ['No repository search was performed.'] } };
}
function connectionWarning(error: unknown): string[] {
  return error instanceof AIError && ['ai_client_rejected', 'ai_client_unavailable', 'ai_authentication_failed'].includes(error.code) ? [error.message] : [];
}
function prioritize(apps: App[], description: string): App[] {
  const terms = Array.from(new Set(description.toLowerCase().match(/[a-z0-9+#.-]{2,}/g) ?? [])).filter(term => !['want', 'need', 'find', 'tools', 'with', 'this', 'that', 'from', 'for', 'the', 'and', 'app', 'github'].includes(term));
  const score = (app: App) => {
    const topics = app.topics.join(' ').toLowerCase();
    const text = `${app.name} ${app.shortDescription}`.toLowerCase();
    return terms.reduce((sum, term) => sum + (topics.includes(term) ? 3 : 0) + (text.includes(term) ? 1 : 0), 0);
  };
  // Stable sorting retains GitHub's best-match order when relevance scores tie.
  return [...apps].sort((a, b) => score(b) - score(a));
}

export async function recommendProjects(request: AIRequest): Promise<AIResult> {
  const comparisonLimit = Number(process.env.AI_SEARCH_COMPARISON_LIMIT || 60);
  if (!Number.isInteger(comparisonLimit) || comparisonLimit < 1 || comparisonLimit > 60) throw new AIError('provider_unavailable', 'The assistant needs a valid project comparison limit.', 503);
  const warnings: string[] = [];
  let aiReady = true;
  let cursor;
  if (request.cursor) cursor = decodeSearchCursor(request.cursor, request.description);
  else {
    let plan: ProjectSearchPlan;
    try { plan = await planProjectSearch(request.description); }
    catch (error) { aiReady = false; warnings.push(...connectionWarning(error), 'AI search planning is unavailable. Searching GitHub using topic keywords; these matches have not been compared by AI.'); plan = fallbackSearchPlan(request.description); }
    if (plan.disposition !== 'search') return stopReport(plan);
    cursor = firstSearchCursor(plan.queries, request.description);
  }
  const found = await searchPublicProjects(cursor);
  warnings.push(...found.warnings);
  let apps = prioritize(found.apps, request.description);
  let usingCatalog = false;
  if (!found.successful && cursor.batch === 1) {
    usingCatalog = true;
    apps = searchCatalog(await getApps(), request.description).slice(0, 25);
    warnings.push('GitHub search is unavailable. Showing relevant curated projects until the live search can be retried.');
  }
  const secrets = [process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '', process.env.GITHUB_TOKEN || ''];
  const sources: EvidenceSource[] = apps.map(app => ({
    id: `${usingCatalog ? 'catalog' : 'github'}-${createHash('sha256').update(appKey(app)).digest('hex').slice(0, 16)}`,
    kind: usingCatalog ? 'catalog' : 'github-search', label: `${app.name} — ${usingCatalog ? 'curated project information' : 'GitHub search metadata'}`,
    url: `https://github.com/${app.maintainer.username}/${app.slug}`,
    text: sanitizeEvidence(JSON.stringify({ repo: appKey(app), name: app.name, description: app.shortDescription, topics: app.topics, categoryInferredFromTopics: app.category, platformsInferredFromTopics: app.platforms, license: app.license, language: app.language, stars: app.dataSource === 'github' ? app.stats.stars : null, lastSourcePush: app.lastUpdated || null, source: usingCatalog ? 'curated' : 'GitHub repository search metadata', readmeInspected: false }), secrets).text,
  }));
  const candidates = apps.slice(0, comparisonLimit).map((app, index) => ({ repo: appKey(app), sourceId: sources[index].id }));
  let report = plainReport(apps.length ? 'Repository matches for your idea' : 'No new repository matches', apps.length ? 'Browse the matches below. AI comparison is unavailable for this search.' : found.successful ? 'This search batch returned no new repositories. Try a different description or explore another batch.' : 'GitHub could not return this search batch. Retry the search when GitHub is available.');
  let aiCompared = false;
  if (apps.length && aiReady) {
    try { report = await generateReport(request, sources.slice(0, comparisonLimit), candidates); aiCompared = true; }
    catch (error) { warnings.push(...connectionWarning(error), 'AI comparison is unavailable. The GitHub matches are still available to browse, save, and analyze individually.'); }
  }
  if (usingCatalog && !aiCompared) report = plainReport('Curated projects while GitHub is unavailable', 'These are catalog matches. Retry GitHub search to discover repositories beyond the curated collection.');
  const used = new Set(report.recommendations.map(item => item.repo));
  const nextCursor = found.nextPages.some(page => page > 0) && cursor.batch < 80 ? encodeSearchCursor({ ...cursor, pages: found.nextPages, batch: cursor.batch + 1 }) : null;
  const notes = [
    usingCatalog ? 'This batch uses a curated fallback because GitHub search failed.' : 'Search spans public GitHub repository names, descriptions, and README indexes. Matches come from GitHub’s repository search API.',
    `AI comparisons use a maximum of ${comparisonLimit} candidate metadata records per batch. All fetched matches remain browsable. README contents and repository code were not inspected for these suggestions.`,
    'Results are deduplicated across the complementary queries in this batch. Counts reported by individual searches can overlap and are not a count of unique repositories.',
    'GitHub limits repository search to the first 1,000 results per query. No complete inventory of GitHub or guarantee of finding every relevant project is claimed.',
  ];
  return {
    report, sources: sources.map(source => ({ id: source.id, kind: source.kind, label: source.label, url: source.url })), projects: apps.filter(app => used.has(appKey(app))), matches: report.disposition === 'refused' ? [] : apps,
    search: { queries: found.queries, nextCursor: report.disposition === 'refused' ? null : nextCursor, batch: cursor.batch, fetched: found.apps.length, aiCompared, warnings: Array.from(new Set(warnings)) },
    coverage: { repository: null, commit: null, filesInspected: 0, notes },
  };
}
