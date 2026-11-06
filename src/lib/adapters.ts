import { App, Platform, Category, License } from '@/types';
import { GitHubRepo } from './github';

/**
 * Convert a GitHub repository response to our App interface
 */
export async function mapRepoToApp(repo: GitHubRepo, overrideCategory?: string): Promise<App> {
  const topics = repo.topics || [];
  // Infer category from topics, or use override if provided
  let category: Category;
  
  if (overrideCategory && isValidCategory(overrideCategory)) {
    category = overrideCategory as Category;
  } else {
    category = inferCategory(topics);
  }
  
  // Infer platforms from topics or other metadata
  const platforms = inferPlatforms(topics);
  
  // Map license
  const spdx = repo.license?.spdx_id;
  const license = (spdx && spdx !== 'NOASSERTION' ? spdx as License : 'Other');

  return {
    id: repo.full_name.toLowerCase(),
    slug: repo.name,
    name: repo.name, // Use full_name if we want owner/repo
    shortDescription: repo.description || 'No description available',
    logo: repo.owner.avatar_url, // Using owner avatar as fallback logo
    maintainer: {
      name: repo.owner.login,
      username: repo.owner.login,
      avatar: repo.owner.avatar_url,
      githubUrl: repo.owner.html_url,
    },
    stats: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      openIssues: repo.open_issues_count,
    },
    category,
    platforms,
    license,
    lastUpdated: repo.pushed_at,
    isVerified: false, // Default to false unless we have a whitelist
    isFeatured: topics.includes('appforge-featured'),
    topics,
    repoUrl: repo.html_url,
    homepage: repo.homepage || undefined,
    language: repo.language || undefined,
    dataSource: 'github',
    kind: inferKind(topics),
  };
}

/**
 * Helper to infer category from GitHub topics
 */
function inferCategory(topics: string[]): Category {
  if (!topics || topics.length === 0) return 'utilities';
  
  const map: Record<string, Category> = {
    'web': 'web-apps',
    'react': 'web-apps',
    'nextjs': 'web-apps',
    'vue': 'web-apps',
    'android': 'android',
    'mobile': 'android',
    'desktop': 'desktop',
    'windows': 'desktop',
    'macos': 'desktop',
    'linux': 'desktop',
    'electron': 'desktop',
    'tauri': 'desktop',
    'ai': 'ai-ml',
    'machine-learning': 'ai-ml',
    'gpt': 'ai-ml',
    'llm': 'ai-ml',
    'cli': 'cli-tools',
    'terminal': 'cli-tools',
    'shell': 'cli-tools',
    'dev-tools': 'developer-tools',
    'developer-tools': 'developer-tools',
    'game': 'games',
    'gaming': 'games',
    'security': 'security',
    'privacy': 'security',
    'utilities': 'utilities',
    'tool': 'utilities',
    'productivity': 'productivity',
    'note-taking': 'productivity',
    'media': 'media',
    'video': 'media',
    'audio': 'media',
    'music': 'media',
    'communication': 'communication',
    'chat': 'communication',
    'matrix': 'communication',
    'finance': 'finance',
    'budget': 'finance',
    'expense': 'finance',
    'accounting': 'finance',
    'money': 'finance'
  };

  for (const topic of topics) {
    const normalizeTopic = topic.toLowerCase();
    if (map[normalizeTopic]) return map[normalizeTopic];
  }

  return 'utilities'; // Default
}

function isValidCategory(cat: string): boolean {
  const validCategories = [
    'developer-tools', 'productivity', 'media', 'communication', 
    'utilities', 'security', 'ai-ml', 'games', 'cli-tools', 
    'web-apps', 'desktop', 'android', 'finance'
  ];
  return validCategories.includes(cat);
}

/**
 * Helper to infer platforms from GitHub topics
 */
function inferPlatforms(topics: string[]): Platform[] {
  const platforms: Platform[] = [];
  const validPlatforms: Platform[] = ['windows', 'macos', 'linux', 'android', 'ios', 'web'];

  topics.forEach(topic => {
    const t = topic.toLowerCase();
    if (validPlatforms.includes(t as Platform)) {
      platforms.push(t as Platform);
    }
  });

  if (platforms.length === 0) {
    // Determine generic defaults based on category?
    // For now, return a safe default
    return [];
  }

  return Array.from(new Set(platforms)); // Unique
}

function inferKind(topics: string[]): NonNullable<App['kind']> {
  if (topics.some(topic => ['awesome', 'awesome-list', 'roadmap', 'resources', 'tutorial'].includes(topic))) return 'resource';
  if (topics.some(topic => ['framework', 'library', 'sdk', 'ui-library'].includes(topic))) return 'framework';
  if (topics.some(topic => ['cli', 'developer-tools', 'devtools', 'database'].includes(topic))) return 'tool';
  return 'app';
}
