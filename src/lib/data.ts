import type { App, Category, License, Platform } from '@/types';

export interface AppSource {
  repo: string;
  name: string;
  description: string;
  category: Category;
  platforms: Platform[];
  license: License;
  topics: string[];
  kind: NonNullable<App['kind']>;
  featured?: boolean;
}
type Seed = [string, string, string, string, License, string, AppSource['kind']?, boolean?];
const group = (category: Category, seeds: Seed[]): AppSource[] => seeds.map(([repo, name, description, platforms, license, topics, kind = 'app', featured]) => ({
  repo, name, description, category, platforms: platforms.split(',') as Platform[], license, topics: topics.split(','), kind, featured,
}));

// Editorial metadata works offline. Stars and activity come only from GitHub.
// All links point to the original source repositories.
export const CURATED_APPS: AppSource[] = [
  ...group('developer-tools', [
    ['microsoft/vscode', 'Visual Studio Code', 'A powerful code editor with extensions for just about everything you build.', 'windows,macos,linux,web', 'MIT', 'editor,ide,typescript,development', 'tool', true],
    ['neovim/neovim', 'Neovim', 'A fast, extensible editor that makes your terminal feel like home.', 'windows,macos,linux', 'Apache-2.0', 'editor,vim,terminal,development', 'tool'],
    ['zed-industries/zed', 'Zed', 'A high-performance code editor built for collaboration and speed.', 'macos,linux,windows', 'Other', 'editor,rust,collaboration,development', 'tool', true],
    ['gitbutlerapp/gitbutler', 'GitButler', 'Manage branches and changes with a visual Git workflow.', 'windows,macos,linux', 'Other', 'git,version-control,development', 'tool'],
    ['jesseduffield/lazygit', 'Lazygit', 'A simple terminal interface for your everyday Git commands.', 'windows,macos,linux', 'MIT', 'git,terminal,development', 'tool'],
    ['hoppscotch/hoppscotch', 'Hoppscotch', 'Build, test, and share API requests in a lightweight workspace.', 'web,windows,macos,linux', 'MIT', 'api,rest,testing,development', 'tool', true],
    ['bruno-api/bruno', 'Bruno', 'An offline-first API client with collections stored in your Git repository.', 'windows,macos,linux', 'MIT', 'api,rest,testing,offline', 'tool'],
    ['dbeaver/dbeaver', 'DBeaver', 'Explore and manage SQL databases from one desktop application.', 'windows,macos,linux', 'Apache-2.0', 'database,sql,development', 'tool'],
    ['excalidraw/excalidraw', 'Excalidraw', 'Sketch diagrams, architecture, and ideas on a collaborative canvas.', 'web', 'MIT', 'drawing,diagrams,collaboration,design', 'app', true],
    ['lapce/lapce', 'Lapce', 'A native code editor written in Rust with remote development support.', 'windows,macos,linux', 'Apache-2.0', 'editor,rust,development', 'tool'],
  ]),
  ...group('ai-ml', [
    ['ollama/ollama', 'Ollama', 'Run large language models locally. Your models, on your machine.', 'windows,macos,linux', 'MIT', 'ai,llm,local-ai,chat,models', 'tool', true],
    ['open-webui/open-webui', 'Open WebUI', 'A self-hosted interface for chatting with local and cloud AI models.', 'web', 'Other', 'ai,llm,chat,self-hosted,local-ai', 'app', true],
    ['langgenius/dify', 'Dify', 'Create AI workflows and production-ready language model applications.', 'web', 'Other', 'ai,llm,workflow,automation,rag', 'tool'],
    ['langflow-ai/langflow', 'Langflow', 'Visually assemble agents and AI workflows with reusable components.', 'web', 'MIT', 'ai,llm,agents,workflow,rag', 'tool'],
    ['ggml-org/llama.cpp', 'llama.cpp', 'Efficient language model inference across a wide range of hardware.', 'windows,macos,linux', 'MIT', 'ai,llm,local-ai,inference', 'tool'],
    ['comfyanonymous/ComfyUI', 'ComfyUI', 'Build image generation workflows with a flexible node-based interface.', 'windows,macos,linux', 'GPL-3.0', 'ai,image-generation,stable-diffusion,creative'],
    ['AUTOMATIC1111/stable-diffusion-webui', 'Stable Diffusion WebUI', 'Generate and edit images through a browser interface for Stable Diffusion.', 'windows,macos,linux,web', 'AGPL-3.0', 'ai,image-generation,stable-diffusion,creative'],
    ['huggingface/transformers', 'Transformers', 'Pretrained models for text, vision, audio, and multimodal applications.', 'windows,macos,linux', 'Apache-2.0', 'ai,python,machine-learning,models', 'framework'],
    ['langchain-ai/langchain', 'LangChain', 'Connect language models, tools, and data to build AI applications.', 'windows,macos,linux', 'MIT', 'ai,llm,agents,rag,python', 'framework'],
    ['run-llama/llama_index', 'LlamaIndex', 'Connect your data to language models for retrieval and agents.', 'windows,macos,linux', 'MIT', 'ai,llm,rag,python,data', 'framework'],
    ['qdrant/qdrant', 'Qdrant', 'A vector database for semantic search and AI retrieval.', 'windows,macos,linux', 'Apache-2.0', 'ai,database,vector,rag,search', 'tool'],
    ['pytorch/pytorch', 'PyTorch', 'Build and train machine learning models with a flexible Python toolkit.', 'windows,macos,linux', 'BSD-3-Clause', 'ai,python,machine-learning,deep-learning', 'framework'],
  ]),
  ...group('web-apps', [
    ['supabase/supabase', 'Supabase', 'Give your next project a Postgres database, authentication, and storage.', 'web', 'Apache-2.0', 'backend,database,authentication,postgres,saas', 'tool', true],
    ['vercel/next.js', 'Next.js', 'Build full-stack React applications, from your first page to production.', 'web,windows,macos,linux', 'MIT', 'react,typescript,web,frontend,saas', 'framework', true],
    ['facebook/react', 'React', 'Build interactive user interfaces with reusable components.', 'web', 'MIT', 'react,javascript,frontend,web', 'framework'],
    ['vuejs/core', 'Vue', 'A progressive framework for building approachable web interfaces.', 'web', 'MIT', 'vue,javascript,frontend,web', 'framework'],
    ['sveltejs/svelte', 'Svelte', 'Build concise web interfaces with a compiler-first framework.', 'web', 'MIT', 'svelte,javascript,frontend,web', 'framework'],
    ['withastro/astro', 'Astro', 'Create fast content sites with less client-side JavaScript.', 'web', 'MIT', 'web,frontend,blog,website', 'framework'],
    ['nuxt/nuxt', 'Nuxt', 'Build full-stack Vue applications with a complete development framework.', 'web', 'MIT', 'vue,web,frontend,saas', 'framework'],
    ['tailwindlabs/tailwindcss', 'Tailwind CSS', 'Style interfaces with a utility-first CSS framework.', 'web', 'MIT', 'css,design,frontend,web', 'framework'],
    ['shadcn-ui/ui', 'shadcn/ui', 'Accessible, customizable components you can bring into your own codebase.', 'web', 'MIT', 'react,components,design,frontend', 'resource'],
    ['appwrite/appwrite', 'Appwrite', 'Add authentication, databases, functions, and storage to your apps.', 'web', 'BSD-3-Clause', 'backend,database,authentication,mobile,saas', 'tool'],
    ['pocketbase/pocketbase', 'PocketBase', 'A compact backend with a database, authentication, and file storage.', 'windows,macos,linux,web', 'MIT', 'backend,database,authentication,saas', 'tool'],
    ['strapi/strapi', 'Strapi', 'Manage content through a customizable headless CMS.', 'web', 'Other', 'cms,content,backend,website', 'tool'],
    ['payloadcms/payload', 'Payload', 'A TypeScript headless CMS for content and application backends.', 'web', 'MIT', 'cms,typescript,backend,website', 'tool'],
    ['directus/directus', 'Directus', 'Manage SQL data with a flexible content platform.', 'web', 'Other', 'cms,database,backend,content', 'tool'],
  ]),
  ...group('productivity', [
    ['laurent22/joplin', 'Joplin', 'Keep notes and to-dos in an open, private, cross-platform notebook.', 'windows,macos,linux,android,ios', 'AGPL-3.0', 'notes,note-taking,markdown,offline', 'app', true],
    ['logseq/logseq', 'Logseq', 'Connect your notes and ideas in a local-first knowledge graph.', 'windows,macos,linux,android,ios', 'AGPL-3.0', 'notes,note-taking,knowledge,local-first'],
    ['AppFlowy-IO/AppFlowy', 'AppFlowy', 'Bring notes, projects, and knowledge into one workspace.', 'windows,macos,linux,android,ios', 'AGPL-3.0', 'notes,workspace,notion,projects'],
    ['toeverything/AFFiNE', 'AFFiNE', 'Combine documents, whiteboards, and databases in one workspace.', 'web,windows,macos,linux', 'Other', 'notes,workspace,whiteboard,knowledge'],
    ['usememos/memos', 'Memos', 'Capture short notes in a lightweight, self-hosted personal timeline.', 'web', 'MIT', 'notes,self-hosted,knowledge'],
    ['outline/outline', 'Outline', 'A collaborative knowledge base for your team’s documents.', 'web', 'Other', 'notes,knowledge,team,documentation'],
    ['makeplane/plane', 'Plane', 'Plan projects, track issues, and organize your team’s work.', 'web', 'AGPL-3.0', 'projects,issues,team,planning'],
    ['vikunja/vikunja', 'Vikunja', 'Organize tasks and projects with a self-hosted to-do application.', 'web', 'AGPL-3.0', 'todo,tasks,projects,self-hosted'],
    ['calcom/cal.com', 'Cal.com', 'Schedule meetings and share availability on your own terms.', 'web', 'Other', 'calendar,scheduling,meetings,team'],
    ['siyuan-note/siyuan', 'SiYuan', 'Manage notes with block-level references and offline-first storage.', 'windows,macos,linux,android,ios', 'AGPL-3.0', 'notes,markdown,knowledge,offline'],
  ]),
  ...group('media', [
    ['obsproject/obs-studio', 'OBS Studio', 'Record your screen and stream with a studio that grows with you.', 'windows,macos,linux', 'GPL-2.0', 'video,streaming,recording,creative', 'app', true],
    ['videolan/vlc', 'VLC', 'Play almost any video or audio file with a versatile media player.', 'windows,macos,linux,android,ios', 'GPL-2.0', 'video,audio,player,media'],
    ['mpv-player/mpv', 'mpv', 'A minimal, highly configurable player for video and audio.', 'windows,macos,linux', 'Other', 'video,audio,player,media'],
    ['audacity/audacity', 'Audacity', 'Audacity brings recording, audio editing, and mixing to your desktop.', 'windows,macos,linux', 'GPL-3.0', 'audio,music,editing,creative'],
    ['blender/blender', 'Blender', 'Create 3D models, animations, renders, and visual effects.', 'windows,macos,linux', 'GPL-3.0', '3d,animation,design,creative'],
    ['KDE/krita', 'Krita', 'Paint and illustrate with professional digital art tools.', 'windows,macos,linux,android', 'GPL-3.0', 'drawing,painting,design,creative'],
    ['GNOME/gimp', 'GIMP', 'Edit photos and create graphics with a flexible image editor.', 'windows,macos,linux', 'GPL-3.0', 'photo,image,editing,creative'],
    ['jellyfin/jellyfin', 'Jellyfin', 'Organize and stream your own movies, shows, and music.', 'web,windows,macos,linux', 'GPL-2.0', 'video,music,self-hosted,streaming'],
    ['immich-app/immich', 'Immich', 'Back up and explore your photos with a self-hosted photo library.', 'web,android,ios', 'AGPL-3.0', 'photo,backup,self-hosted,gallery', 'app', true],
    ['HandBrake/HandBrake', 'HandBrake', 'Convert videos to modern formats with an approachable transcoder.', 'windows,macos,linux', 'GPL-2.0', 'video,encoding,media'],
    ['mltframework/shotcut', 'Shotcut', 'Edit videos with a cross-platform editor and broad format support.', 'windows,macos,linux', 'GPL-3.0', 'video,editing,creative'],
    ['yt-dlp/yt-dlp', 'yt-dlp', 'Download supported online video and audio from the command line.', 'windows,macos,linux', 'Unlicense', 'video,audio,download,terminal', 'tool'],
    ['navidrome/navidrome', 'Navidrome', 'Stream your personal music collection from a self-hosted server.', 'web', 'GPL-3.0', 'music,audio,self-hosted,streaming'],
  ]),
  ...group('cli-tools', [
    ['junegunn/fzf', 'fzf', 'Find files, commands, and history with a fast fuzzy finder.', 'windows,macos,linux', 'MIT', 'terminal,search,shell,development', 'tool'],
    ['starship/starship', 'Starship', 'A fast, customizable prompt for almost any shell.', 'windows,macos,linux', 'ISC', 'terminal,shell,prompt,development', 'tool'],
    ['BurntSushi/ripgrep', 'ripgrep', 'Search code and files with an exceptionally fast text search tool.', 'windows,macos,linux', 'Other', 'terminal,search,development', 'tool'],
    ['sharkdp/bat', 'bat', 'Read files with syntax highlighting and Git integration in your terminal.', 'windows,macos,linux', 'Other', 'terminal,files,development', 'tool'],
    ['sharkdp/fd', 'fd', 'Find files with a fast, friendly command-line search tool.', 'windows,macos,linux', 'Other', 'terminal,search,files', 'tool'],
    ['eza-community/eza', 'eza', 'List files with useful metadata, color, and Git status.', 'windows,macos,linux', 'Other', 'terminal,files,shell', 'tool'],
    ['ajeetdsouza/zoxide', 'zoxide', 'Jump to your most-used directories with a smarter cd command.', 'windows,macos,linux', 'MIT', 'terminal,shell,files', 'tool'],
    ['cli/cli', 'GitHub CLI', 'Work with issues, pull requests, and repositories from your terminal.', 'windows,macos,linux', 'MIT', 'terminal,github,git,development', 'tool'],
    ['charmbracelet/gum', 'Gum', 'Build interactive shell scripts with polished terminal components.', 'windows,macos,linux', 'MIT', 'terminal,shell,scripting', 'tool'],
    ['nushell/nushell', 'Nushell', 'Work with structured data in a modern, programmable shell.', 'windows,macos,linux', 'MIT', 'terminal,shell,data', 'tool'],
    ['astral-sh/uv', 'uv', 'Manage Python packages and environments with a fast unified tool.', 'windows,macos,linux', 'Other', 'python,packages,development,terminal', 'tool'],
    ['astral-sh/ruff', 'Ruff', 'Lint and format Python code with a fast, comprehensive toolchain.', 'windows,macos,linux', 'MIT', 'python,lint,format,development', 'tool'],
  ]),
  ...group('utilities', [
    ['microsoft/PowerToys', 'PowerToys', 'Give Windows a practical upgrade with everyday utilities.', 'windows', 'MIT', 'windows,launcher,files,desktop', 'app', true],
    ['ShareX/ShareX', 'ShareX', 'Capture, annotate, and share your screen with flexible workflows.', 'windows', 'GPL-3.0', 'screenshot,recording,sharing,desktop'],
    ['syncthing/syncthing', 'Syncthing', 'Sync files directly between devices without a central cloud.', 'windows,macos,linux', 'MPL-2.0', 'files,sync,privacy,backup'],
    ['localsend/localsend', 'LocalSend', 'Share files between nearby devices over your local network.', 'windows,macos,linux,android,ios', 'Apache-2.0', 'files,sharing,local,privacy', 'app', true],
    ['rustdesk/rustdesk', 'RustDesk', 'Connect to your computers with a self-hostable remote desktop.', 'windows,macos,linux,android,ios', 'AGPL-3.0', 'remote-desktop,self-hosted,desktop'],
    ['rclone/rclone', 'rclone', 'Copy, sync, and manage files across cloud storage services.', 'windows,macos,linux', 'MIT', 'files,cloud,sync,backup', 'tool'],
    ['restic/restic', 'restic', 'Back up files with encrypted, deduplicated snapshots.', 'windows,macos,linux', 'BSD-2-Clause', 'backup,files,encryption', 'tool'],
    ['ventoy/Ventoy', 'Ventoy', 'Create a bootable USB drive that holds multiple operating system images.', 'windows,linux', 'GPL-3.0', 'usb,boot,operating-system'],
    ['hluk/CopyQ', 'CopyQ', 'Keep clipboard history with a customizable desktop manager.', 'windows,macos,linux', 'GPL-3.0', 'clipboard,desktop,automation'],
    ['LizardByte/Sunshine', 'Sunshine', 'Stream your desktop and games to compatible remote clients.', 'windows,macos,linux', 'GPL-3.0', 'streaming,desktop,gaming'],
  ]),
  ...group('security', [
    ['bitwarden/clients', 'Bitwarden', 'Keep passwords and credentials organized across your devices.', 'windows,macos,linux,web,android,ios', 'Other', 'password-manager,security,privacy', 'app', true],
    ['keepassxreboot/keepassxc', 'KeePassXC', 'Manage passwords in an encrypted, offline-first database.', 'windows,macos,linux', 'Other', 'password-manager,encryption,offline,privacy'],
    ['ente-io/ente', 'Ente', 'Store photos and authentication codes with end-to-end encryption.', 'windows,macos,linux,web,android,ios', 'AGPL-3.0', 'photo,encryption,privacy,backup'],
    ['cryptomator/cryptomator', 'Cryptomator', 'Encrypt your files before they reach cloud storage.', 'windows,macos,linux', 'GPL-3.0', 'encryption,files,cloud,privacy'],
    ['ProtonVPN/android-app', 'Proton VPN for Android', 'Connect to Proton VPN with its open-source Android client.', 'android', 'GPL-3.0', 'vpn,privacy,network'],
    ['tailscale/tailscale', 'Tailscale', 'Connect your devices through a private network built on WireGuard.', 'windows,macos,linux,android,ios', 'BSD-3-Clause', 'vpn,network,remote-access', 'tool'],
    ['AdguardTeam/AdGuardHome', 'AdGuard Home', 'Filter ads and trackers across your network with a self-hosted DNS server.', 'windows,macos,linux', 'GPL-3.0', 'dns,privacy,network,self-hosted'],
    ['pi-hole/pi-hole', 'Pi-hole', 'Block ads at the network level with a configurable DNS sinkhole.', 'linux', 'Other', 'dns,privacy,network,self-hosted'],
  ]),
  ...group('communication', [
    ['signalapp/Signal-Desktop', 'Signal', 'Stay in touch with private, end-to-end encrypted messaging.', 'windows,macos,linux', 'AGPL-3.0', 'chat,messaging,privacy,encryption'],
    ['element-hq/element-web', 'Element', 'Chat and collaborate on the decentralized Matrix network.', 'web', 'AGPL-3.0', 'chat,matrix,team,collaboration'],
    ['zulip/zulip', 'Zulip', 'Keep team conversations organized with topic-based messaging.', 'web', 'Apache-2.0', 'chat,team,collaboration,self-hosted'],
    ['mattermost/mattermost', 'Mattermost', 'Bring team messaging and collaboration to your own infrastructure.', 'web', 'Other', 'chat,team,collaboration,self-hosted'],
    ['jitsi/jitsi-meet', 'Jitsi Meet', 'Start and host video meetings through your browser.', 'web', 'Apache-2.0', 'video,meetings,team,self-hosted'],
    ['chatwoot/chatwoot', 'Chatwoot', 'Manage customer conversations across multiple support channels.', 'web', 'Other', 'chat,support,team,saas'],
  ]),
  ...group('finance', [
    ['actualbudget/actual', 'Actual Budget', 'Take control of your finances with a local-first budgeting app.', 'web,windows,macos,linux', 'MIT', 'budget,finance,money,local-first', 'app', true],
    ['firefly-iii/firefly-iii', 'Firefly III', 'Track accounts, transactions, and expenses in your own finance manager.', 'web', 'AGPL-3.0', 'budget,finance,money,self-hosted'],
    ['ghostfolio/ghostfolio', 'Ghostfolio', 'Track your investment portfolio with a self-hosted dashboard.', 'web', 'AGPL-3.0', 'finance,investing,portfolio,self-hosted'],
    ['beancount/beancount', 'Beancount', 'Manage finances with a double-entry, plain-text accounting system.', 'windows,macos,linux', 'GPL-2.0', 'finance,accounting,terminal', 'tool'],
    ['frappe/erpnext', 'ERPNext', 'Manage accounting, inventory, and business operations in one platform.', 'web', 'GPL-3.0', 'finance,accounting,business,erp'],
  ]),
  ...group('android', [
    ['florisboard/florisboard', 'FlorisBoard', 'Customize your Android keyboard with privacy-focused typing tools.', 'android', 'Apache-2.0', 'keyboard,mobile,privacy'],
    ['FossifyOrg/Gallery', 'Fossify Gallery', 'Browse and organize photos with a private Android gallery.', 'android', 'GPL-3.0', 'photo,gallery,mobile,privacy'],
    ['FossifyOrg/File-Manager', 'Fossify File Manager', 'Manage files on Android with a straightforward file browser.', 'android', 'GPL-3.0', 'files,mobile,privacy'],
    ['AntennaPod/AntennaPod', 'AntennaPod', 'Discover, subscribe to, and listen to podcasts on Android.', 'android', 'GPL-3.0', 'podcast,audio,mobile'],
    ['Kunzisoft/KeePassDX', 'KeePassDX', 'Access encrypted KeePass password databases on Android.', 'android', 'GPL-3.0', 'password-manager,mobile,privacy'],
    ['flutter/flutter', 'Flutter', 'Build mobile, desktop, and web apps from a single codebase.', 'windows,macos,linux,android,ios,web', 'BSD-3-Clause', 'mobile,flutter,dart,frontend', 'framework'],
    ['expo/expo', 'Expo', 'Build and ship React Native apps with an integrated mobile toolkit.', 'android,ios,web', 'MIT', 'mobile,react-native,typescript,frontend', 'framework'],
  ]),
  ...group('games', [
    ['godotengine/godot', 'Godot', 'Build 2D and 3D games with a flexible, community-driven game engine.', 'windows,macos,linux', 'MIT', 'games,game-engine,3d,creative', 'tool', true],
    ['minetest/minetest', 'Luanti', 'Explore and create voxel worlds with a moddable sandbox platform.', 'windows,macos,linux,android', 'LGPL-3.0', 'games,voxel,sandbox'],
    ['openttd/openttd', 'OpenTTD', 'Build a transport empire in a community-maintained simulation game.', 'windows,macos,linux', 'GPL-2.0', 'games,simulation,strategy'],
    ['wesnoth/wesnoth', 'Battle for Wesnoth', 'Explore a fantasy world through turn-based strategy campaigns.', 'windows,macos,linux', 'GPL-2.0', 'games,strategy,fantasy'],
    ['0ad/0ad', '0 A.D.', 'Build civilizations in a real-time strategy game set in the ancient world.', 'windows,macos,linux', 'GPL-2.0', 'games,strategy,history'],
    ['SuperTuxKart/stk-code', 'SuperTuxKart', 'Race through imaginative tracks in a playful 3D kart racer.', 'windows,macos,linux,android', 'GPL-3.0', 'games,racing,3d'],
  ]),
  ...group('desktop', [
    ['nextcloud/desktop', 'Nextcloud Desktop', 'Sync files with your own Nextcloud server.', 'windows,macos,linux', 'GPL-2.0', 'files,sync,self-hosted,desktop'],
    ['thunderbird/thunderbird-desktop', 'Thunderbird', 'Bring email, calendars, and contacts into a customizable desktop client.', 'windows,macos,linux', 'MPL-2.0', 'email,calendar,desktop'],
    ['ONLYOFFICE/DesktopEditors', 'ONLYOFFICE', 'Work with documents, spreadsheets, and presentations on your desktop.', 'windows,macos,linux', 'AGPL-3.0', 'office,documents,spreadsheet,desktop'],
    ['tauri-apps/tauri', 'Tauri', 'Create small, fast desktop apps with a web interface and Rust backend.', 'windows,macos,linux,android,ios', 'Other', 'desktop,rust,web,mobile', 'framework'],
    ['electron/electron', 'Electron', 'Build cross-platform desktop apps with JavaScript, HTML, and CSS.', 'windows,macos,linux', 'MIT', 'desktop,javascript,web', 'framework'],
  ]),
  ...group('utilities', [
    ['moby/moby', 'Moby', 'The container toolkit behind Docker for packaging and running applications.', 'linux,windows', 'Apache-2.0', 'docker,containers,devops,self-hosted', 'tool'],
    ['coollabsio/coolify', 'Coolify', 'Deploy applications and databases to your own servers.', 'web,linux', 'Apache-2.0', 'deploy,hosting,self-hosted,docker,saas', 'tool'],
    ['louislam/uptime-kuma', 'Uptime Kuma', 'Monitor services and get notified when something goes down.', 'web', 'MIT', 'monitoring,self-hosted,devops', 'app', true],
    ['traefik/traefik', 'Traefik', 'Route traffic to your services with an automatic reverse proxy.', 'windows,macos,linux', 'MIT', 'network,proxy,docker,devops', 'tool'],
    ['home-assistant/core', 'Home Assistant', 'Connect and automate your smart home with local control.', 'web,linux', 'Apache-2.0', 'automation,smart-home,self-hosted'],
    ['nocodb/nocodb', 'NocoDB', 'Turn your database into a collaborative spreadsheet-style workspace.', 'web', 'Other', 'database,spreadsheet,no-code,backend'],
    ['n8n-io/n8n', 'n8n', 'Connect services and automate tasks with visual workflows.', 'web', 'Other', 'automation,workflow,integrations,ai', 'tool'],
  ]),
  ...group('developer-tools', [
    ['sindresorhus/awesome', 'Awesome', 'Explore community-maintained lists of tools, libraries, and learning resources.', 'web', 'Other', 'awesome,resources,learning,development', 'resource'],
    ['JoasASantos/REA-Prompts', 'REA Investigation Prompts', 'Evidence-focused investigation prompts for understanding software and planning original implementations.', 'web', 'MIT', 'reverse-engineering,investigation,prompts,resources,architecture', 'resource'],
    ['AIshihzong/awesome-reverse-engineer-anything', 'Awesome Reverse Engineer Anything', 'A curated directory of reverse-engineering tools, research, integrations, and reconstruction case studies.', 'web', 'CC0-1.0', 'reverse-engineering,resources,learning,architecture', 'resource'],
    ['awesome-selfhosted/awesome-selfhosted', 'Awesome Self-Hosted', 'Find software you can host yourself, organized by what it does.', 'web', 'Other', 'awesome,self-hosted,resources', 'resource'],
    ['public-apis/public-apis', 'Public APIs', 'Discover public APIs for your next application or experiment.', 'web', 'MIT', 'api,resources,development', 'resource'],
    ['kamranahmedse/developer-roadmap', 'Developer Roadmaps', 'Follow community-created learning paths for development skills.', 'web', 'Other', 'learning,roadmap,resources,development', 'resource'],
    ['freeCodeCamp/freeCodeCamp', 'freeCodeCamp', 'Learn programming through an open curriculum and hands-on projects.', 'web', 'BSD-3-Clause', 'learning,programming,resources,web', 'resource'],
  ]),
];

export function sourceToApp(source: AppSource): App {
  const [owner, repo] = source.repo.split('/');
  const avatar = `https://github.com/${owner}.png?size=96`;
  return {
    id: source.repo.toLowerCase(), slug: repo, name: source.name,
    shortDescription: source.description, logo: avatar,
    maintainer: { name: owner, username: owner, avatar, githubUrl: `https://github.com/${owner}` },
    stats: { stars: 0, forks: 0, watchers: 0, openIssues: 0 },
    category: source.category, platforms: source.platforms, license: source.license,
    lastUpdated: '', isFeatured: source.featured, topics: source.topics,
    repoUrl: `https://github.com/${source.repo}`, kind: source.kind, dataSource: 'catalog',
  };
}
export function getAppConfigs(limit?: number, featuredOnly = false): AppSource[] {
  const apps = featuredOnly ? CURATED_APPS.filter(app => app.featured) : CURATED_APPS;
  return limit === undefined ? apps : apps.slice(0, Math.max(0, limit));
}
export function getAppRepositories(limit?: number, featuredOnly = false): string[] {
  return getAppConfigs(limit, featuredOnly).map(app => app.repo);
}
export const INITIAL_APPS = getAppRepositories();
