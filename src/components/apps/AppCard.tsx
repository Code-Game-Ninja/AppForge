'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight, Bookmark, Check, Globe, Monitor, Star } from 'lucide-react';
import type { App } from '@/types';
import { categoryName, PLATFORM_NAMES } from '@/lib/discovery';
import { formatNumber } from '@/lib/utils';
import { AppIcon } from './AppIcon';
import { useLibrary } from './LibraryProvider';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SaveButton({ app, compact = true }: { app: App; compact?: boolean }) {
  const { isSaved, toggle, ready } = useLibrary();
  const active = isSaved(app);
  const control = <Button variant={compact ? 'ghost' : 'neo'} size={compact ? 'icon' : 'default'} type="button" disabled={!ready} className={compact ? `save-button ${active ? 'is-saved' : ''}` : 'px-4 py-2.5'} onClick={() => toggle(app)} aria-label={`${active ? 'Remove' : 'Save'} ${app.name}${active ? ' from' : ' to'} your library`} aria-pressed={active}>
    {compact ? <Bookmark size={17} fill={active ? 'currentColor' : 'none'} /> : <>{active ? <Check size={17} /> : <Bookmark size={17} />}{active ? 'Saved to library' : 'Save to library'}</>}
  </Button>;
  return <Tooltip><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent className="ui-tooltip">{active ? 'Remove from library' : 'Save to library'}</TooltipContent></Tooltip>;
}
export function AppCard({ app, view = 'grid' }: { app: App; view?: 'grid' | 'list' }) {
  return <article className="app-card-shell"><SpotlightCard className={`app-card ${view === 'list' ? 'app-card-list' : ''}`} spotlightColor="#b9b4ff" intensity={0.08} borderGlow={0.5} proximity={0} flare={false} smoothing={0.12} style={{ '--spotlight-card-surface': 'var(--glass-fill)', '--spotlight-card-border': 'var(--glass-edge)', '--spotlight-card-shadow': 'var(--panel-shadow)' } as CSSProperties}>
    <div className="app-card-heading">
      <AppIcon app={app} />
      <div className="app-card-title"><Link href={`/apps/${app.maintainer.username}/${app.slug}`} className="app-name">{app.name}</Link><span>{categoryName(app.category)}</span></div>
      <SaveButton app={app} />
    </div>
    <p className="app-description">{app.shortDescription}</p>
    <div className="app-tags"><Badge variant="outline">{app.kind === 'framework' ? 'Framework' : app.kind === 'resource' ? 'Resource' : app.kind === 'tool' ? 'Tool' : 'App'}</Badge><Badge variant="outline">{app.license === 'Other' ? 'See license' : app.license}</Badge></div>
    {app.recommendationReason && <p className="recommendation-reason">{app.recommendationReason}</p>}
    <div className="app-card-footer">
      <span className="app-stars">{app.dataSource === 'github' ? <><Star size={14} /> {formatNumber(app.stats.stars)}</> : <><Check size={14} /> Curated</>}</span>
      <span className="app-platform" title={app.platforms.map(platform => PLATFORM_NAMES[platform]).join(', ') || 'See repository for supported platforms'}>{app.platforms.includes('web') ? <Globe size={13} /> : <Monitor size={13} />}{app.platforms.length > 1 ? 'Multi-platform' : PLATFORM_NAMES[app.platforms[0]] || 'See repository'}</span>
      <Link href={`/apps/${app.maintainer.username}/${app.slug}`} className="card-open" aria-label={`Explore ${app.name}`}><ArrowUpRight size={17} /></Link>
    </div>
  </SpotlightCard></article>;
}
