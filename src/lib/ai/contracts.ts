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

export function reportSchema(sourceIds: string[], repositories: string[], workflow: AIWorkflow = 'explain') {
  const sectionIds = workflow === 'recommend' ? ['overview', 'limitations'] : SECTION_IDS;
  const citations = { ...array(sourceIds.length ? { type: 'string', enum: sourceIds } : string), maxItems: sourceIds.length ? 12 : 0 };
  return object({
    disposition: { type: 'string', enum: ['answered', 'needs_clarification', 'refused'] },
    title: { ...string, minLength: 1, maxLength: 140, description: 'Required non-empty report title, including for refusals and clarification requests.' },
    summary: { ...string, minLength: 1, maxLength: 2200, description: 'Required non-empty summary. For refusals or clarification requests, explain why here.' },
    sections: { ...array(object({
      id: { type: 'string', enum: sectionIds, description: 'Unique section ID. Each ID may appear at most once across the sections array; merge related items.' },
      heading: { ...string, maxLength: 120 },
      items: { ...array(object({ text: { ...string, maxLength: 1800 }, certainty: { type: 'string', enum: ['documented', 'inferred', 'unknown'] }, sourceIds: citations })), maxItems: 10 },
    })), maxItems: sectionIds.length },
    recommendations: { ...array(object({ repo: repositories.length ? { type: 'string', enum: repositories } : string, reason: { ...string, maxLength: 1000 }, tradeoff: { ...string, maxLength: 700 }, sourceIds: citations })), maxItems: repositories.length ? 6 : 0 },
    nextQuestion: { ...string, maxLength: 400 },
  });
}
