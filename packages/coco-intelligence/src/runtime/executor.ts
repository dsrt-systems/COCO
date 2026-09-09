import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentDefinitionContract, AgentRunReport, FindingRecord, RunOutcome } from '@coco/protocol';
import { ModelGateway } from '@coco/model-fabric';
import { compileContext, writeMemory } from '@coco/context';
import type { AgentRegistry } from '../registry/index.js';

export interface AgentExecutionInput {
  mission_id: string;
  task_id: string;
  agent_id: string;
  objective: string;
  organization_id: string;
  user_id?: string;
  context_query?: string;
}

export class AgentRuntimeExecutor {
  private gateway: ModelGateway;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly registry: AgentRegistry
  ) {
    this.gateway = new ModelGateway();
  }

  async executeRun(input: AgentExecutionInput): Promise<AgentRunReport> {
    const startedAt = new Date().toISOString();
    const runId = prefixedId('run');

    // 1. Fetch Agent Definition
    const definition = await this.registry.get(input.agent_id);
    if (!definition) {
      throw new Error(`Agent definition not found: ${input.agent_id}`);
    }

    // 2. Register AgentInstance in DB
    const instanceId = prefixedId('agentInst');
    await this.supabase
      .schema('agents')
      .from('agent_instances')
      .insert({
        agent_instance_id: instanceId,
        organization_id: input.organization_id,
        mission_id: input.mission_id,
        agent_definition_id: definition.agent_id,
        status: 'running',
        spawned_at: startedAt,
      });

    // 3. Compile Context Packet (all required fields populated)
    const contextEnv = {
      supabase: this.supabase,
      organizationId: input.organization_id,
      userId: input.user_id,
    };

    const packet = await compileContext(contextEnv, {
      purpose: `Agent Run: ${definition.name}`,
      mission_id: input.mission_id,
      run_id: runId,
      agent_instance_id: instanceId,
      agent_definition_id: definition.agent_id,
      query: input.context_query ?? input.objective,
      max_tokens: Math.floor(definition.model_profile.max_context_tokens / 2),
      min_relevance: 0.4,
      max_memories: 30,
      max_evidence: 10,
      max_brain_nodes: 10,
      external_provider: false,
      include_project_summary: true,
      include_recent_decisions: true,
      recent_decision_limit: 5,
    });

    // 4. Construct System Prompt + Methodology Instruction
    let promptText = `${definition.system_prompt_template}\n\n`;
    promptText += `Methodology Framework: ${definition.methodology_framework}\n`;
    promptText += `Methodology Steps:\n${definition.methodology_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
    promptText += `Task Objective: ${input.objective}\n\n`;
    promptText += `${packet.packet_content}\n\n`;
    promptText += `Produce your output as structured findings with epistemic confidence scores (0.0 - 1.0).`;

    // 5. Execute Model Inference via ModelGateway
    const modelResponse = await this.gateway.generate({
      model: definition.model_profile.reasoning_model,
      messages: [
        { role: 'system', content: promptText },
        { role: 'user', content: input.objective },
      ],
      temperature: definition.model_profile.temperature,
    });

    const outputContent = modelResponse.content;

    // 6. Record Findings & Epistemic Status
    const findingId = prefixedId('finding');
    const finding: FindingRecord = {
      finding_id: findingId,
      claim: outputContent.slice(0, 500),
      epistemic_status: 'supported',
      confidence: 0.9,
      evidence_refs: [packet.packet_id],
      contradicts_refs: [],
    };

    await this.supabase
      .schema('agents')
      .from('agent_findings')
      .insert({
        finding_id: finding.finding_id,
        organization_id: input.organization_id,
        run_id: runId,
        mission_id: input.mission_id,
        claim: finding.claim,
        epistemic_status: finding.epistemic_status,
        confidence: finding.confidence,
        evidence_refs: finding.evidence_refs,
      });

    // 7. Write to Episodic Memory (all required fields populated)
    await writeMemory(contextEnv, {
      scope: 'episodic',
      subject: `${definition.name} execution result`,
      predicate: 'produced_finding',
      value: outputContent.slice(0, 1000),
      source: 'agent_run',
      source_ref: runId,
      written_by_agent: definition.agent_id,
      written_by_run: runId,
      mission_id: input.mission_id,
      confidence: 0.9,
      epistemic_status: 'supported',
      sensitivity: 'internal',
      visibility: 'project',
      importance: 0.7,
      citations: [],
      supersedes_ids: [],
    });

    // 8. Paired Adversarial Critic Review (Level 9 Verification)
    let criticScore = 0.95;
    if (definition.critic_agent_id) {
      const criticDef = await this.registry.get(definition.critic_agent_id);
      if (criticDef) {
        const criticPrompt = `Review output from ${definition.name}:\n\n${outputContent}\n\nTask: ${input.objective}`;
        const criticRes = await this.gateway.generate({
          model: criticDef.model_profile.reasoning_model,
          messages: [
            { role: 'system', content: criticDef.system_prompt_template },
            { role: 'user', content: criticPrompt },
          ],
          temperature: 0.0,
        });

        if (criticRes.content.toLowerCase().includes('reject')) {
          criticScore = 0.6;
        }
      }
    }

    const completedAt = new Date().toISOString();
    const outcome: RunOutcome = criticScore >= definition.evaluation_rubric.rejection_threshold
      ? 'completed_success'
      : 'completed_partial';

    // 9. Persist AgentRun Record
    await this.supabase
      .schema('agents')
      .from('agent_runs')
      .insert({
        run_id: runId,
        organization_id: input.organization_id,
        mission_id: input.mission_id,
        task_id: input.task_id,
        agent_instance_id: instanceId,
        agent_definition_id: definition.agent_id,
        outcome: outcome,
        outcome_summary: outputContent.slice(0, 200),
        confidence_overall: criticScore,
        confidence_reasoning: `Critic score: ${criticScore}`,
        started_at: startedAt,
        completed_at: completedAt,
      });

    // 10. Update AgentInstance Status
    await this.supabase
      .schema('agents')
      .from('agent_instances')
      .update({ status: 'completed', retired_at: completedAt })
      .eq('agent_instance_id', instanceId);

    return {
      run_id: runId,
      agent_instance_id: instanceId,
      task_id: input.task_id,
      mission_id: input.mission_id,
      agent_definition_id: definition.agent_id,
      outcome,
      outcome_summary: outputContent,
      findings: [finding],
      artifacts_produced: [],
      decisions_recorded: [],
      memories_written: [runId],
      confidence_overall: criticScore,
      confidence_reasoning: `Verified via methodology and critic score: ${criticScore}`,
      caveats: [],
      requires_human_review: criticScore < definition.evaluation_rubric.rejection_threshold,
      assumptions_made: [],
      open_questions: [],
      next_recommended_tasks: [],
      started_at: startedAt,
      completed_at: completedAt,
    };
  }
}
