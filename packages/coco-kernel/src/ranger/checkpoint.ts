import { prefixedId, sha256Hex } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RangerCheckpoint, CheckpointTrigger } from '@coco/protocol';

export class CheckpointManager {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId: string
  ) {}

  async createCheckpoint(
    missionId: string,
    trigger: CheckpointTrigger
  ): Promise<RangerCheckpoint> {
    // 1. Fetch current mission state
    const { data: mission } = await this.supabase
      .schema('missions')
      .from('missions')
      .select('*')
      .eq('mission_id', missionId)
      .single();

    // 2. Determine checkpoint number
    const { data: lastChk } = await this.supabase
      .schema('missions')
      .from('checkpoints')
      .select('checkpoint_id, checkpoint_number, checkpoint_hash')
      .eq('mission_id', missionId)
      .order('checkpoint_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const number = (lastChk?.checkpoint_number ?? 0) + 1;
    const prevHash = lastChk?.checkpoint_hash ?? '0'.repeat(64);
    const checkpointId = prefixedId('checkpoint');
    const now = new Date().toISOString();

    // 3. Build state snapshot
    const stateSnapshot = {
      phase: mission?.phase ?? 'created',
      active_task_ids: [],
      completed_task_ids: [],
      failed_task_ids: [],
      usage: mission?.usage ?? {},
    };

    // 4. Chain Hash (Tamper-evidence)
    const rawData = `${checkpointId}:${missionId}:${number}:${prevHash}:${JSON.stringify(stateSnapshot)}`;
    const chainHash = sha256Hex(rawData);

    const checkpoint: RangerCheckpoint = {
      checkpoint_id: checkpointId,
      mission_id: missionId,
      checkpoint_number: number,
      prev_checkpoint_id: lastChk?.checkpoint_id,
      chain_hash: chainHash,
      trigger,
      created_at: now,
      state_snapshot: stateSnapshot,
      full_snapshot_uri: `coco://checkpoints/${checkpointId}`,
      signature: 'signed_by_kernel', // Would use A6 Ed25519 in prod
    };

    // 5. Persist
    await this.supabase
      .schema('missions')
      .from('checkpoints')
      .insert({
        checkpoint_id: checkpoint.checkpoint_id,
        mission_id: checkpoint.mission_id,
        checkpoint_number: checkpoint.checkpoint_number,
        checkpoint_hash: checkpoint.chain_hash,
        reason: checkpoint.trigger,
        state_snapshot_uri: checkpoint.full_snapshot_uri,
        graph_snapshot_uri: checkpoint.full_snapshot_uri,
        artifact_refs: [],
        created_at: checkpoint.created_at,
      });

    return checkpoint;
  }
}
