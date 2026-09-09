import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';

/**
 * POST /api/realtime/simulate
 * Inserts a synthetic tool_call / agent_run / model_call row
 * to trigger Supabase Realtime events for UI testing.
 *
 * Body: { mission_id: string, event_kind: 'tool' | 'agent' | 'model' | 'verification' }
 */
export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mission_id, event_kind } = body;

    if (!mission_id || !event_kind) {
      return NextResponse.json(
        { error: 'mission_id and event_kind are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let result: Record<string, unknown> = {};

    switch (event_kind) {
      case 'tool': {
        const id = prefixedId('toolCall');
        const { error } = await client.schema('tools').from('tool_calls').insert({
          invocation_id: id,
          organization_id: organizationId,
          mission_id,
          agent_instance_id: 'ain_sim_test',
          tool_id: 'd2_terminal_exec',
          tool_version: '1.0.0',
          arguments_json: { command: 'echo realtime-test' },
          arguments_hash: 'sim_hash_' + id.slice(-8),
          capability_token_id: 'tkn_sim_test',
          status: 'success',
          exit_code: 0,
          output_json: { stdout: 'realtime-test\n' },
          wall_time_ms: 42,
          started_at: now,
          completed_at: now,
        });
        if (error) throw new Error(error.message);
        result = { event_kind: 'tool', invocation_id: id };
        break;
      }

      case 'agent': {
        const instId = prefixedId('agentInst');
        const { error } = await client.schema('agents').from('agent_instances').insert({
          agent_instance_id: instId,
          organization_id: organizationId,
          mission_id,
          agent_definition_id: 'A1_coco_director',
          status: 'running',
          spawned_at: now,
        });
        if (error) throw new Error(error.message);
        result = { event_kind: 'agent', agent_instance_id: instId };
        break;
      }

      case 'model': {
        const callId = prefixedId('call');
        // models.model_calls may be partitioned — insert with all required fields
        const { error } = await client.schema('models').from('model_calls').insert({
          call_id: callId,
          organization_id: organizationId,
          mission_id,
          model_id: 'anthropic/claude-3-5-sonnet@20241022',
          provider: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1/messages',
          capability_requested: 'reason.deep',
          input_tokens: 1200,
          output_tokens: 450,
          cost_usd: 0.0126,
          latency_ms: 2100,
          finish_reason: 'stop',
          status: 'success',
          started_at: now,
          completed_at: now,
        });
        if (error) throw new Error(error.message);
        result = { event_kind: 'model', call_id: callId, cost_usd: 0.0126 };
        break;
      }

      case 'verification': {
        const verId = prefixedId('verification');
        const { error: verErr } = await client.schema('verification').from('verifications').insert({
          verification_id: verId,
          organization_id: organizationId,
          mission_id,
          requesting_agent_id: 'A1_coco_director',
          artifact_ids: [],
          requirements: ['Simulated verification'],
          domain: 'software',
          target_level: 6,
          started_at: now,
        });
        if (verErr) throw new Error(verErr.message);

        // Insert a few level results
        for (let lvl = 0; lvl <= 3; lvl++) {
          const lvlId = prefixedId('levelResult');
          await client.schema('verification').from('level_results').insert({
            level_result_id: lvlId,
            verification_id: verId,
            level: lvl,
            level_name: ['well_formed', 'structural_valid', 'type_correct', 'lint_clean'][lvl],
            status: 'passed',
            checks_total: 1,
            checks_passed: 1,
            checks_failed: 0,
            duration_ms: 15 + lvl * 10,
          });
        }
        result = { event_kind: 'verification', verification_id: verId };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown event_kind: ${event_kind}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Simulation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
