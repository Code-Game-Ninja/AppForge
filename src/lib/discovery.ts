import type { App, Category, Platform } from '@/types';

export const CATEGORIES: { id: Category; name: string; description: string }[] = [
  { id: 'developer-tools', name: 'Developer tools', description: 'Editors, API clients, and tools for your workflow.' },
  { id: 'ai-ml', name: 'AI & machine learning', description: 'Local models, agents, and machine learning toolkits.' },
  { id: 'productivity', name: 'Productivity', description: 'Notes, tasks, calendars, and focused workspaces.' },
  { id: 'web-apps', name: 'Web & frameworks', description: 'Frontends, backends, and everything in between.' },
  { id: 'media', name: 'Design & media', description: 'Create, edit, stream, and organize your media.' },
  { id: 'utilities', name: 'Utilities', description: 'Useful upgrades for your devices and services.' },
  { id: 'security', name: 'Privacy & security', description: 'Passwords, encryption, and private networks.' },
  { id: 'cli-tools', name: 'Terminal tools', description: 'Small tools that make the command line better.' },
  { id: 'communication', name: 'Communication', description: 'Messaging, meetings, and team conversations.' },
  { id: 'android', name: 'Mobile', description: 'Apps and frameworks for devices on the go.' },
  { id: 'desktop', name: 'Desktop', description: 'Desktop applications and cross-platform frameworks.' },
  { id: 'finance', name: 'Finance', description: 'Budgeting, accounting, and investment tracking.' },
  { id: 'games', name: 'Games', description: 'Games, engines, and worlds you can make your own.' },
];
export const categoryName = (id: string) => CATEGORIES.find(category => category.id === id)?.name ?? id;
export const PLATFORM_NAMES: Record<Platform, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS', web: 'Web', 'cross-platform': 'Cross-platform' };
export const appKey = (app: App) => `${app.maintainer.username}/${app.slug}`.toLowerCase();

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: 'code' | 'brain' | 'server' | 'palette' | 'shield' | 'terminal';
  repos: string[];
}
export const COLLECTIONS: Collection[] = [
  { id: 'developer-essentials', name: 'The developer toolkit', description: 'Less friction. More building.', color: 'violet', icon: 'code', repos: ['microsoft/vscode', 'jesseduffield/lazygit', 'hoppscotch/hoppscotch', 'bruno-api/bruno', 'dbeaver/dbeaver', 'excalidraw/excalidraw', 'astral-sh/uv', 'cli/cli'] },
  { id: 'local-ai', name: 'AI, on your terms', description: 'Explore models on your own machine.', color: 'blue', icon: 'brain', repos: ['ollama/ollama', 'open-webui/open-webui', 'ggml-org/llama.cpp', 'comfyanonymous/comfyui', 'langflow-ai/langflow', 'qdrant/qdrant'] },
  { id: 'self-hosted', name: 'Make yourself at home', description: 'Your server. Your software. Your data.', color: 'green', icon: 'server', repos: ['immich-app/immich', 'jellyfin/jellyfin', 'coollabsio/coolify', 'louislam/uptime-kuma', 'home-assistant/core', 'usememos/memos', 'actualbudget/actual', 'navidrome/navidrome'] },
  { id: 'creative-studio', name: 'The open creative studio', description: 'Bring your next big idea to life.', color: 'peach', icon: 'palette', repos: ['obsproject/obs-studio', 'blender/blender', 'kde/krita', 'gnome/gimp', 'audacity/audacity', 'mltframework/shotcut', 'excalidraw/excalidraw'] },
  { id: 'privacy', name: 'A little more privacy', description: 'Take back control of everyday essentials.', color: 'blue', icon: 'shield', repos: ['bitwarden/clients', 'keepassxreboot/keepassxc', 'signalapp/signal-desktop', 'ente-io/ente', 'localsend/localsend', 'cryptomator/cryptomator', 'syncthing/syncthing'] },
  { id: 'terminal', name: 'Love your terminal', description: 'A faster, friendlier command line.', color: 'violet', icon: 'terminal', repos: ['junegunn/fzf', 'starship/starship', 'burntsushi/ripgrep', 'sharkdp/bat', 'sharkdp/fd', 'ajeetdsouza/zoxide', 'nushell/nushell', 'charmbracelet/gum'] },
];

export interface BuildStack {
  id: string;
  name: string;
  description: string;
  steps: { repo: string; role: string; reason: string }[];
}
export const BUILD_STACKS: BuildStack[] = [
  { id: 'web', name: 'A web app', description: 'A practical starting point for a dashboard, SaaS product, or full-stack app.', steps: [
    { repo: 'vercel/next.js', role: 'Application framework', reason: 'Build your React interface and server routes in one project.' },
    { repo: 'supabase/supabase', role: 'Database & authentication', reason: 'Add Postgres, user accounts, and file storage.' },
    { repo: 'shadcn-ui/ui', role: 'Interface components', reason: 'Start with accessible components you can customize.' },
    { repo: 'coollabsio/coolify', role: 'Deployment', reason: 'Deploy the application to your own server when you are ready.' },
  ] },
  { id: 'ai', name: 'An AI assistant', description: 'Start with local models, then add retrieval and an interface.', steps: [
    { repo: 'ollama/ollama', role: 'Local model runtime', reason: 'Run supported language models on your own hardware.' },
    { repo: 'open-webui/open-webui', role: 'Chat interface', reason: 'Use a ready-made interface to talk to your models.' },
    { repo: 'langchain-ai/langchain', role: 'Tools & retrieval', reason: 'Connect the model to documents and application tools.' },
    { repo: 'qdrant/qdrant', role: 'Vector storage', reason: 'Store and search embeddings for document retrieval.' },
  ] },
  { id: 'mobile', name: 'A mobile app', description: 'A React Native starting point with a backend and an API testing workflow.', steps: [
    { repo: 'expo/expo', role: 'Mobile toolkit', reason: 'Develop React Native applications for Android and iOS.' },
    { repo: 'appwrite/appwrite', role: 'Application backend', reason: 'Add accounts, data storage, and server functions.' },
    { repo: 'bruno-api/bruno', role: 'API testing', reason: 'Test your backend endpoints and keep requests in version control.' },
    { repo: 'excalidraw/excalidraw', role: 'Planning canvas', reason: 'Sketch screens and map the application flow before building.' },
  ] },
  { id: 'hosting', name: 'A self-hosted setup', description: 'A foundation for running, routing, and monitoring your own services.', steps: [
    { repo: 'moby/moby', role: 'Container foundation', reason: 'Package and run services using the toolkit behind Docker.' },
    { repo: 'coollabsio/coolify', role: 'Deployment dashboard', reason: 'Manage application deployments and databases on your server.' },
    { repo: 'traefik/traefik', role: 'Traffic routing', reason: 'Route incoming requests to the right service.' },
    { repo: 'louislam/uptime-kuma', role: 'Service monitoring', reason: 'Track service availability and configure notifications.' },
  ] },
  { id: 'game', name: 'A game', description: 'A small creative toolchain for building and publishing a game.', steps: [
    { repo: 'godotengine/godot', role: 'Game engine', reason: 'Create gameplay, scenes, and interfaces for 2D or 3D games.' },
    { repo: 'blender/blender', role: '3D assets', reason: 'Model and animate assets for your game world.' },
    { repo: 'kde/krita', role: '2D artwork', reason: 'Draw sprites, concepts, and textures.' },
    { repo: 'audacity/audacity', role: 'Sound editing', reason: 'Record and prepare sound effects and music.' },
  ] },
];

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
export function searchCatalog(apps: App[], query: string): App[] {
  const phrase = normalize(query);
  if (!phrase) return apps;
  const terms = phrase.split(/\s+/);
  return apps.map(app => {
    const name = normalize(app.name);
    const repo = normalize(appKey(app));
    const tags = normalize([...app.topics, categoryName(app.category), app.language ?? ''].join(' '));
    const description = normalize(app.shortDescription);
    const all = `${name} ${repo} ${tags} ${description}`;
    if (!terms.every(term => all.includes(term))) return { app, score: 0 };
    const score = (name === phrase ? 100 : name.includes(phrase) ? 40 : 0)
      + terms.reduce((sum, term) => sum + (name.includes(term) ? 12 : 0) + (repo.includes(term) ? 8 : 0) + (tags.includes(term) ? 5 : 0) + (description.includes(term) ? 1 : 0), 0);
    return { app, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || b.app.stats.stars - a.app.stats.stars).map(result => result.app);
}

// Relevance is based on several seeds. Popularity breaks ties, but never replaces relevance.
export function recommendApps(catalog: App[], seeds: App[], excluded: string[] = [], limit = 8): App[] {
  const omit = new Set([...seeds.map(appKey), ...excluded]);
  if (!seeds.length) return catalog.filter(app => !omit.has(appKey(app))).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || b.stats.stars - a.stats.stars).slice(0, limit);
  const topics = new Set(seeds.flatMap(app => app.topics));
  const categories = new Set(seeds.map(app => app.category));
  return catalog.filter(app => !omit.has(appKey(app))).map(app => {
    const shared = app.topics.filter(topic => topics.has(topic));
    const categoryMatch = categories.has(app.category);
    const score = shared.length * 4 + (categoryMatch ? 3 : 0);
    const reason = shared.length ? `Also for ${shared.slice(0, 2).join(' and ').replace(/-/g, ' ')}` : `More in ${categoryName(app.category).toLowerCase()}`;
    return { app: { ...app, recommendationReason: reason }, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || b.app.stats.stars - a.app.stats.stars).slice(0, limit).map(result => result.app);
}

export function mergeApps(base: App[], incoming: App[]): App[] {
  const merged = new Map(base.map(app => [appKey(app), app]));
  for (const app of incoming) {
    const previous = merged.get(appKey(app));
    merged.set(appKey(app), previous ? { ...app, ...(app.dataSource === 'catalog' && previous.dataSource === 'github' ? previous : {}), name: previous.name, shortDescription: previous.shortDescription, category: previous.category, platforms: previous.platforms, kind: previous.kind, isFeatured: previous.isFeatured, topics: Array.from(new Set([...previous.topics, ...app.topics])) } : app);
  }
  return Array.from(merged.values());
}
