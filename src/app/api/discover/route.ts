import { NextRequest, NextResponse } from 'next/server';
import { getApps } from '@/lib/apps';
import { getRepository, searchRepositories } from '@/lib/github';
import { mapRepoToApp } from '@/lib/adapters';
import { mergeApps } from '@/lib/discovery';
import type { App } from '@/types';

interface DiscoveryResult { apps: App[]; total: number; error: string | null; source: 'catalog' | 'github' }
const cached = new Map<string, { data: DiscoveryResult; expires: number }>();
const pending = new Map<string, Promise<DiscoveryResult>>();

async function discover(query: string): Promise<DiscoveryResult> {
  const catalog = await getApps();
  const results = await searchRepositories(query ? `${query} in:name,description archived:false fork:false` : 'stars:>=1000 archived:false fork:false', { perPage: 100 });
  const highlights = query || results.error ? [] : await Promise.all(catalog.filter(app => app.isFeatured).slice(0, 8).map(app => getRepository(app.maintainer.username, app.slug)));
  const repositories = [...results.items, ...highlights.filter(repo => repo !== null)];
  const apps = await Promise.all(repositories.map(repo => mapRepoToApp(repo)));
  const metadataLimited = highlights.length > 0 && highlights.every(repo => repo === null);
  return {
    apps: mergeApps(catalog, apps), total: results.total_count,
    error: results.error ?? (metadataLimited ? 'Some project statistics could not be refreshed. Showing available GitHub data and curated projects.' : null),
    source: results.error ? 'catalog' : 'github',
  };
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  const key = query.toLowerCase();
  const entry = cached.get(key);
  if (entry && entry.expires > Date.now()) return NextResponse.json(entry.data);
  let operation = pending.get(key);
  if (!operation) {
    operation = discover(query).then(data => {
      if (cached.size >= 50) cached.delete(cached.keys().next().value!);
      cached.set(key, { data, expires: Date.now() + (data.error ? 60_000 : 1_800_000) });
      return data;
    }).finally(() => pending.delete(key));
    pending.set(key, operation);
  }
  return NextResponse.json(await operation);
}
