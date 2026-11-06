import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, BookOpen, ChevronRight, GitFork, Github, Sparkles, Star } from 'lucide-react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProject } from '@/lib/projects';
import { getApps } from '@/lib/apps';
import { appKey, categoryName, PLATFORM_NAMES, recommendApps } from '@/lib/discovery';
import { AppIcon } from '@/components/apps/AppIcon';
import { AppCard, SaveButton } from '@/components/apps/AppCard';
import { ReleaseDownloads } from '@/components/apps/ReleaseDownloads';
import { formatNumber } from '@/lib/utils';

export const revalidate = 3600;
interface PageProps { params: { owner: string; repo: string } }
const validName = (name: string) => /^[a-zA-Z0-9_.-]+$/.test(name);
export async function generateMetadata({ params }: PageProps) {
  if (!validName(params.owner) || !validName(params.repo)) return { title: 'Repository unavailable' };
  const project = await getProject(params.owner, params.repo);
  return { title: project?.app.name ?? `${params.owner}/${params.repo}`, description: project?.app.shortDescription };
}
export default async function AppPage({ params }: PageProps) {
  const valid = validName(params.owner) && validName(params.repo);
  const project = valid ? await getProject(params.owner, params.repo) : null;
  const repoUrl = `https://github.com/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}`;
  if (!project) return <div className="standard-page"><div className="empty-state"><Github size={33} /><h1 className="text-2xl font-semibold">This repository could not be loaded.</h1><p>Check the owner and repository name, or open the source directly while GitHub is unavailable.</p>{valid && <a href={repoUrl} target="_blank" rel="noreferrer" className="btn-primary px-5 py-3">Open on GitHub<ArrowUpRight size={16} /></a>}<Link href="/apps" className="link">Back to the catalog</Link></div></div>;
  const { app, repo, readme, releases } = project;
  const latest = releases[0];
  const related = recommendApps(await getApps(), [app], [appKey(app)], 4);
  const markdownUrl = (url: string, key: string) => {
    if (url.startsWith('#')) return `${repoUrl}${url}`;
    const safe = defaultUrlTransform(url);
    if (!safe) return '';
    if (/^https?:\/\//i.test(safe) || /^mailto:/i.test(safe)) return safe;
    if (safe.startsWith('//')) return `https:${safe}`;
    const base = key === 'src' ? `https://raw.githubusercontent.com/${app.maintainer.username}/${app.slug}/${repo?.default_branch ?? 'HEAD'}/` : `${repoUrl}/blob/${repo?.default_branch ?? 'HEAD'}/`;
    try { return new URL(safe.replace(/^\//, ''), base).href; } catch { return ''; }
  };
  const homepage = app.homepage && /^https?:\/\//i.test(app.homepage) ? app.homepage : undefined;
  return <div className="standard-page"><nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/apps">All projects</Link><ChevronRight size={12} /><Link href={`/apps?category=${app.category}`}>{categoryName(app.category)}</Link><ChevronRight size={12} /><span>{app.name}</span></nav><section className="detail-header"><AppIcon app={app} size={82} /><div className="detail-header-copy"><h1>{app.name}</h1><p>{app.shortDescription}</p><div className="detail-metadata"><a href={repoUrl} target="_blank" rel="noreferrer">{app.maintainer.username}/{app.slug}</a>{app.dataSource === 'github' && <><span><Star size={14} />{formatNumber(app.stats.stars)} stars</span><span><GitFork size={14} />{formatNumber(app.stats.forks)} forks</span></>}<span>{app.kind ?? 'app'}</span></div></div><div className="detail-actions"><a className="btn-primary" href={homepage ?? latest?.html_url ?? repoUrl} target="_blank" rel="noreferrer">{homepage ? 'Visit website' : latest ? 'Get the latest release' : 'Open on GitHub'}<ArrowUpRight size={15} /></a><SaveButton app={app} compact={false} /><a className="btn-outline" href={repoUrl} target="_blank" rel="noreferrer"><Github size={15} />Source repository</a></div></section>{!repo && <p className="catalog-notice mt-5" role="status">Showing curated information while GitHub is unavailable. Open the source repository for current releases and documentation.</p>}<section className="detail-ai-panel"><div><Sparkles size={22} /><div><h2>Understand what is under the hood.</h2><p>Get a source-based explanation, follow a feature, or plan your own implementation.</p></div></div><nav aria-label="Repository AI workflows">{[{ id: 'explain', label: 'Explain with AI' }, { id: 'setup', label: 'Setup guide' }, { id: 'trace', label: 'Trace a feature' }, { id: 'rebuild', label: 'Rebuild blueprint' }].map(item => <Link key={item.id} href={`/assistant?repo=${encodeURIComponent(`${app.maintainer.username}/${app.slug}`)}&workflow=${item.id}`}>{item.label}<ArrowUpRight size={13} /></Link>)}</nav></section><div className="detail-columns"><section className="readme-panel"><h2 className="readme-heading"><BookOpen size={17} />About this project</h2>{readme ? <article className="prose prose-slate dark:prose-invert max-w-none prose-a:text-primary"><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrl} components={{ a: ({ href, children }) => <a href={href} target={href?.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{children}</a>, img: ({ src, alt }) => src ? <Image src={src} alt={alt ?? ''} width={900} height={500} unoptimized className="h-auto w-auto max-w-full" /> : null }}>{readme}</ReactMarkdown></article> : <div className="py-8"><h3 className="text-lg font-semibold mb-3">Explore {app.name}</h3><p className="text-muted-foreground text-sm leading-7">{app.shortDescription} Read the project documentation for installation steps, supported platforms, and usage guides.</p><a className="link inline-flex items-center gap-2 mt-5 text-sm" href={`${repoUrl}#readme`} target="_blank" rel="noreferrer">Read documentation on GitHub<ArrowUpRight size={14} /></a></div>}</section><aside className="detail-sidebar">{latest && <ReleaseDownloads assets={latest.assets} releaseUrl={latest.html_url} version={latest.tag_name} />}<section className="detail-panel"><h2>Project details</h2><dl><div><dt>Category</dt><dd>{categoryName(app.category)}</dd></div><div><dt>License</dt><dd><a className="link" href={`${repoUrl}#license`} target="_blank" rel="noreferrer">{app.license === 'Other' ? 'View project license' : app.license}</a></dd></div><div><dt>Platforms</dt><dd>{app.platforms.map(platform => PLATFORM_NAMES[platform]).join(', ') || 'See documentation'}</dd></div><div><dt>Last source update</dt><dd>{app.lastUpdated ? new Date(app.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not available'}</dd></div>{app.language && <div><dt>Language</dt><dd>{app.language}</dd></div>}{repo && <div><dt>Open issues</dt><dd>{app.stats.openIssues.toLocaleString()}</dd></div>}</dl><div className="detail-topics">{app.topics.slice(0, 9).map(topic => <Link key={topic} href={`/apps?q=${encodeURIComponent(topic)}`}>{topic}</Link>)}</div></section><section className="detail-panel"><h2>From the source</h2><p>Repository links and release assets come from the original project on GitHub. Check the project’s license for how you can use, modify, or redistribute it.</p><a className="link text-xs inline-flex items-center gap-2 mt-4" href={`${repoUrl}/releases`} target="_blank" rel="noreferrer">Browse all releases<ArrowUpRight size={13} /></a></section></aside></div>{related.length > 0 && <section className="related-section"><div className="section-heading"><div><h2>Keep exploring</h2><p>A few related projects you might find useful.</p></div></div><div className="app-grid">{related.map(item => <AppCard key={appKey(item)} app={item} />)}</div></section>}</div>;
}
