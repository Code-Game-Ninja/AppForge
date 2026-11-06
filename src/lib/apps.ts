import { getAppConfigs, sourceToApp } from './data';
import { searchRepositories } from './github';
import { mapRepoToApp } from './adapters';
import { mergeApps, recommendApps, searchCatalog } from './discovery';
import type { App } from '@/types';

export async function getApps(limit?: number): Promise<App[]> {
  return getAppConfigs(limit).map(sourceToApp);
}
export async function getFeaturedApps(): Promise<App[]> {
  return getAppConfigs(undefined, true).map(sourceToApp);
}
export async function getAppsByCategory(category: string, limit = 100): Promise<App[]> {
  return (await getApps()).filter(app => app.category === category).slice(0, limit);
}
export async function searchApps(query: string): Promise<{ apps: App[]; recommendations: App[] }> {
  const catalog = await getApps();
  const result = await searchRepositories(`${query.trim()} in:name,description archived:false fork:false`, { perPage: 60 });
  const remote = await Promise.all(result.items.map(repo => mapRepoToApp(repo)));
  const apps = searchCatalog(mergeApps(catalog, remote), query);
  return { apps, recommendations: recommendApps(catalog, apps.slice(0, 5), apps.map(app => app.id)) };
}
