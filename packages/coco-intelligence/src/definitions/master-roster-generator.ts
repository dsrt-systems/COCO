import type { AgentDefinitionContract, AgentTier, ToolScope } from '@coco/protocol';

export interface BranchSpecialistSpec {
  code: string;           // e.g. "C1"
  id: string;             // e.g. "C1_eng_python_architect"
  name: string;           // e.g. "Python Systems Architect"
  branchNumber: number;   // 1 to 10
  branchName: string;     // e.g. "Software & Systems Engineering"
  directorId: string;     // e.g. "B1_engineering_director"
  thesis: string;
  framework: string;
  steps: string[];
  tools?: { tool_id: string; scope: ToolScope }[];
  criticId?: string;
  mustRules?: string[];
  mustNotRules?: string[];
}

export function buildSpecialistContract(spec: BranchSpecialistSpec): AgentDefinitionContract {
  const criticId = spec.criticId ?? `${spec.id}_critic`;

  return {
    agent_id: spec.id,
    name: spec.name,
    version: '1.0.0',
    tier: 'tier_3_specialist' as AgentTier,
    domain: spec.branchName,
    reports_to: spec.directorId,
    expert_beating_thesis: spec.thesis,
    model_profile: {
      reasoning_model: 'anthropic/claude-3-5-sonnet@20241022',
      fallback_models: ['openai/gpt-4o', 'deepseek/deepseek-r1@latest'],
      temperature: 0.1,
      max_context_tokens: 128000,
    },
    knowledge_sources: [`corpus_${spec.branchName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`],
    tool_suite: (spec.tools ?? []).map((t) => ({
      tool_id: t.tool_id,
      scope: t.scope,
      is_required: true,
    })),
    system_prompt_template: `You are ${spec.code} ${spec.name}, a world-class specialist in ${spec.branchName}. ${spec.thesis}`,
    methodology_framework: spec.framework,
    methodology_steps: spec.steps,
    constraints: {
      must_rules: spec.mustRules ?? ['Attach evidence for every assertion', 'Follow strict domain methodology'],
      must_not_rules: spec.mustNotRules ?? ['Never fabricate citations or sources', 'Never skip verification gates'],
      requires_human_approval: [],
    },
    critic_agent_id: criticId,
    evaluation_rubric: {
      metrics: { domain_accuracy: 0.95, methodology_adherence: 0.90 },
      rejection_threshold: 0.88,
    },
    allowed_memory_scopes: ['working', 'project', 'semantic', 'episodic'],
    is_dynamic: false,
  };
}

export function buildCriticContract(spec: BranchSpecialistSpec): AgentDefinitionContract {
  const criticId = spec.criticId ?? `${spec.id}_critic`;

  return {
    agent_id: criticId,
    name: `Adversarial Critic (${spec.name})`,
    version: '1.0.0',
    tier: 'tier_3_specialist' as AgentTier,
    domain: spec.branchName,
    reports_to: spec.directorId,
    expert_beating_thesis: `Paired adversarial reviewer for ${spec.name}. Attacks claims, verifies citations, and enforces L9 verification.`,
    model_profile: {
      reasoning_model: 'anthropic/claude-3-5-sonnet@20241022',
      fallback_models: ['deepseek/deepseek-r1@latest'],
      temperature: 0.0,
      max_context_tokens: 128000,
    },
    knowledge_sources: [`corpus_${spec.branchName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`],
    tool_suite: [],
    system_prompt_template: `You are the paired adversarial critic for ${spec.name}. Attack logic, verify citations, and find edge-case failures.`,
    methodology_framework: 'Adversarial Review & L9 Verification',
    methodology_steps: [
      'Extract all factual claims and proofs',
      'Re-verify citations against domain sources',
      'Execute domain attack patterns',
      'Emit CriticReport with ACCEPT, REVISE, or REJECT',
    ],
    constraints: {
      must_rules: ['Provide concrete root-cause diagnosis for every rejection'],
      must_not_rules: ['Never give soft passes on unevidenced claims'],
      requires_human_approval: [],
    },
    critic_agent_id: null,
    evaluation_rubric: {
      metrics: { critical_rigor: 0.95, false_positive_rate: 0.05 },
      rejection_threshold: 0.90,
    },
    allowed_memory_scopes: ['project', 'episodic'],
    is_dynamic: false,
  };
}
