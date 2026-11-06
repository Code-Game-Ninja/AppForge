'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, BrainCircuit, Code2, Compass, Grid2X2, List, Loader2, Palette, RefreshCw, Search, Server, ShieldCheck, SlidersHorizontal, Sparkles, Terminal, X } from 'lucide-react';
import type { App } from '@/types';
import { appKey, CATEGORIES, categoryName, COLLECTIONS, mergeApps, PLATFORM_NAMES, recommendApps, searchCatalog } from '@/lib/discovery';
import { AppCard } from './AppCard';
import { AppIcon } from './AppIcon';
import { useLibrary } from './LibraryProvider';
import GradientText from '@/components/react-bits/GradientText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CatalogSelect } from '@/components/ui/catalog-select';

const collectionIcons = { code: Code2, brain: BrainCircuit, server: Server, palette: Palette, shield: ShieldCheck, terminal: Terminal };
const spotlight = ['microsoft/vscode', 'ollama/ollama', 'supabase/supabase', 'obsproject/obs-studio', 'laurent22/joplin', 'vercel/next.js', 'immich-app/immich', 'localsend/localsend'];
export function CollectionCards({ limit }: { limit?: number }) {
  return <div className="collection-grid">{COLLECTIONS.slice(0, limit).map(collection => { const Icon = collectionIcons[collection.icon]; return <Link key={collection.id} href={`/collections/${collection.id}`} className={`collection-card collection-${collection.color}`}><div className="collection-card-top"><Icon size={26} strokeWidth={1.7} /><ArrowUpRight size={19} /></div><h3>{collection.name}</h3><p>{collection.description}</p><span>{collection.repos.length} projects to explore</span></Link>; })}</div>;
}

export function Discovery({ initialApps, initialQuery = '', initialCategory = '', mode = 'discover', collectionId = '' }: { initialApps: App[]; initialQuery?: string; initialCategory?: string; mode?: 'discover' | 'all' | 'popular' | 'featured' | 'saved' | 'collection'; collectionId?: string }) {
  const [catalog, setCatalog] = useState(initialApps);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [platform, setPlatform] = useState('');
  const [kind, setKind] = useState('');
  const [license, setLicense] = useState('');
  const [sort, setSort] = useState(mode === 'popular' ? 'stars' : 'recommended');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [limit, setLimit] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Curated and ready to explore');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const { saved, ready, storageError } = useLibrary();
  const [recommendationSeeds, setRecommendationSeeds] = useState<App[]>([]);
  const seededMode = useRef<string>();
  useEffect(() => {
    if (ready && seededMode.current !== mode) {
      seededMode.current = mode;
      setRecommendationSeeds(saved);
    }
  }, [ready, saved, mode]);
  const collection = COLLECTIONS.find(item => item.id === collectionId);
  useEffect(() => { setQuery(initialQuery); setCategory(initialCategory); }, [initialQuery, initialCategory]);
  useEffect(() => { setLimit(12); }, [query, category, platform, kind, license, sort, mode]);
  useEffect(() => {
    try { const stored = localStorage.getItem('appforge-view-mode'); if (stored === 'grid' || stored === 'list') setView(stored); } catch { /* Defaults to grid. */ }
  }, []);
  useEffect(() => {
    if (mode === 'saved') return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError('');
      try {
        const response = await fetch(`/api/discover${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`, { signal: controller.signal });
        if (!response.ok) throw new Error('GitHub refresh is unavailable. You can still explore the curated catalog.');
        const data: { apps: App[]; error: string | null; source: string } = await response.json();
        if (!Array.isArray(data.apps)) throw new Error('GitHub returned an unexpected response. Try refreshing again.');
        if (controller.signal.aborted) return;
        setCatalog(current => mergeApps(current, data.apps));
        setError(data.error ?? '');
        setStatus(data.source === 'github' ? 'Updated with GitHub metadata' : 'Curated catalog available');
      } catch (caught) {
        if (!controller.signal.aborted) { setError(caught instanceof Error ? caught.message : 'Could not refresh GitHub. Try again.'); setStatus('Curated catalog available'); }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, query ? 450 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, refresh, mode]);

  const filtered = useMemo(() => {
    let apps = mode === 'saved' ? mergeApps(saved, catalog.filter(app => saved.some(item => appKey(item) === appKey(app)))) : catalog;
    if (mode === 'featured') apps = apps.filter(app => app.isFeatured);
    if (collection) apps = apps.filter(app => collection.repos.includes(appKey(app)));
    if (category) apps = apps.filter(app => app.category === category);
    if (platform) apps = apps.filter(app => app.platforms.includes(platform as App['platforms'][number]));
    if (kind) apps = apps.filter(app => app.kind === kind);
    if (license) apps = apps.filter(app => app.license === license);
    apps = searchCatalog(apps, query);
    if (sort === 'name') return [...apps].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'stars') return [...apps].sort((a, b) => b.stats.stars - a.stats.stars || Number(!!b.isFeatured) - Number(!!a.isFeatured));
    if (sort === 'updated') return [...apps].sort((a, b) => (Date.parse(b.lastUpdated) || 0) - (Date.parse(a.lastUpdated) || 0));
    if (query.trim()) return apps;
    if (collection) return [...apps].sort((a, b) => collection.repos.indexOf(appKey(a)) - collection.repos.indexOf(appKey(b)));
    const recommendations = recommendationSeeds.length ? recommendApps(apps, recommendationSeeds, [], apps.length) : [];
    const rank = new Map(recommendations.map((app, index) => [appKey(app), index]));
    return [...apps].sort((a, b) => {
      if (recommendationSeeds.length) return (rank.get(appKey(a)) ?? 10000) - (rank.get(appKey(b)) ?? 10000);
      const ai = spotlight.indexOf(appKey(a)); const bi = spotlight.indexOf(appKey(b));
      return (ai === -1 ? 100 : ai) - (bi === -1 ? 100 : bi) || Number(!!b.isFeatured) - Number(!!a.isFeatured) || b.stats.stars - a.stats.stars;
    });
  }, [catalog, saved, recommendationSeeds, mode, collection, category, platform, kind, license, query, sort]);
  const related = useMemo(() => query.trim() && filtered.length ? recommendApps(catalog, filtered.slice(0, 5), filtered.map(appKey), 4) : [], [query, filtered, catalog]);
  const changeView = (next: 'grid' | 'list') => { setView(next); try { localStorage.setItem('appforge-view-mode', next); } catch { /* View still works for this visit. */ } };
  const reset = () => { setQuery(''); setCategory(''); setPlatform(''); setKind(''); setLicense(''); setSort(mode === 'popular' ? 'stars' : 'recommended'); };
  const hasFilters = !!(query || category || platform || kind || license);
  const heading = collection?.name ?? (mode === 'popular' ? 'Popular on GitHub' : mode === 'featured' ? 'Worth a closer look.' : mode === 'saved' ? 'Your own little collection.' : mode === 'all' ? 'A world of open possibilities.' : 'Discover something great.');
  const subtitle = collection?.description ?? (mode === 'saved' ? 'Your favorite apps and tools, saved in this browser.' : mode === 'popular' ? 'Explore repositories by GitHub stars, then find the ones that fit you.' : 'Useful apps. Thoughtful tools. Your next favorite is waiting here.');
  return <div className="discovery-page">
    <div className="page-heading"><div><h1>{heading}</h1><p>{subtitle}</p></div><div className="catalog-status"><span className={`status-dot ${busy ? 'status-working' : ''}`} />{busy ? 'Looking on GitHub...' : status}</div></div>
    {mode === 'discover' && !initialQuery && !initialCategory && <div className="hero-grid">
      <section className="discovery-hero"><div className="hero-copy"><Badge variant="outline" className="hero-badge"><Sparkles size={14} />A good place to find your next favorite</Badge><h2><GradientText colors={["#f3f5ff", "#b6dfff", "#d9bcff"]} animationSpeed={14} glow={0.08}>Great software.<br />Open possibilities.</GradientText></h2><p>Discover the apps and tools that make<br className="hidden sm:block" /> creating, working, and everyday life better.</p><Button asChild variant="secondary" className="hero-button"><Link href="/featured">Explore the highlights<ArrowRight size={16} /></Link></Button></div><div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-art-grid" />{['supabase/supabase', 'microsoft/vscode', 'obsproject/obs-studio', 'ollama/ollama', 'excalidraw/excalidraw'].map((key, index) => { const app = initialApps.find(item => appKey(item) === key); return app ? <div className={`floating-app floating-app-${index}`} key={key}><AppIcon app={app} size={index === 1 ? 76 : 62} /></div> : null; })}<div className="hero-spark spark-one">+</div><div className="hero-spark spark-two">+</div></div></section>
      <section className="build-prompt"><div className="build-prompt-icon"><Sparkles size={23} /><span>Find your starting point</span></div><h2>What will you{' '}<br />build next?</h2><p>A web app? An AI assistant?{' '}<br />Find the right tools for your idea.</p><Button asChild variant="glass" className="build-cta"><Link href="/build">Find my stack<ArrowUpRight size={17} /></Link></Button><div className="build-prompt-decoration" aria-hidden="true"><Code2 size={56} strokeWidth={1} /></div></section>
    </div>}
    {mode === 'discover' && !initialQuery && !initialCategory && <Link href="/assistant" className="discovery-ai-entry"><Sparkles size={18} /><span><strong>Understand any public repository</strong> Ask about capabilities, setup, or a rebuild plan.</span><ArrowUpRight size={17} /></Link>}<div className="discovery-navigation"><nav className="discovery-tabs" aria-label="Project collections"><Link className={mode === 'discover' ? 'selected' : ''} href="/"><Compass size={16} />For you</Link><Link className={mode === 'popular' ? 'selected' : ''} href="/trending">Popular</Link><Link className={mode === 'all' ? 'selected' : ''} href="/apps">All projects</Link><Link href="/collections">Collections</Link></nav><span className="catalog-count">{catalog.length} projects to discover</span></div>
    <div className="category-chips" aria-label="Filter by category"><Button variant="ghost" className={!category ? 'selected' : ''} onClick={() => setCategory('')}>All categories</Button>{CATEGORIES.slice(0, 8).map(item => <Button variant="ghost" key={item.id} className={category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.name}</Button>)}</div>
    <section className="catalog-section" aria-labelledby="catalog-heading">
      <div className="catalog-heading"><div><h2 id="catalog-heading">{query.trim() ? `Results for “${query.trim()}”` : category ? categoryName(category) : mode === 'saved' ? 'Saved for later' : collection ? 'Inside this collection' : mode === 'popular' ? 'Community favorites' : mode === 'all' ? 'Explore the catalog' : recommendationSeeds.length ? 'Inspired by your library' : 'A few favorites to get you started'}<span>{filtered.length}</span></h2><p>{query ? 'Matches from the catalog and GitHub search.' : recommendationSeeds.length && mode === 'discover' ? 'Suggestions based on the topics and categories you have saved.' : 'Explore the source. Find your fit. Make it yours.'}</p></div><div className="catalog-tools"><Button variant="ghost" className={`filter-button ${showFilters ? 'selected' : ''}`} aria-expanded={showFilters} aria-controls="catalog-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} />Filters{hasFilters && <span className="filter-dot" />}</Button><CatalogSelect label="Sort projects" value={sort} onValueChange={setSort} options={[{ value: "recommended", label: "Recommended" }, { value: "stars", label: "Most stars" }, { value: "updated", label: "Recently updated" }, { value: "name", label: "Name: A–Z" }]} /><div className="view-switch"><Button variant="ghost" className={view === 'grid' ? 'selected' : ''} onClick={() => changeView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><Grid2X2 size={16} /></Button><Button variant="ghost" className={view === 'list' ? 'selected' : ''} onClick={() => changeView('list')} aria-label="List view" aria-pressed={view === 'list'}><List size={17} /></Button></div></div></div>
      {showFilters && <div className="filter-panel" id="catalog-filters"><label className="filter-search"><Search size={16} /><Input aria-label="Filter projects" placeholder="Find an app, topic, or repository" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} />{query && <Button variant="ghost" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></Button>}</label><label>Category<CatalogSelect label="Category" value={category} onValueChange={setCategory} options={[{ value: "", label: "All categories" }, ...CATEGORIES.map(item => ({ value: item.id, label: item.name }))]} /></label><label>Platform<CatalogSelect label="Platform" value={platform} onValueChange={setPlatform} options={[{ value: "", label: "Any platform" }, ...Object.entries(PLATFORM_NAMES).map(([value, label]) => ({ value, label }))]} /></label><label>Project type<CatalogSelect label="Project type" value={kind} onValueChange={setKind} options={[{ value: "", label: "Apps, tools & more" }, { value: "app", label: "Apps" }, { value: "tool", label: "Tools" }, { value: "framework", label: "Frameworks" }, { value: "resource", label: "Resources" }]} /></label><label>License<CatalogSelect label="License" value={license} onValueChange={setLicense} options={[{ value: "", label: "Any license" }, ...["MIT", "Apache-2.0", "GPL-3.0", "AGPL-3.0", "BSD-3-Clause", "Other"].map(value => ({ value, label: value === "Other" ? "Other / see repository" : value }))]} /></label></div>}
      {hasFilters && <div className="active-filters">{query && <Button variant="ghost" onClick={() => setQuery('')}>Search: {query}<X size={12} /></Button>}{category && <Button variant="ghost" onClick={() => setCategory('')}>{categoryName(category)}<X size={12} /></Button>}{platform && <Button variant="ghost" onClick={() => setPlatform('')}>{PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES]}<X size={12} /></Button>}{kind && <Button variant="ghost" onClick={() => setKind('')}>{kind}<X size={12} /></Button>}{license && <Button variant="ghost" onClick={() => setLicense('')}>{license}<X size={12} /></Button>}<Button variant="ghost" className="clear-filters" onClick={reset}>Clear all</Button></div>}
      {(error || storageError) && <div className="catalog-notice" role="status"><span>{storageError || error}</span>{error && mode !== 'saved' && <Button variant="ghost" disabled={busy} onClick={() => setRefresh(current => current + 1)}><RefreshCw size={14} />Try again</Button>}</div>}
      {mode === 'saved' && !ready ? <div className="empty-state"><Loader2 className="animate-spin" size={25} /><h3>Opening your library...</h3></div> : filtered.length ? <><div className={`app-grid ${view === 'list' ? 'app-list' : ''}`}>{filtered.slice(0, limit).map(app => <AppCard key={appKey(app)} app={app} view={view} />)}</div><div className="catalog-pagination"><span>Showing {Math.min(limit, filtered.length)} of {filtered.length} projects</span>{limit < filtered.length && <Button variant="ghost" onClick={() => setLimit(current => current + 12)}>Discover more<ArrowDown size={15} /></Button>}{mode !== 'saved' && <Button variant="ghost" className="refresh-catalog" disabled={busy} onClick={() => setRefresh(current => current + 1)}><RefreshCw size={13} className={busy ? 'animate-spin' : ''} />Refresh GitHub</Button>}</div></> : <div className="empty-state">{mode === 'saved' ? <Bookmark size={32} /> : <Search size={32} />}<h3>{mode === 'saved' && !hasFilters ? 'A home for your next favorites.' : 'Let’s try a different search.'}</h3><p>{mode === 'saved' && !hasFilters ? 'Tap the bookmark on any project to keep it here for later.' : 'Try a name like Ollama, a topic like notes, or clear a filter.'}</p>{hasFilters ? <Button variant="default" className="btn-primary px-5 py-2.5" onClick={reset}>Clear filters</Button> : <Link className="btn-primary px-5 py-2.5" href="/apps">Explore projects<ArrowRight size={15} /></Link>}</div>}
      {sort === 'stars' && <p className="metadata-note">Stars are fetched from GitHub. Projects awaiting metadata appear after projects with known star counts.</p>}
      {sort === 'updated' && <p className="metadata-note">Sorted by the last push to the source repository. Projects with unknown dates appear last.</p>}
    </section>
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><h2>You might also like</h2><p>Related projects, with a reason for each suggestion.</p></div><Sparkles size={20} /></div><div className="app-grid">{related.map(app => <AppCard key={appKey(app)} app={app} />)}</div></section>}
    {mode === 'discover' && !hasFilters && <section className="collections-section"><div className="section-heading"><div><h2>A good collection goes a long way.</h2><p>Handpicked projects that work better together.</p></div><Link href="/collections">View all collections<ArrowRight size={15} /></Link></div><CollectionCards limit={4} /></section>}
    {mode === 'discover' && !hasFilters && <div className="community-strip"><div className="community-icon"><Code2 size={24} /></div><div><h3>Know a project that belongs here?</h3><p>Every great discovery starts with someone sharing it.</p></div><Link href="/submit">Explore a repository<ArrowUpRight size={16} /></Link></div>}
    <span className="sr-only" aria-live="polite">{filtered.length} projects found{busy ? ', updating from GitHub' : ''}</span>
  </div>;
}



