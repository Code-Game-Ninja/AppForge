# AppForge

A discovery workspace for useful apps, popular repositories, frameworks, and developer tools. Built with Next.js 14, React, TypeScript, and Tailwind CSS.

## What you can do

- Explore 132 curated projects across 13 categories, with original repository links.
- Search names, descriptions, topics, and repositories; GitHub search expands the catalog with up to 100 results per request.
- Filter by category, platform, project type, and license. Sort by recommendations, stars, source updates, or name.
- Save projects to a browser-local library. Saved categories and topics inform recommendations.
- Browse six curated collections and five starter stacks for web apps, AI assistants, mobile apps, self-hosted services, and games.
- Read project documentation, choose release packages by platform, and open official project websites.
- Switch between grid/list views and light/dark themes. Use Ctrl+K or / to focus search.
- Explore a responsive glass interface with softly raised controls, shadcn/ui menus and forms, and React Bits gradient headings and spotlight cards. Animations respect reduced-motion preferences.
- Ask AI to explain a public GitHub repository, describe its capabilities, or outline documented setup.
- Trace a feature through inspected source excerpts and create an original rebuild blueprint with milestones and acceptance tests.
- Search a topic such as “AI tools” or describe your idea to discover public GitHub projects with AI comparisons, reasons, and tradeoffs.
- Browse all fetched repository matches, save discoveries, and load more GitHub search batches.
- Review citations, commit snapshots, and inspection limits; copy or download research briefs as Markdown.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell, use `npm.cmd` if your execution policy blocks `npm.ps1`.

An optional server-side `GITHUB_TOKEN` environment variable increases GitHub's API limits. Never use a `NEXT_PUBLIC_` variable for this token. Public browsing works without a token.

```sh
npm test
npm run lint
npm run build
npm start
```

Production output goes to `.next-production` so a running development server does not overwrite build artifacts. `npm start` uses the same directory. Set `APPFORGE_DIST_DIR` to override it.

## Interface components

The interface uses locally served Manrope Variable, a navy default theme, and a remembered light theme. Glass surfaces and raised/inset controls live in `src/app/neo-glass.css`. Official shadcn/ui components live in `src/components/ui`, including accessible dropdowns, keyboard-operated tabs, tooltips, and the mobile navigation Sheet. `components.json` configures shadcn and the React Bits registry; adapted React Bits components live in `src/components/react-bits`. Third-party license notices are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Catalog and recommendation behavior

Editorial project metadata lives in `src/lib/data.ts`. Collections, starter stacks, search ranking, and recommendation scoring live in `src/lib/discovery.ts`.

The curated catalog renders immediately without GitHub access. A server API refresh merges GitHub results and a bounded set of featured project metadata, preserving editorial names, categories, and platforms. GitHub requests time out after eight seconds and use Next.js caching. Failed or rate-limited requests leave the curated catalog available and show a retry action.

Star counts and activity dates appear only when supplied by GitHub. Unavailable metadata is not replaced with invented statistics. Popular sorting orders known star counts first; recent sorting uses the last source push. GitHub search is a bounded result set, not a complete inventory of GitHub.

The catalog includes open-source and source-available projects. Projects with custom, mixed, or unclassified licensing display **See license**. Check the linked source license before reuse.

Search ranks exact names and repository matches above incidental description matches. Related recommendations consider topics and categories across multiple results, exclude existing matches, and explain their relevance. GitHub stars break relevance ties. Starter stacks are editorial suggestions with a specific role for every tool.

Saved projects persist in local storage without an account and synchronize between tabs on the same browser. They include project metadata so saved GitHub discoveries remain available after reload. Storage failures are reported in the interface.

## Connect your AI endpoint

Copy `.env.example` to `.env.local` and configure your own service:

```dotenv
AI_PROVIDER=compatible
AI_API_FORMAT=chat
AI_ENDPOINT=https://your-provider.example/v1/chat/completions
AI_MODEL=your-model-id
AI_API_KEY=your-server-side-key
```

Use either `AI_ENDPOINT` for an exact endpoint or `AI_BASE_URL` for a base URL. With a base URL, AppForge adds `/chat/completions` for `chat` and `/responses` for `responses`. The endpoint must support the selected OpenAI-compatible request/response format and strict JSON-schema output. Arbitrary custom JSON protocols require an adapter in `src/lib/ai/provider.ts`.

For a Responses-compatible endpoint, set `AI_API_FORMAT=responses`. For OpenAI itself, set `AI_PROVIDER=openai` and choose an explicit model; its default URL is `https://api.openai.com/v1`. For Ollama, use `AI_PROVIDER=ollama`, `AI_MODEL`, and optionally `AI_BASE_URL=http://127.0.0.1:11434`; no API key is required. Remote providers require HTTPS; local loopback HTTP is supported. Endpoint configuration is controlled by the server operator.

For Agent Router's supported Codex client connection, use these server-only settings alongside `AI_API_KEY` in `.env.local`:

```env
AI_PROVIDER=compatible
AI_PROVIDER_NAME=Agent Router
AI_API_FORMAT=responses
AI_BASE_URL=https://agentrouter.org/v1
AI_MODEL=gpt-6.1-sol
AI_REASONING_EFFORT=high
AI_SERVICE_TIER=fast
AI_TRANSPORT=codex
AI_CODEX_PATH=/absolute/path/to/codex
```

On Windows, `AI_CODEX_PATH` must point to the actual `codex.exe`, rather than an npm `.cmd` wrapper. The server must have **codex-cli 0.166.0-alpha.5.1** installed. This version was verified to expose no model tools with AppForge's configuration; other versions are rejected until their tool behavior is checked. This transport requires a persistent Node server capable of starting the executable. Deployments that cannot run child processes should use `AI_TRANSPORT=http` with a provider that authorizes direct API access.

AppForge starts the official client with a fresh temporary home and working directory, ignores personal Codex configuration, and disables shell, patch, image, web, app, MCP/plugin, hook, memory, and agent access. Trusted instructions and the answer schema are supplied separately from untrusted user/repository input. Credentials reach the client through its isolated environment, never command arguments or model input. Sessions are ephemeral, output is bounded, requests time out after 60 seconds, and temporary files are removed. Responses still pass the same citation, candidate, and secret validation as the HTTP adapter. The assistant does not inherit the operator's Codex tools or workspace permissions.

`AI_SERVICE_TIER=fast` maps to API `priority`; `AI_REASONING_EFFORT=high` selects high reasoning. These settings are also supported by the HTTP Responses adapter, with additional token space for reasoning. Agent Router may reject generic HTTP clients with `unauthorized_client_error` even when a key works in Codex. AppForge distinguishes that client restriction from credential authorization failures and preserves GitHub browsing when AI is unavailable. See [Agent Router's Codex setup](https://github.com/agentrouter-org/docs/blob/main/en/codex.md) and [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Restart the server after configuration changes. The assistant shows an unavailable state until an endpoint, model, and required key are configured. All credentials stay in server environment variables; never prefix them with `NEXT_PUBLIC_` or enter them into a repository question.

The assistant is available at `/assistant`, from Add a repository and repository details. Build finder includes description-based GitHub discovery alongside editorial starter stacks. Follow-up questions start a focused new source review or project search; they do not carry a private chat history.

## Evidence, privacy, and protections

Analysis fetches only public repositories through GitHub's API, rejects redirects, pins a branch to a commit when available, and retrieves up to six selected files by blob SHA. File selection favors documentation, manifests, entry points, and paths related to the requested feature. Each excerpt is limited to 12,000 characters and 450 lines; total repository evidence is bounded to 38,000 characters. Sources may omit large files, excluded paths, and suspicious instruction or credential strings. Reports disclose inspected files and missing evidence.

Descriptions, questions, and selected public evidence are sent to the configured AI service. Project discovery also sends derived keyword queries to GitHub's search API. AppForge does not run repository code, install dependencies, follow source-file URLs, grant the model tools, or send its server credentials as model input. Untrusted evidence stays in user-role content beneath static server instructions. Search plans reject URLs and client-controlled GitHub qualifiers; the server restricts every API query to public, non-archived repositories without forks. Output validation rejects unknown citations, invented project IDs, invalid report shapes, incomplete answers, and recognized credential leaks. Answers render as plain text; only server-generated source links become clickable. These controls reduce prompt injection and jailbreak risk; no model is guaranteed immune. Citations establish provenance, not independent truth.

Project discovery uses AI to plan up to three complementary keyword searches across GitHub's public repository names, descriptions, and README indexes. It fetches 25 results per active query per batch, deduplicates them, and compares up to 60 candidate metadata records with AI. AI picks are limited to actual supplied candidates; all validated matches remain browsable separately. README contents and source code are not inspected during these comparisons. Open an individual project in the assistant for deeper source analysis. If AI inference fails, keyword search and repository browsing remain available. If GitHub fails, the first batch can display an explicitly labeled curated fallback.

Load more reuses the search plan and requests the next available page for each query. Failed query pages are retried instead of skipped. GitHub caps the API at 1,000 results per query; individual query totals overlap and cannot be added into a unique-project count. The interface shows coverage, partial-search warnings, and links to the same GitHub queries. Refine a description to explore narrower areas. Results do not claim complete coverage of GitHub or live verification of a suggested stack. A rebuild blueprint is an implementation plan to review, not a generated runnable project or a promise of exact cloning.

Pagination cursors are signed, bound to the search description, and expire after 30 minutes. Set a server-only `AI_SEARCH_CURSOR_SECRET` with at least 32 random characters consistently across instances for shared pagination; otherwise a process-local random signing key means cursors expire when the server restarts. No arbitrary endpoint or search qualifier can be supplied through a cursor.

Generic public reports may be cached for 15 minutes using the repository revision and evidence. Personal descriptions and questions are not shared through this report cache. Upstream provider data-retention practices depend on your configured service.

Limits default to ten API requests per minute, two concurrent analyses, and 60 analyses per hour, including cached reports and search batches, per server instance. An initial project search can make two model requests (planning and comparison) and up to three GitHub searches; later batches reuse the plan. GitHub has its own search rate limits; an optional server-side `GITHUB_TOKEN` increases the allowance. Set `AI_HOURLY_REQUEST_LIMIT` (1–1000) to adjust the hourly cap. Same-origin checks reduce cross-site browser requests, but the public endpoint is unauthenticated and these checks do not authenticate API clients. For multi-instance or public production deployments, add a shared rate/budget store and access controls as appropriate; in-memory counters reset on restart. Set `APPFORGE_ORIGIN` to the exact public origin when a proxy changes the request origin.

The investigation approach is inspired by REA-Prompts and Awesome Reverse Engineer Anything. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution and license notices.

## Contributing

Add an entry to `CURATED_APPS` with an original repository, display name, useful description, category, known platforms, license, topics, and project type. Run the test suite to check catalog uniqueness, category coverage, collection links, build stack links, search relevance, recommendations, and metadata merging.

MIT licensed. [Source repository](https://github.com/Code-Game-Ninja/Open-Market-).
