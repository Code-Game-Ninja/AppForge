import { AIWorkspace } from '@/components/ai/AIWorkspace';
import { WORKFLOWS } from '@/lib/ai/contracts';
import type { AIWorkflow } from '@/lib/ai/contracts';

export const metadata = { title: 'AI repository assistant', description: 'Understand public repositories, trace features, plan original implementations, and find projects for your idea.' };
export default function AssistantPage({ searchParams }: { searchParams: { repo?: string; workflow?: string; auto?: string } }) {
  const workflow = WORKFLOWS.includes(searchParams.workflow as AIWorkflow) ? searchParams.workflow as AIWorkflow : 'explain';
  return <AIWorkspace key={`${searchParams.repo ?? ''}:${workflow}:${searchParams.auto ?? ''}`} initialRepository={(searchParams.repo ?? '').slice(0, 300)} initialWorkflow={workflow} autoAnalyze={searchParams.auto === '1'} />;
}
