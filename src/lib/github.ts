import 'server-only';
// GitHub API Integration for AppForge
// Fetches repository data, README, releases, etc.

const GITHUB_API_BASE = 'https://api.github.com';
let repositoryRetryAt = 0;

// Token should be in environment variable (server-side only)
const getHeaders = () => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Only add auth header if token exists (server-side)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
};

// Types for GitHub API responses
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  topics: string[];
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
  default_branch: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  label: string | null;
  content_type: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface GitHubReadme {
  content: string; // Base64 encoded
  encoding: string;
  html_url: string;
}

/**
 * Fetch repository information
 */
export async function getRepository(owner: string, repo: string): Promise<GitHubRepo | null> {
  if (Date.now() < repositoryRetryAt) return null;
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      } as RequestInit
    );

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        repositoryRetryAt = Math.max(Date.now() + 60_000, Math.min(reset || Date.now() + 600_000, Date.now() + 3_600_000));
      }
      console.error(`GitHub API error: ${response.status} for repo ${owner}/${repo}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch repository:', error);
    return null;
  }
}

/**
 * Fetch repository README
 */
export async function getReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      } as RequestInit
    );

    if (!response.ok) return null;

    const data: GitHubReadme = await response.json();
    
    // Decode base64 content
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    
    return data.content;
  } catch (error) {
    console.error('Failed to fetch README:', error);
    return null;
  }
}

/**
 * Fetch repository releases
 */
export async function getReleases(
  owner: string,
  repo: string,
  limit: number = 10
): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${limit}`,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      } as RequestInit
    );

    if (!response.ok) return [];

    return response.json();
  } catch (error) {
    console.error('Failed to fetch releases:', error);
    return [];
  }
}

/**
 * Search repositories by topic/keyword
 */
export async function searchRepositories(
  query: string,
  options: {
    topics?: string[];
    minStars?: number;
    language?: string;
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  } = {}
): Promise<{ items: GitHubRepo[]; total_count: number; error?: string }> {
  try {
    const {
      topics = [],
      minStars = 0,
      language,
      sort = 'stars',
      order = 'desc',
      perPage = 30,
      page = 1,
    } = options;

    // Build search query
    let searchQuery = query;
    
    if (topics.length > 0) {
      searchQuery += ' ' + topics.map(t => `topic:${t}`).join(' ');
    }
    
    if (minStars > 0) {
      searchQuery += ` stars:>=${minStars}`;
    }
    
    if (language) {
      searchQuery += ` language:${language}`;
    }

    const params = new URLSearchParams({
      q: searchQuery,
      sort,
      order,
      per_page: perPage.toString(),
      page: page.toString(),
    });

    const url = `${GITHUB_API_BASE}/search/repositories?${params}`;

    const response = await fetch(
      url,
      {
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 1800 },
      } as RequestInit
    );

    if (!response.ok) {
      return { items: [], total_count: 0, error: response.status === 403 || response.status === 429 ? 'GitHub’s request limit was reached. Your curated catalog is still available.' : 'GitHub search is unavailable. Your curated catalog is still available.' };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to search repositories:', error);
    return { items: [], total_count: 0, error: 'Could not connect to GitHub. Your curated catalog is still available.' };
  }
}

/**
 * Fetch repositories by topic (for discovering apps)
 */
export async function getRepositoriesByTopic(
  topic: string,
  options: {
    minStars?: number;
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubRepo[]> {
  const result = await searchRepositories('', {
    topics: [topic],
    minStars: options.minStars || 100,
    perPage: options.perPage || 30,
    page: options.page || 1,
    sort: 'stars',
  });

  return result.items;
}

/**
 * Fetch multiple repositories from a list of full names
 */
export async function getMultipleRepositories(
  repoFullNames: string[]
): Promise<GitHubRepo[]> {
  const promises = repoFullNames.map(fullName => {
    const [owner, repo] = fullName.split('/');
    return getRepository(owner, repo);
  });

  const results = await Promise.all(promises);
  return results.filter((repo): repo is GitHubRepo => repo !== null);
}

/**
 * Get rate limit status
 */
export async function getRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
} | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/rate_limit`,
      { headers: getHeaders() }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
    };
  } catch {
    return null;
  }
}
