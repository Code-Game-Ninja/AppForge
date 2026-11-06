import { cache } from 'react';
import { getRepository, getReadme, getReleases } from './github';
import { CURATED_APPS, sourceToApp } from './data';
import { mapRepoToApp } from './adapters';
import { mergeApps } from './discovery';

export const getProject = cache(async (owner: string, name: string) => {
  const source = CURATED_APPS.find(item => item.repo.toLowerCase() === `${owner}/${name}`.toLowerCase());
  const repo = await getRepository(owner, name);
  if (!repo) return source ? { app: sourceToApp(source), repo: null, readme: null, releases: [] } : null;
  const mapped = await mapRepoToApp(repo, source?.category);
  const app = source ? mergeApps([sourceToApp(source)], [mapped])[0] : mapped;
  const [readme, releases] = await Promise.all([getReadme(owner, name), getReleases(owner, name)]);
  return { app, repo, readme, releases: releases.filter(release => !release.draft && !release.prerelease) };
});
