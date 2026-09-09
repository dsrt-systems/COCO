import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentDefinitionContract } from '@coco/protocol';
import { AgentDefinitionContract as AgentSchema } from '@coco/protocol';

export class AgentRegistry {
  private static memoryRegistry = new Map<string, AgentDefinitionContract>();

  constructor(private readonly supabase?: SupabaseClient) {}

  /**
   * Registers an agent definition in memory + database.
   * Validates against AgentDefinitionContract schema.
   */
  async register(definition: AgentDefinitionContract): Promise<AgentDefinitionContract> {
    const validated = AgentSchema.parse(definition);
    AgentRegistry.memoryRegistry.set(validated.agent_id, validated);

    if (this.supabase) {
      const { error } = await this.supabase
        .schema('agents')
        .from('agent_definitions')
        .upsert({
          agent_definition_id: validated.agent_id,
          version: validated.version,
          tier: validated.tier,
          domain: validated.domain,
          reports_to: validated.reports_to ?? null,
          display_name: validated.name,
          expert_beating_thesis: validated.expert_beating_thesis,
          system_prompt_template: validated.system_prompt_template,
          methodology_framework: validated.methodology_framework,
          methodology_steps: validated.methodology_steps,
          model_profile: validated.model_profile,
          knowledge_sources: validated.knowledge_sources,
          tool_suite: validated.tool_suite,
          constraints: validated.constraints,
          critic_agent_id: validated.critic_agent_id ?? null,
          evaluation_rubric: validated.evaluation_rubric,
          allowed_memory_scopes: validated.allowed_memory_scopes,
          is_dynamic: validated.is_dynamic,
        }, { onConflict: 'agent_definition_id' });

      if (error) {
        // eslint-disable-next-line no-console
        console.warn(`[coco/intelligence] Failed DB persist for ${validated.agent_id}:`, error.message);
      }
    }

    return validated;
  }

  /**
   * Retrieves an agent definition by ID (memory cache -> DB fallback).
   */
  async get(agentId: string): Promise<AgentDefinitionContract | null> {
    if (AgentRegistry.memoryRegistry.has(agentId)) {
      return AgentRegistry.memoryRegistry.get(agentId)!;
    }

    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .schema('agents')
      .from('agent_definitions')
      .select('*')
      .eq('agent_definition_id', agentId)
      .maybeSingle();

    if (error || !data) return null;

    const parsed: AgentDefinitionContract = {
      agent_id: data.agent_definition_id,
      name: data.display_name,
      version: data.version,
      tier: data.tier,
      domain: data.domain,
      reports_to: data.reports_to,
      expert_beating_thesis: data.expert_beating_thesis,
      model_profile: data.model_profile,
      knowledge_sources: data.knowledge_sources ?? [],
      tool_suite: data.tool_suite ?? [],
      system_prompt_template: data.system_prompt_template,
      methodology_framework: data.methodology_framework,
      methodology_steps: data.methodology_steps ?? [],
      constraints: data.constraints ?? { must_rules: [], must_not_rules: [] },
      critic_agent_id: data.critic_agent_id,
      evaluation_rubric: data.evaluation_rubric ?? { metrics: {}, rejection_threshold: 0.85 },
      allowed_memory_scopes: data.allowed_memory_scopes ?? [],
      is_dynamic: data.is_dynamic ?? false,
    };

    AgentRegistry.memoryRegistry.set(agentId, parsed);
    return parsed;
  }

  /**
   * List all registered agents filtered by tier or domain.
   */
  async list(filters: { tier?: string; domain?: string } = {}): Promise<AgentDefinitionContract[]> {
    if (this.supabase) {
      let q = this.supabase.schema('agents').from('agent_definitions').select('*');
      if (filters.tier) q = q.eq('tier', filters.tier);
      if (filters.domain) q = q.eq('domain', filters.domain);
      const { data } = await q;

      if (data && data.length > 0) {
        return data.map((d) => ({
          agent_id: d.agent_definition_id,
          name: d.display_name,
          version: d.version,
          tier: d.tier,
          domain: d.domain,
          reports_to: d.reports_to,
          expert_beating_thesis: d.expert_beating_thesis,
          model_profile: d.model_profile,
          knowledge_sources: d.knowledge_sources ?? [],
          tool_suite: d.tool_suite ?? [],
          system_prompt_template: d.system_prompt_template,
          methodology_framework: d.methodology_framework,
          methodology_steps: d.methodology_steps ?? [],
          constraints: d.constraints ?? { must_rules: [], must_not_rules: [] },
          critic_agent_id: d.critic_agent_id,
          evaluation_rubric: d.evaluation_rubric ?? { metrics: {}, rejection_threshold: 0.85 },
          allowed_memory_scopes: d.allowed_memory_scopes ?? [],
          is_dynamic: d.is_dynamic ?? false,
        }));
      }
    }

    let all = Array.from(AgentRegistry.memoryRegistry.values());
    if (filters.tier) all = all.filter((a) => a.tier === filters.tier);
    if (filters.domain) all = all.filter((a) => a.domain === filters.domain);
    return all;
  }
}
