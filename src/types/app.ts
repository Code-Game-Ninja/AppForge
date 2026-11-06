// App Types for AppForge

export type Platform = 
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios'
  | 'web'
  | 'cross-platform';

export type Category =
  | 'web-apps'
  | 'android'
  | 'desktop'
  | 'ai-ml'
  | 'cli-tools'
  | 'developer-tools'
  | 'utilities'
  | 'games'
  | 'productivity'
  | 'media'
  | 'communication'
  | 'security'
  | 'finance';

export type DownloadType = 
  | 'apk'
  | 'exe'
  | 'dmg'
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'zip'
  | 'tar.gz'
  | 'msi'
  | 'pkg';

export type License =
  | 'MIT'
  | 'Apache-2.0'
  | 'GPL-3.0'
  | 'GPL-2.0'
  | 'AGPL-3.0'
  | 'BSD-3-Clause'
  | 'BSD-2-Clause'
  | 'ISC'
  | 'MPL-2.0'
  | 'LGPL-3.0'
  | 'Unlicense'
  | 'CC0-1.0'
  | 'Other';

export interface Maintainer {
  name: string;
  username: string;
  avatar: string;
  githubUrl: string;
}

export interface Download {
  platform: Platform;
  type: DownloadType;
  url: string;
  size?: string;
  version?: string;
  fileName?: string;
}

export interface Release {
  version: string;
  date: string;
  notes: string; // markdown
  assets: Download[];
  isPreRelease?: boolean;
}

export interface AppStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  contributors?: number;
}

// Base App interface for listings
export interface App {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  logo: string;
  maintainer: Maintainer;
  stats: AppStats;
  category: Category;
  platforms: Platform[];
  license: License;
  lastUpdated: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  topics: string[];
  repoUrl?: string;
  homepage?: string;
  kind?: 'app' | 'tool' | 'framework' | 'resource';
  language?: string;
  dataSource?: 'catalog' | 'github';
  recommendationReason?: string;
}

// Extended App interface for detail page
export interface AppDetail extends App {
  longDescription: string;
  screenshots: string[];
  techStack: string[];
  features: string[];
  downloads: Download[];
  repoUrl: string;
  homepage?: string;
  demoUrl?: string;
  readme: string; // markdown content
  releases: Release[];
  createdAt: string;
  requirements?: string;
  installationGuide?: {
    platform: Platform;
    instructions: string; // markdown
  }[];
}

// Category with metadata
export interface CategoryInfo {
  id: Category;
  name: string;
  description: string;
  icon: string;
  appCount?: number;
}

// Platform with metadata
export interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string;
}
