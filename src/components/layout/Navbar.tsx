'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Bookmark, Boxes, BrainCircuit, ChevronRight, Code2, Compass, ExternalLink, Github, Grid2X2, HelpCircle, Menu, MessageSquare, Monitor, Moon, Palette, Plus, Search, ShieldCheck, Smartphone, Sparkles, Sun, Terminal, TrendingUp, Wrench } from 'lucide-react';
import { CATEGORIES } from '@/lib/discovery';
import { useLibrary } from '@/components/apps/LibraryProvider';
import { GITHUB_REPO } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const categoryIcons = { 'developer-tools': Code2, 'ai-ml': BrainCircuit, productivity: Sparkles, 'web-apps': GlobeIcon, media: Palette, utilities: Wrench, security: ShieldCheck, 'cli-tools': Terminal, communication: MessageSquare, android: Smartphone, desktop: Monitor, finance: Boxes, games: Grid2X2 };
function GlobeIcon(props: React.ComponentProps<typeof Compass>) { return <Compass {...props} />; }

export function Navbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { saved } = useLibrary();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setQuery(params.get('q') ?? ''); setOpen(false); }, [params, pathname]);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const keyboard = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.closest('[role="dialog"], [role="listbox"]')) return;
      if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) && !element.isContentEditable)) { event.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => { document.removeEventListener('keydown', keyboard); desktop.removeEventListener('change', closeOnDesktop); };
  }, []);
  const toggleTheme = () => {
    const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('appforge-theme', next ? 'dark' : 'light'); } catch { /* Theme still works for this visit. */ }
  };
  const current = pathname === '/' ? 'Discover' : pathname.startsWith('/apps/') ? 'App details' : pathname === '/apps' ? 'All apps' : pathname === '/trending' ? 'Popular' : pathname === '/featured' ? 'Featured' : pathname === '/saved' ? 'Saved apps' : pathname === '/build' ? 'Build finder' : pathname === '/assistant' ? 'AI assistant' : pathname === '/collections' ? 'Collections' : pathname.slice(1).replace(/-/g, ' ');
  const navigation = [
    { name: 'Discover', href: '/', icon: Compass },
    { name: 'All apps', href: '/apps', icon: Grid2X2 },
    { name: 'Popular', href: '/trending', icon: TrendingUp },
    { name: 'Collections', href: '/collections', icon: Boxes },
    { name: 'Build finder', href: '/build', icon: Sparkles },
    { name: 'AI assistant', href: '/assistant', icon: BrainCircuit },
    { name: 'Saved apps', href: '/saved', icon: Bookmark },
  ];
  const sidebarContent = <>
      <Link href="/" className="brand"><span className="brand-symbol"><Boxes size={24} strokeWidth={2} /></span><span>appforge<span className="brand-dot">.</span></span></Link>
      <div className="sidebar-tagline">Good software. Open possibilities.</div>
      <nav className="sidebar-nav">
        {navigation.map(item => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href && !params.get('category') ? 'active' : ''}`} aria-current={pathname === item.href && !params.get('category') ? 'page' : undefined}><item.icon size={19} /><span>{item.name}</span>{item.name === 'Saved apps' && saved.length > 0 && <span className="nav-count">{saved.length}</span>}{item.name === 'Discover' && <span className="nav-indicator" />}</Link>)}
      </nav>
      <div className="sidebar-section-heading"><span>Explore categories</span><Link href="/categories" aria-label="View all categories"><ChevronRight size={15} /></Link></div>
      <nav className="sidebar-categories" aria-label="Categories">{CATEGORIES.slice(0, 8).map(category => { const Icon = categoryIcons[category.id]; return <Link key={category.id} href={`/apps?category=${category.id}`} className={`nav-item ${params.get('category') === category.id ? 'active' : ''}`}><Icon size={17} /><span>{category.name}</span></Link>; })}<Link href="/categories" className="nav-item category-more"><Grid2X2 size={17} />All categories<ArrowUpRight size={14} /></Link></nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Github size={23} /><h3>Open source, open doors.</h3><p>Find something useful. Make something yours.</p><a href={GITHUB_REPO} target="_blank" rel="noreferrer">Star AppForge<ArrowUpRight size={14} /></a></div><Link href="/guidelines" className="sidebar-help"><HelpCircle size={16} />Community guidelines<ExternalLink size={13} /></Link></div>
    </>;
  return <Sheet open={open} onOpenChange={setOpen}>
    <aside className="sidebar" aria-label="Main navigation">{sidebarContent}</aside>
    <header className="topbar">
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu icon-button" aria-label="Open navigation"><Menu size={21} /></Button></SheetTrigger>
      <div className="breadcrumb"><span>Explore</span><ChevronRight size={14} /><strong>{current}</strong></div>
      <form className="global-search" role="search" onSubmit={event => { event.preventDefault(); router.push(`/apps${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); }}><Search size={17} /><Input ref={searchRef} aria-label="Search apps, tools, and repositories" placeholder="Search apps, tools, repositories..." value={query} onChange={event => setQuery(event.target.value)} maxLength={120} /><kbd>Ctrl K</kbd></form>
      <div className="topbar-actions"><Tooltip><TooltipTrigger asChild><Button variant="neo" size="icon" className="icon-button theme-toggle" aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={toggleTheme}>{dark ? <Sun size={19} /> : <Moon size={19} />}</Button></TooltipTrigger><TooltipContent className="ui-tooltip">Switch to {dark ? 'light' : 'dark'} theme</TooltipContent></Tooltip><Button variant="ghost" asChild className="submit-link"><Link href="/submit"><Plus size={17} /><span>Add a repository</span></Link></Button><a href={GITHUB_REPO} className="github-avatar" aria-label="AppForge on GitHub" target="_blank" rel="noreferrer"><Github size={20} /></a></div>
    </header>
    <SheetContent side="left" className="mobile-navigation"><SheetHeader className="sr-only"><SheetTitle>Main navigation</SheetTitle><SheetDescription>Explore projects, saved apps, and the AI assistant.</SheetDescription></SheetHeader>{sidebarContent}</SheetContent>
  </Sheet>;
}
