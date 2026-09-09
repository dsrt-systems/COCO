import { prefixedId } from '@coco/common';
import type { DecisionInput } from '@coco/protocol';
import type { ContextEnv } from '../env.js';

export async function recordDecision(env: ContextEnv, input: DecisionInput) {
  const decisionId = prefixedId('decision');

  // Auto-increment decision_number per project
  let decisionNumber = 1;
  if (input.project_id) {
    const { data } = await env.supabase
      .schema('agents')
      .from('decisions')
      .select('decision_number')
      .eq('project_id', input.project_id)
      .order('decision_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) decisionNumber = data.decision_number + 1;
  }

  const row = {
    decision_id: decisionId,
    organization_id: env.organizationId,
    project_id: input.project_id ?? null,
    mission_id: input.mission_id ?? null,
    run_id: input.run_id ?? null,
    decision_number: decisionNumber,
    question: input.question,
    options: input.options,
    selected_option: input.selected_option,
    evidence: input.evidence,
    assumptions: input.assumptions,
    risks: input.risks,
    reasoning: input.reasoning,
    confidence: input.confidence,
    reversible: input.reversible,
    revisit_criteria: input.revisit_criteria ?? null,
    status: 'active',
    created_by_agent: input.created_by_agent,
  };

  const { data: inserted, error } = await env.supabase
    .schema('agents')
    .from('decisions')
    .insert(row)
    .select('*')
    .single();

  if (error) throw new Error(`Decision recording failed: ${error.message}`);
  return inserted;
}
