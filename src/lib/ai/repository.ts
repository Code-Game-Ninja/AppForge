import 'server-only';
import { AIError } from './contracts';
import type { AIRequest, EvidenceSource, RepositoryEvidence } from './contracts';
import { parseRepository, safeSourcePath, sanitizeEvidence } from './security';
import { readLimitedJson } from './http';

interface TreeEntry { path: string; type: string; sha: string; size?: number }
const shaPattern = /^[a-f0-9]{40,64}$/i;
const MAX_FILES = 6;
const MAX_CONTEXT = 38_000;

async function github(path: string, limit = 400_000): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token && !token.startsWith('your_')) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try { response = await fetch(`https://api.github.com${path}`, { headers, redirect: 'error', signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } }); }
  catch { throw new AIError('github_unavailable', 'GitHub could not be reached. Check the repository or try again later.', 503); }
  if (response.status === 404) throw new AIError('repository_unavailable', 'This repository is unavailable. Use a public GitHub repository.', 404);
  if (response.status === 403 || response.status === 429) throw new AIError('github_rate_limited', 'GitHub’s request limit was reached. Try again later.', 503);
  if (!response.ok) throw new AIError('github_unavailable', 'GitHub could not return the repository data. Try again later.', 503);
  return readLimitedJson(response, limit);
}

function fileScore(path: string, request: AIRequest): number {
  if (/^(?:readme)(?:\.(?:md|rst|txt))?$/i.test(path)) return 100;
  if (/^(?:package\.json|pyproject\.toml|cargo\.toml|go\.mod|composer\.json|requirements\.txt)$/i.test(path)) return 85;
  if (/^(?:dockerfile|compose\.ya?ml|docker-compose\.ya?ml)$/i.test(path)) return 70;
  let score = /^(?:docs?|documentation)\/.*(?:intro|getting[-_]?started|install|architecture|readme|quickstart)/i.test(path) ? 65 : 0;
  if (/^(?:src\/)?(?:app|main|index|server)\.(?:tsx?|jsx?|py|rs|go)$|^src\/app\/(?:page|layout)\.tsx$|^app\/main\.py$/i.test(path)) score += request.workflow === 'trace' || request.workflow === 'rebuild' ? 70 : 55;
  if (request.workflow === 'trace' || request.workflow === 'rebuild') {
    const terms = `${request.description} ${request.question}`.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length >= 4 && !['this', 'that', 'with', 'from', 'does', 'what', 'want', 'build', 'feature', 'please'].includes(term)).slice(0, 20);
    score += Math.min(60, terms.filter(term => path.toLowerCase().includes(term)).length * 20);
  }
  if (/test|fixture|example|demo/i.test(path)) score -= 15;
  return score;
}

export async function retrieveRepository(request: AIRequest): Promise<RepositoryEvidence> {
  const secrets = [process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '', process.env.GITHUB_TOKEN || ''];
  const { owner, repo, fullName } = parseRepository(request.repository);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const raw = await github(base) as Record<string, unknown>;
  if (raw.private !== false || typeof raw.full_name !== 'string' || raw.full_name.toLowerCase() !== fullName.toLowerCase()) throw new AIError('repository_unavailable', 'Only the public repository you selected can be inspected.', 422);
  const branch = typeof raw.default_branch === 'string' ? raw.default_branch : '';
  const notes: string[] = [];
  let commit: string | null = null;
  if (branch) {
    try {
      const ref = await github(`${base}/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`, 20_000) as { object?: { sha?: string } };
      if (ref.object?.sha && shaPattern.test(ref.object.sha)) commit = ref.object.sha;
    } catch { notes.push('The branch could not be pinned to a commit; the inspected files may change over time.'); }
  }
  const snapshot = commit ?? branch;
  const metadata = sanitizeEvidence(JSON.stringify({
    name: raw.full_name, description: raw.description, topics: raw.topics,
    language: raw.language, license: raw.license, stars: raw.stargazers_count,
    archived: raw.archived, lastSourcePush: raw.pushed_at, defaultBranch: branch,
  }), secrets);
  const sources: EvidenceSource[] = [{ id: 'repo', label: 'GitHub repository metadata', url: `https://github.com/${fullName}`, text: metadata.text, kind: 'repository' }];
  let entries: TreeEntry[] = [];
  if (snapshot) {
    try {
      const tree = await github(`${base}/git/trees/${encodeURIComponent(snapshot)}?recursive=1`, 1_500_000) as { tree?: TreeEntry[]; truncated?: boolean };
      if (Array.isArray(tree.tree)) entries = tree.tree.slice(0, 20_000);
      if (tree.truncated || (tree.tree?.length ?? 0) > 20_000) notes.push('The repository tree is incomplete. File selection covers the available paths only.');
    } catch {
      notes.push('The full file tree was unavailable; selection is limited to root files.');
      try {
        const root = await github(`${base}/contents?ref=${encodeURIComponent(snapshot)}`);
        if (Array.isArray(root)) entries = root.filter(entry => entry && typeof entry.path === 'string').map(entry => ({ path: entry.path, sha: entry.sha, size: entry.size, type: entry.type === 'file' ? 'blob' : 'tree' }));
      } catch { notes.push('Repository files could not be fetched. The answer can use metadata only.'); }
    }
  }
  const candidates = entries.filter(entry => typeof entry.path === 'string' && entry.type === 'blob' && typeof entry.sha === 'string' && shaPattern.test(entry.sha) && safeSourcePath(entry.path) && (entry.size ?? 0) <= 130_000)
    .map(entry => ({ ...entry, score: fileScore(entry.path, request) })).filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, MAX_FILES);
  let totalChars = metadata.text.length;
  let filesInspected = 0;
  for (const entry of candidates) {
    if (totalChars >= MAX_CONTEXT) break;
    try {
      // Blob content is pinned by SHA. download_url and links inside files are never followed.
      const file = await github(`${base}/git/blobs/${entry.sha}`, 220_000) as { content?: string; encoding?: string };
      if (file.encoding !== 'base64' || typeof file.content !== 'string') { notes.push(`${entry.path} was not readable text.`); continue; }
      const decoded = Buffer.from(file.content, 'base64');
      if (decoded.byteLength > 130_000 || decoded.includes(0)) { notes.push(`${entry.path} was skipped because of size or binary content.`); continue; }
      const cleaned = sanitizeEvidence(decoded.toString('utf8'), secrets);
      if (cleaned.omitted || cleaned.credentialsRedacted) notes.push(`${entry.path}: instruction-like text or credential-shaped strings were omitted.`);
      const lines = cleaned.text.split('\n');
      const remaining = Math.min(12_000, MAX_CONTEXT - totalChars);
      let text = ''; let endLine = 0;
      for (const line of lines) { if (text.length + line.length + 1 > remaining || endLine >= 450) break; text += `${line}\n`; endLine++; }
      if (!endLine) { notes.push(`${entry.path} had no usable excerpt.`); continue; }
      if (endLine < lines.length) notes.push(`${entry.path}: only the first ${endLine} lines were included.`);
      filesInspected++;
      totalChars += text.length;
      sources.push({ id: `file${filesInspected}`, label: entry.path, path: entry.path, kind: 'file', text, startLine: 1, endLine, url: `https://github.com/${fullName}/blob/${encodeURIComponent(snapshot)}/${entry.path.split('/').map(encodeURIComponent).join('/')}#L1-L${endLine}` });
    } catch { notes.push(`${entry.path} could not be read.`); }
  }
  if (!filesInspected) notes.push('No source files were inspected. Setup and feature behavior cannot be established from metadata alone.');
  notes.push('This is a bounded source review, not a full code audit or a runtime test.');
  return { repository: fullName, commit, sources, notes: Array.from(new Set(notes)), filesInspected };
}
