import 'server-only';
import { createHash } from 'node:crypto';
import type { AIRequest, AIResult, EvidenceSource } from './contracts';
import { retrieveRepository } from './repository';
import { generateReport, providerConfiguration } from './provider';
import { AILimits } from './limits';
import { AI_POLICY_VERSION } from './policy';
import { recommendProjects } from './recommendation';

const configuredLimit = Number(process.env.AI_HOURLY_REQUEST_LIMIT || 60);
export const aiLimits = new AILimits(Number.isFinite(configuredLimit) ? Math.max(1, Math.min(1000, configuredLimit)) : 60);
const publicReports = new Map<string, { result: AIResult; expires: number }>();
const pendingReports = new Map<string, Promise<AIResult>>();

export async function analyze(request: AIRequest): Promise<AIResult> {
  if (request.workflow === 'recommend') {
    const release = aiLimits.acquire();
    try { return await recommendProjects(request); } finally { release(); }
  }
  const config = providerConfiguration();
  const release = aiLimits.acquire();
  try {
    const evidence = await retrieveRepository(request);
    const sources: EvidenceSource[] = [...(evidence?.sources ?? [])];
    const candidates: { repo: string; sourceId: string }[] = [];
    // Only public, generic repository reports are shared. Personal descriptions
    // and follow-up questions are never cached or reused across people.
    const cacheable = evidence?.commit && !request.description && !request.question;
    const key = cacheable ? createHash('sha256').update(JSON.stringify([AI_POLICY_VERSION, config.provider, config.format, config.endpoint, config.model, config.transport, config.reasoningEffort, config.serviceTier, request.workflow, request.repository.toLowerCase(), evidence.commit, evidence.sources.map(source => source.text)])).digest('hex') : '';
    if (key) {
      const cached = publicReports.get(key);
      if (cached && cached.expires > Date.now()) return cached.result;
      const pending = pendingReports.get(key);
      if (pending) return await pending;
    }
    const operation = (async () => {
      const report = await generateReport(request, sources, candidates);
      const result: AIResult = {
        report, sources: sources.map(source => ({ id: source.id, label: source.label, url: source.url, kind: source.kind, path: source.path, startLine: source.startLine, endLine: source.endLine })),
        projects: [],
        coverage: { repository: evidence?.repository ?? null, commit: evidence?.commit ?? null, filesInspected: evidence?.filesInspected ?? 0, notes: evidence?.notes ?? ['Suggestions use curated project information. Review source documentation for current requirements.'] },
      };
      if (key) {
        if (publicReports.size >= 30) publicReports.delete(publicReports.keys().next().value!);
        publicReports.set(key, { result, expires: Date.now() + 900_000 });
      }
      return result;
    })();
    if (key) pendingReports.set(key, operation);
    try { return await operation; } finally { if (key) pendingReports.delete(key); }
  } finally { release(); }
}
