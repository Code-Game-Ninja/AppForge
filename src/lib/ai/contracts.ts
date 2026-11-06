import type { App } from '@/types';

export const WORKFLOWS = ['explain', 'setup', 'trace', 'rebuild', 'recommend'] as const;
export type AIWorkflow = typeof WORKFLOWS[number];
export interface AIRequest { workflow: AIWorkflow; repository: string; description: string; question: string; cursor?: string }
export interface ProjectSearchPlan { disposition: 'search' | 'needs_clarification' | 'refused'; queries: string[]; question: string }
export interface ProjectSearchCoverage {
  queries: { query: string; url: string; totalCount: number | null; incomplete: boolean }[];
  nextCursor: string | null;
  batch: number;
  fetched: number;
  aiCompared: boolean;
  warnings: string[];
}
export interface EvidenceSource {
  id: string;
  label: string;
  url: string;
  text: string;
  kind: 'repository' | 'file' | 'catalog' | 'github-search';
  path?: string;
  startLine?: number;
  endLine?: number;
}
export interface RepositoryEvidence {
  repository: string;
  commit: string | null;
  sources: EvidenceSource[];
  notes: string[];
  filesInspected: number;
}
export const SECTION_IDS = ['overview', 'capabilities', 'setup', 'architecture', 'trace', 'blueprint', 'validation', 'limitations'] as const;
export type AISectionId = typeof SECTION_IDS[number];
export interface AIReport {
  disposition: 'answered' | 'needs_clarification' | 'refused';
  title: string;
  summary: string;
  sections: {
    id: AISectionId;
    heading: string;
    items: { text: string; certainty: 'documented' | 'inferred' | 'unknown'; sourceIds: string[] }[];
  }[];
  recommendations: { repo: string; reason: string; tradeoff: string; sourceIds: string[] }[];
  nextQuestion: string;
}
export interface AIResult {
  report: AIReport;
  sources: Omit<EvidenceSource, 'text'>[];
  projects: App[];
  matches?: App[];
  search?: ProjectSearchCoverage;
  coverage: { repository: string | null; commit: string | null; filesInspected: number; notes: string[] };
}

export class AIError extends Error {
  constructor(public code: string, message: string, public status = 400, public retryAfter?: number) { super(message); this.name = 'AIError'; }
}

const string = { type: 'string' };
const array = (items: object) => ({ type: 'array', items });
const object = (properties: Record<string, object>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

export function reportSchema(sourceIds: string[], repositories: string[]) {
  const citations = { ...array(sourceIds.length ? { type: 'string', enum: sourceIds } : string), ...(sourceIds.length ? {} : { maxItems: 0 }) };
  return object({
    disposition: { type: 'string', enum: ['answered', 'needs_clarification', 'refused'] },
    title: string,
    summary: string,
    sections: array(object({
      id: { type: 'string', enum: SECTION_IDS },
      heading: string,
      items: array(object({ text: string, certainty: { type: 'string', enum: ['documented', 'inferred', 'unknown'] }, sourceIds: citations })),
    })),
    recommendations: { ...array(object({ repo: repositories.length ? { type: 'string', enum: repositories } : string, reason: string, tradeoff: string, sourceIds: citations })), ...(repositories.length ? {} : { maxItems: 0 }) },
    nextQuestion: string,
  });
}
