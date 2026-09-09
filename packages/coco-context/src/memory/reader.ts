import type { MemoryRecord } from '@coco/protocol';
import type { ContextEnv } from '../env';

export async function getMemory(
  env: ContextEnv,
  memoryId: string
): Promise<MemoryRecord | null> {
  const { data, error } = await env.supabase
    .schema('memory')
    .from('memories')
    .select('*')
    .eq('memory_id', memoryId)
    .maybeSingle();
  if (error) throw new Error(`Get memory failed: ${error.message}`);
  return data ? rowToMemory(data) : null;
}

export async function listMemories(
  env: ContextEnv,
  filters: {
    scope?: string;
    project_id?: string;
    mission_id?: string;
    conversation_id?: string;
    status?: 'active' | 'superseded' | 'contradicted' | 'archived';
    limit?: number;
    offset?: number;
  } = {}
): Promise<MemoryRecord[]> {
  let q = env.supabase
    .schema('memory')
    .from('memories')
    .select('*')
    .eq('organization_id', env.organizationId)
    .order('created_at', { ascending: false });

  if (filters.scope) q = q.eq('scope', filters.scope);
  if (filters.project_id) q = q.eq('project_id', filters.project_id);
  if (filters.mission_id) q = q.eq('mission_id', filters.mission_id);
  if (filters.conversation_id) q = q.eq('conversation_id', filters.conversation_id);
  if (filters.status) q = q.eq('status', filters.status);
  else q = q.eq('status', 'active');

  q = q.range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

  const { data, error } = await q;
  if (error) throw new Error(`List memories failed: ${error.message}`);
  return (data ?? []).map(rowToMemory);
}

export async function countMemoriesByScope(
  env: ContextEnv,
  filters: { project_id?: string; mission_id?: string } = {}
): Promise<Record<string, number>> {
  let q = env.supabase
    .schema('memory')
    .from('memories')
    .select('scope', { count: 'exact', head: false })
    .eq('organization_id', env.organizationId)
    .eq('status', 'active');

  if (filters.project_id) q = q.eq('project_id', filters.project_id);
  if (filters.mission_id) q = q.eq('mission_id', filters.mission_id);

  const { data, error } = await q;
  if (error) throw new Error(`Count failed: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = (row as { scope: string }).scope;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMemory(row: any): MemoryRecord {
  return {
    memory_id: row.memory_id,
    organization_id: row.organization_id,
    scope: row.scope,
    user_id: row.user_id,
    project_id: row.project_id,
    mission_id: row.mission_id,
    conversation_id: row.conversation_id,
    subject: row.subject,
    predicate: row.predicate,
    value: row.value,
    value_structured: row.value_structured,
    source: row.source,
    source_ref: row.source_ref,
    written_by_agent: row.written_by_agent,
    written_by_run: row.written_by_run,
    citations: row.citations ?? [],
    epistemic_status: row.epistemic_status,
    confidence: row.confidence,
    evidence_count: row.evidence_count,
    contradicts_ids: row.contradicts_ids ?? [],
    supersedes_ids: row.supersedes_ids ?? [],
    version: row.version,
    status: row.status,
    expires_at: row.expires_at,
    importance: row.importance,
    visibility: row.visibility,
    sensitivity: row.sensitivity,
    embedding_model_id: row.embedding_model_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

