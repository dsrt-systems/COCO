import { prefixedId } from '@coco/common';
import type { AgentDefinitionContract } from '@coco/protocol';
import type { AgentRegistry } from '../registry/index.js';

export interface DynamicSpawnParams {
  domain: string;
  objective: string;
  parentDirectorId: string;
  knowledgeSources?: string[];
  requiredTools?: { tool_id: string; scope: 'read_only' | 'workspace_write' | 'compute_exec' | 'sandbox_exec' | 'network_egress' }[];
}

export class DynamicAgentFactory {
  constructor(private readonly registry: AgentRegistry) {}

  /**
   * Compiles and registers an ad-hoc Tier-3 specialist for long-tail domains.
   */
  async spawnSpecialist(params: DynamicSpawnParams): Promise<AgentDefinitionContract> {
    const domainSlug = params.domain.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const agentId = `C999_${domainSlug}_spec`;

    // 1. Check if already compiled
    const existing = await this.registry.get(agentId);
    if (existing) return existing;

    // 2. Build Paired Critic Definition
    const criticId = `C999_${domainSlug}_critic`;
    const criticContract: AgentDefinitionContract = {
      agent_id: criticId,
      name: `Adversarial Critic (${params.domain})`,
      version: '1.0.0',
      tier: 'tier_3_specialist',
      domain: params.domain,
      reports_to: params.parentDirectorId,
      expert_beating_thesis: `Adversarial quality reviewer for ${params.domain}`,
      model_profile: {
        reasoning_model: 'anthropic/claude-3-5-sonnet@20241022',
        fallback_models: ['openai/gpt-4o'],
        temperature: 0.0,
        max_context_tokens: 128000,
      },
      knowledge_sources: params.knowledgeSources ?? [],
      tool_suite: [],
      system_prompt_template: `You are an adversarial reviewer for ${params.domain}. Attack arguments, check citations, and verify logic.`,
      methodology_framework: 'Adversarial Review',
      methodology_steps: ['Extract Claims', 'Verify Proofs', 'Check Counter-arguments', 'Emit Verdict'],
      constraints: {
        must_rules: ['Require evidence for every claim'],
        must_not_rules: ['Do not give soft passes'],
        requires_human_approval: [],
      },
      evaluation_rubric: {
        metrics: { "critical_rigor": 0.90 },
        rejection_threshold: 0.85,
      },
      allowed_memory_scopes: ['project', 'episodic', 'semantic'],
      is_dynamic: true,
    };

    await this.registry.register(criticContract);

    // 3. Construct Specialist Contract
    const specialistContract: AgentDefinitionContract = {
      agent_id: agentId,
      name: `Dynamic Specialist: ${params.domain}`,
      version: '1.0.0',
      tier: 'tier_3_specialist',
      domain: params.domain,
      reports_to: params.parentDirectorId,
      expert_beating_thesis: `Dynamically compiled specialist for ${params.domain} using domain corpus and strict verification.`,
      model_profile: {
        reasoning_model: 'anthropic/claude-3-5-sonnet@20241022',
        fallback_models: ['openai/gpt-4o'],
        temperature: 0.1,
        max_context_tokens: 128000,
      },
      knowledge_sources: params.knowledgeSources ?? [],
      tool_suite: (params.requiredTools ?? []).map((t) => ({
        tool_id: t.tool_id,
        scope: t.scope,
        is_required: true,
      })),
      system_prompt_template: `You are a world-class specialist in ${params.domain}. Objective: ${params.objective}`,
      methodology_framework: 'Understand -> Analyze -> Synthesize -> Verify',
      methodology_steps: [
        'Deconstruct task requirements',
        'Query domain corpus and memories',
        'Execute required tool operations',
        'Formulate epistemic findings',
        'Submit to paired critic for review',
      ],
      constraints: {
        must_rules: ['Attach evidence for every assertion'],
        must_not_rules: ['Never fabricate citations'],
        requires_human_approval: [],
      },
      critic_agent_id: criticId,
      evaluation_rubric: {
        metrics: { "accuracy": 0.90, "domain_fidelity": 0.95 },
        rejection_threshold: 0.88,
      },
      allowed_memory_scopes: ['working', 'project', 'semantic', 'episodic'],
      is_dynamic: true,
    };

    await this.registry.register(specialistContract);
    return specialistContract;
  }
}
