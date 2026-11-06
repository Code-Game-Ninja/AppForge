'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, ChevronDown, Code2, Copy, Download, FileSearch, Github, Layers, Loader2, RefreshCw, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AppCard } from '@/components/apps/AppCard';
import { appKey } from '@/lib/discovery';
import { validateRequest } from '@/lib/ai/security';
import type { AIResult, AIWorkflow } from '@/lib/ai/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GradientText from '@/components/react-bits/GradientText';

const workflows = [
  { id: 'explain', name: 'Explain a repository', description: 'Purpose, capabilities, and how it fits together.', icon: BookOpen },
  { id: 'setup', name: 'Get started', description: 'Prerequisites and documented setup steps.', icon: Code2 },
  { id: 'trace', name: 'Trace a feature', description: 'Follow a feature through inspected source files.', icon: FileSearch },
  { id: 'rebuild', name: 'Plan a rebuild', description: 'An original implementation blueprint and tests.', icon: Layers },
  { id: 'recommend', name: 'Find projects', description: 'Search public GitHub projects for tools that fit.', icon: Search },
] as const;
const certaintyLabels = { documented: 'From the source', inferred: 'Inferred / proposed', unknown: 'Not established' };

function exportMarkdown(result: AIResult) {
  const { report, coverage } = result;
  const sources = result.sources.filter(source => !['catalog', 'github-search'].includes(source.kind) || report.recommendations.some(item => item.sourceIds.includes(source.id)));
  return `# ${report.title}\n\n${report.summary}\n\n${report.sections.map(section => `## ${section.heading}\n\n${section.items.map(item => `- [${certaintyLabels[item.certainty]}] ${item.text}${item.sourceIds.length ? ` (Sources: ${item.sourceIds.join(', ')})` : ''}`).join('\n\n')}`).join('\n\n')}\n\n${report.recommendations.length ? `## Suggested projects\n\n${report.recommendations.map(item => `- https://github.com/${item.repo}\n  Fit: ${item.reason}\n  Tradeoff: ${item.tradeoff}`).join('\n\n')}` : ''}${result.search ? `\n\n## GitHub search matches\n\n${(result.matches ?? []).map(app => `- ${app.name}: https://github.com/${app.maintainer.username}/${app.slug}`).join('\n')}\n\nSearches: ${result.search.queries.map(query => query.query).join(', ')}\n\n${result.search.warnings.map(warning => `- ${warning}`).join('\n')}` : ''}\n\n## Scope\n\nRepository: ${coverage.repository ?? (result.search ? 'Public GitHub discovery' : 'Catalog suggestions')}\nCommit: ${coverage.commit ?? 'Not pinned'}\nFiles inspected: ${coverage.filesInspected}\n\n${coverage.notes.map(note => `- ${note}`).join('\n')}\n\n## Sources\n\n${sources.map(source => `- ${source.id}: ${source.label} — ${source.url}`).join('\n')}\n\nThis is an AI-generated research brief. Review its cited evidence before using it as an implementation specification. It is not a generated executable project.\n`;
}

export function AIWorkspace({ initialRepository = '', initialWorkflow = 'explain', autoAnalyze = false, compact = false }: { initialRepository?: string; initialWorkflow?: AIWorkflow; autoAnalyze?: boolean; compact?: boolean }) {
  const [workflow, setWorkflow] = useState<AIWorkflow>(compact ? 'recommend' : initialWorkflow);
  const [repository, setRepository] = useState(initialRepository);
  const [description, setDescription] = useState('');
  const [rebuildScope, setRebuildScope] = useState('');
  const [question, setQuestion] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [provider, setProvider] = useState('the configured AI provider');
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AIResult | null>(null);
  const [searchDescription, setSearchDescription] = useState('');
  const [visibleMatches, setVisibleMatches] = useState(24);
  const [actionMessage, setActionMessage] = useState('');
  const autoStarted = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai', { signal: controller.signal, cache: 'no-store' }).then(response => response.json()).then(data => {
      if (!controller.signal.aborted) { setAvailable(data.available === true); if (typeof data.provider === 'string') setProvider(data.provider); }
    }).catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, [statusRefresh]);
  useEffect(() => () => requestController.current?.abort(), []);

  const run = useCallback(async (cursor = '') => {
    if (busy) return;
    setError(''); setActionMessage('');
    let input;
    try { input = validateRequest({ workflow, repository, description: workflow === 'recommend' ? description : workflow === 'rebuild' ? rebuildScope : '', question: workflow === 'recommend' ? '' : question, ...(cursor ? { cursor } : {}) }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Check your request and try again.'); return; }
    const controller = new AbortController();
    requestController.current = controller;
    setBusy(true); if (!cursor) { setResult(null); setVisibleMatches(24); }
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(160_000)]) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The assistant could not complete this request.');
      if (!data.report || !Array.isArray(data.sources) || !Array.isArray(data.projects)) throw new Error('The assistant returned an unreadable answer. Try again.');
      if (!controller.signal.aborted) {
        setSearchDescription(input.description);
        setResult(previous => {
          const next = data as AIResult;
          if (!cursor || !previous?.search || !next.search || next.report.disposition === 'refused') return next;
          const matches = new Map((previous.matches ?? []).map(app => [appKey(app), app]));
          (next.matches ?? []).forEach(app => matches.set(appKey(app), app));
          const sources = new Map(previous.sources.map(source => [source.id, source]));
          next.sources.forEach(source => sources.set(source.id, source));
          return { ...next, matches: Array.from(matches.values()), sources: Array.from(sources.values()), search: { ...next.search, queries: next.search.queries.map(query => ({ ...query, totalCount: query.totalCount ?? previous.search?.queries.find(prior => prior.query === query.query)?.totalCount ?? null })) } };
        });
      }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error && caught.name !== 'TimeoutError' ? caught.message : 'The answer took too long. Try a smaller question.');
    } finally { if (requestController.current === controller) { setBusy(false); requestController.current = null; } }
  }, [busy, workflow, repository, description, rebuildScope, question]);
  useEffect(() => {
    if (autoAnalyze && available && initialRepository && !autoStarted.current) { autoStarted.current = true; void run(); }
  }, [autoAnalyze, available, initialRepository, run]);
  useEffect(() => { if (result) resultHeading.current?.focus({ preventScroll: true }); }, [result]);

  const copyReport = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(exportMarkdown(result)); setActionMessage('Research brief copied. Review the sources before using it.'); }
    catch { setActionMessage('Clipboard access is unavailable. Use Download brief instead.'); }
  };
  const downloadReport = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([exportMarkdown(result)], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = workflow === 'rebuild' ? 'appforge-rebuild-blueprint.md' : 'appforge-research-brief.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setActionMessage('Research brief downloaded.');
  };
  const cancel = () => { requestController.current?.abort(); setBusy(false); setError('Request canceled. You can change the question and try again.'); };
  const activeWorkflow = workflows.find(item => item.id === workflow)!;
  const usedSourceIds = new Set(result?.report.sections.flatMap(section => section.items.flatMap(item => item.sourceIds)).concat(result.report.recommendations.flatMap(item => item.sourceIds)) ?? []);
  const shownSources = result?.sources.filter(source => !['catalog', 'github-search'].includes(source.kind) || usedSourceIds.has(source.id)) ?? [];

  return <div className={compact ? 'ai-workspace ai-workspace-compact' : 'standard-page ai-workspace'}>
    {!compact && <div className="page-heading"><div><h1><GradientText colors={["rgb(var(--foreground))", "rgb(var(--primary))", "rgb(var(--foreground))"]} animationSpeed={16}>A little context. A clearer next step.</GradientText></h1><p>Understand a repository, trace how a feature works, or find the right tools for your idea.</p></div><span className="ai-page-mark"><BrainCircuit size={23} /></span></div>}
    {!compact && <div className="ai-workflow-grid" aria-label="Choose an assistant workflow">{workflows.map(item => <Button variant="ghost" key={item.id} className={workflow === item.id ? 'selected' : ''} aria-pressed={workflow === item.id} onClick={() => { setWorkflow(item.id); setResult(null); setError(''); setActionMessage(''); }} disabled={busy}><item.icon size={21} /><strong>{item.name}</strong><span>{item.description}</span></Button>)}</div>}
    <section className="ai-request-panel" aria-labelledby={compact ? 'idea-heading' : 'ai-request-heading'}>
      <div className="ai-request-intro"><span className="ai-request-icon"><Sparkles size={22} /></span><div><h2 id={compact ? 'idea-heading' : 'ai-request-heading'}>{compact ? 'Describe your idea. Find your starting stack.' : activeWorkflow.name}</h2><p>{compact ? 'Tell us what you want to make, your platform, and what matters to you.' : activeWorkflow.description}</p></div><span className="ai-availability"><span className={`status-dot ${available ? '' : 'status-working'}`} />{available === null ? 'Connecting...' : available ? 'AI configured' : workflow === 'recommend' ? 'GitHub search ready' : 'AI unavailable'}</span></div>
      <form onSubmit={event => { event.preventDefault(); void run(); }}>
        {workflow !== 'recommend' && <label className="ai-field"><span>Public GitHub repository</span><div className="ai-repository-input"><Github size={18} /><Input aria-label="Public GitHub repository" placeholder="https://github.com/owner/repository" value={repository} onChange={event => setRepository(event.target.value)} maxLength={300} required disabled={busy} autoComplete="off" /></div></label>}
        {workflow === 'recommend' && <label className="ai-field"><span>What do you want to make or find?</span><Textarea aria-label="Describe your idea" placeholder="I want to build a private photo library for my family, host it on my own server, and back up from Android and iOS..." value={description} onChange={event => setDescription(event.target.value)} minLength={2} maxLength={3000} rows={4} required disabled={busy} /></label>}
        {workflow === 'rebuild' && <label className="ai-field"><span>What would you like to rebuild? <small>Optional</small></span><Textarea aria-label="Rebuild scope" placeholder="Focus on the note editor and local storage. Suggest an original implementation with a clear test plan." value={rebuildScope} onChange={event => setRebuildScope(event.target.value)} maxLength={3000} rows={3} disabled={busy} /></label>}
        {workflow !== 'recommend' && <label className="ai-field"><span>{workflow === 'trace' ? 'Which feature should we trace?' : 'A question to focus the answer'}{workflow !== 'trace' && <small>Optional</small>}</span><Textarea aria-label={workflow === 'trace' ? 'Feature to trace' : 'Question about this repository'} placeholder={workflow === 'trace' ? 'What happens when a user exports their notes to a CSV file?' : 'Can I run this locally? What are the main components and limitations?'} value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} rows={2} required={workflow === 'trace'} disabled={busy} /></label>}
        <div className="ai-example-prompts">{workflow === 'recommend' ? ['AI tools', 'Local AI image generation tools', 'A private, self-hosted notes app'].map(example => <Button variant="ghost" type="button" key={example} disabled={busy} onClick={() => setDescription(example)}>{example}</Button>) : <><Button variant="ghost" type="button" disabled={busy} onClick={() => setRepository('JoasASantos/REA-Prompts')}>Try REA Investigation Prompts</Button><Button variant="ghost" type="button" disabled={busy} onClick={() => setRepository('AIshihzong/awesome-reverse-engineer-anything')}>Try the REA project directory</Button></>}</div>
        <div className="ai-form-footer"><p><ShieldCheck size={14} />{workflow === 'recommend' ? 'Your description and public repository metadata' : 'Your question and selected public source excerpts'} are sent to {provider}. Repository code is never executed.</p><div>{busy ? <Button variant="ghost" type="button" className="btn-outline px-4 py-2.5" onClick={cancel}><X size={15} />Cancel</Button> : null}<Button variant="default" className="btn-primary px-5 py-2.5" type="submit" disabled={busy || (workflow !== 'recommend' && available !== true)}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? 'Reading and thinking...' : workflow === 'recommend' ? 'Find my projects' : workflow === 'rebuild' ? 'Create a blueprint' : workflow === 'trace' ? 'Trace this feature' : 'Ask the assistant'}</Button></div></div>
      </form>
      {available === false && <div className="ai-unavailable" role="status"><span>The assistant is unavailable right now. You can still explore projects and their documentation.</span><Button variant="ghost" onClick={() => { setAvailable(null); setStatusRefresh(current => current + 1); }}><RefreshCw size={14} />Check availability</Button></div>}
      {error && <p className="ai-error" role="alert">{error}</p>}
    </section>
    {busy && <div className="ai-working" role="status"><Loader2 size={22} className="animate-spin" /><div><h3>{workflow === 'recommend' ? 'Searching GitHub for your idea' : 'Reading the repository and gathering evidence'}</h3><p>{workflow === 'recommend' ? 'Finding public repositories and comparing their roles, platforms, and tradeoffs.' : 'Inspecting public documentation and a bounded set of source files.'}</p></div></div>}
    {result && <section className="ai-answer" aria-labelledby="ai-answer-heading"><div className="ai-answer-header"><div><span className="ai-answer-label"><BrainCircuit size={15} />{result.report.disposition === 'answered' ? 'Your research brief' : 'A clearer question will help'}</span><h2 id="ai-answer-heading" ref={resultHeading} tabIndex={-1}>{result.report.title}</h2></div>{result.report.disposition === 'answered' && <div className="ai-answer-actions"><Button variant="neo" className="btn-outline px-3 py-2" onClick={() => void copyReport()}><Copy size={14} />Copy brief</Button><Button variant="neo" className="btn-outline px-3 py-2" onClick={downloadReport}><Download size={14} />Download brief</Button></div>}</div><p className="ai-summary">{result.report.summary}</p>
      {result.coverage.repository && <div className="ai-coverage"><FileSearch size={15} /><span>{result.coverage.filesInspected} {result.coverage.filesInspected === 1 ? 'file' : 'files'} inspected</span>{result.coverage.commit ? <a href={`https://github.com/${result.coverage.repository}/tree/${result.coverage.commit}`} target="_blank" rel="noreferrer">Snapshot {result.coverage.commit.slice(0, 7)}<ArrowUpRight size={12} /></a> : <span>Revision not pinned</span>}<span>Source review; software was not run</span></div>}
      {result.search && <div className="ai-search-scope"><div><Github size={17} /><strong>Public GitHub discovery</strong><span>{result.search.aiCompared ? 'AI compared this batch' : 'Browse repository matches'}</span></div><details><summary>Searches and coverage<ChevronDown size={14} /></summary><ul>{result.search.queries.map(query => <li key={query.query}><a href={query.url} target="_blank" rel="noreferrer">{query.query}<ArrowUpRight size={12} /></a><span>{query.totalCount === null ? 'Count unavailable' : `${query.totalCount.toLocaleString()} GitHub matches`}{query.incomplete ? ' / partial search' : ''}</span></li>)}</ul><p>Search counts can overlap. GitHub provides up to 1,000 results per query; refine your description to explore more specific tools.</p></details>{result.search.warnings.map(warning => <p key={warning} className="ai-search-warning" role="status">{warning}</p>)}</div>}
      <div className="ai-report-sections">{result.report.sections.map(section => <article className="ai-report-section" key={section.id}><h3>{section.heading}</h3><ul>{section.items.map((item, index) => <li key={index}><span className={`ai-certainty ai-certainty-${item.certainty}`}>{certaintyLabels[item.certainty]}</span><p>{item.text}</p>{item.sourceIds.length > 0 && <div className="ai-citations">{item.sourceIds.map(id => { const source = result.sources.find(source => source.id === id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer"><FileSearch size={11} />{source.path ?? (source.kind === 'catalog' ? source.label.replace(' — curated project information', '') : source.kind === 'github-search' ? source.label.replace(' — GitHub search metadata', '') : 'Repository metadata')}<ArrowUpRight size={10} /></a> : null; })}</div>}</li>)}</ul></article>)}</div>
      {result.report.recommendations.length > 0 && <div className="ai-project-matches"><h3>{result.search ? 'AI picks from this batch' : 'Projects that fit'}</h3><div className="app-grid">{result.report.recommendations.map(item => { const app = result.projects.find(app => appKey(app) === item.repo); return app ? <div className="ai-project-match" key={item.repo}><AppCard app={app} /><div className="ai-project-fit"><p><strong>Why it fits</strong>{item.reason}</p><p><strong>Consider</strong>{item.tradeoff}</p></div></div> : null; })}</div></div>}
      {result.search && result.report.disposition !== 'refused' && <div className="ai-search-results"><div className="ai-search-results-heading"><div><h3>Explore the repository matches</h3><p>{(result.matches ?? []).length} unique {(result.matches ?? []).length === 1 ? 'repository' : 'repositories'} loaded. Open a project for its documentation or a deeper AI analysis.</p></div><span>Batch {result.search.batch}</span></div>{result.matches?.length ? <div className="app-grid">{result.matches.slice(0, visibleMatches).map(app => <AppCard key={appKey(app)} app={app} />)}</div> : <p className="ai-search-empty">{result.search.nextCursor ? 'No repositories were added in this batch. Try the next batch or refine the description.' : 'Try a more specific topic or another description to find useful repositories.'}</p>}<div className="ai-match-pagination"><span>Showing {Math.min(visibleMatches, result.matches?.length ?? 0)} of {result.matches?.length ?? 0} loaded matches</span><div>{(result.matches?.length ?? 0) > visibleMatches && <Button variant="neo" className="btn-outline px-4 py-2" onClick={() => setVisibleMatches(current => current + 24)}>Show more loaded matches<ArrowRight size={14} /></Button>}{result.search.nextCursor && <Button variant="default" className="btn-primary px-4 py-2" disabled={busy || description.trim() !== searchDescription} onClick={() => void run(result.search!.nextCursor!)}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}Load more from GitHub</Button>}</div></div>{description.trim() !== searchDescription && <p className="ai-search-changed">Your description changed. Start a new search to find matches for it.</p>}</div>}
      <details className="ai-evidence-panel"><summary><FileSearch size={16} />Sources and scope<ChevronDown size={15} /></summary><div>{result.coverage.notes.map(note => <p key={note}>{note}</p>)}<ul>{shownSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.label}{source.startLine && <span>Lines {source.startLine}–{source.endLine}</span>}<ArrowUpRight size={13} /></a></li>)}</ul></div></details>
      {result.report.nextQuestion && <div className="ai-next-question"><Sparkles size={17} /><p>{result.report.nextQuestion}</p><Button variant="ghost" onClick={() => { if (workflow === 'recommend') setDescription(`${description}\n${result.report.nextQuestion}`.slice(0, 3000)); else setQuestion(result.report.nextQuestion); document.querySelector<HTMLTextAreaElement>(workflow === 'recommend' ? 'textarea[aria-label="Describe your idea"]' : workflow === 'trace' ? 'textarea[aria-label="Feature to trace"]' : 'textarea[aria-label="Question about this repository"]')?.focus(); }}>Use this question<ArrowRight size={14} /></Button></div>}
      {actionMessage && <p className="ai-action-message" role="status"><Check size={14} />{actionMessage}</p>}
    </section>}
    {!compact && <div className="ai-workflow-credit"><div><ShieldCheck size={17} /><p>Answers distinguish source statements, proposed designs, and missing evidence. A rebuild blueprint is a plan to review and implement.</p></div><details><summary>About the investigation workflows</summary><p>Inspired by the evidence-focused approach in <a href="https://github.com/JoasASantos/REA-Prompts" target="_blank" rel="noreferrer">REA Investigation Prompts</a> and the tools and research collected in <a href="https://github.com/AIshihzong/awesome-reverse-engineer-anything" target="_blank" rel="noreferrer">Awesome Reverse Engineer Anything</a>. This assistant reviews public source files; binary debugging and executable generation are separate capabilities.</p></details><Link href="/apps">Explore the catalog<ArrowUpRight size={13} /></Link></div>}
  </div>;
}
