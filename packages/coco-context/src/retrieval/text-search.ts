import type { MemoryRecord, MemoryQuery } from '@coco/protocol';
import type { ContextEnv } from '../env.js';

export interface TextSearchResult {
  memory: MemoryRecord;
  match_score: number;
}

export async function searchMemoriesByText(
  env: ContextEnv,
  query: MemoryQuery
): Promise<TextSearchResult[]> {
  const text = query.text_query;
  if (!text || text.trim().length < 2) return [];

  let q = env.supabase
    .schema('memory')
    .from('memories')
    .select('*')
    .eq('organization_id', env.organizationId)
    .eq('status', 'active')
    .or(`subject.ilike.%${escapeIlike(text)}%,value.ilike.%${escapeIlike(text)}%`)
    .order('importance', { ascending: false })
    .limit(query.limit);

  if (query.scopes && query.scopes.length > 0) {
    q = q.in('scope', query.scopes);
  }
  if (query.project_id) q = q.eq('project_id', query.project_id);
  if (query.mission_id) q = q.eq('mission_id', query.mission_id);
  if (query.conversation_id) q = q.eq('conversation_id', query.conversation_id);
  if (query.min_confidence !== undefined) q = q.gte('confidence', query.min_confidence);
  if (query.min_importance !== undefined) q = q.gte('importance', query.min_importance);

  const { data, error } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[coco/context] Text search failed:', error);
    return [];
  }

  const lower = text.toLowerCase();
  return (data ?? []).map((row: Record<string, unknown>) => {
    const memory = rowToMemory(row);
    const tokens = lower.split(/\s+/).filter((t: string) => t.length > 2);
    const haystack = `${memory.subject} ${memory.value}`.toLowerCase();
    const hits = tokens.filter((t: string) => haystack.includes(t)).length;
    const match_score = tokens.length > 0 ? hits / tokens.length : 0.5;
    return { memory, match_score };
  });
}

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, (m) => '\\' + m);
}

function rowToMemory(row: Record<string, unknown>): MemoryRecord {
  return {
    memory_id: row['memory_id'] as string,
    organization_id: row['organization_id'] as string,
    scope: row['scope'] as MemoryRecord['scope'],
    user_id: (row['user_id'] as string) ?? null,
    project_id: (row['project_id'] as string) ?? null,
    mission_id: (row['mission_id'] as string) ?? null,
    conversation_id: (row['conversation_id'] as string) ?? null,
    subject: row['subject'] as string,
    predicate: row['predicate'] as string,
    value: row['value'] as string,
    value_structured: row['value_structured'] ?? null,
    source: row['source'] as string,
    source_ref: (row['source_ref'] as string) ?? null,
    written_by_agent: (row['written_by_agent'] as string) ?? null,
    written_by_run: (row['written_by_run'] as string) ?? null,
    citations: (row['citations'] as MemoryRecord['citations']) ?? [],
    epistemic_status: row['epistemic_status'] as MemoryRecord['epistemic_status'],
    confidence: row['confidence'] as number,
    evidence_count: row['evidence_count'] as number,
    contradicts_ids: (row['contradicts_ids'] as string[]) ?? [],
    supersedes_ids: (row['supersedes_ids'] as string[]) ?? [],
    version: row['version'] as number,
    status: row['status'] as MemoryRecord['status'],
    expires_at: (row['expires_at'] as string) ?? null,
    importance: row['importance'] as number,
    visibility: row['visibility'] as MemoryRecord['visibility'],
    sensitivity: row['sensitivity'] as MemoryRecord['sensitivity'],
    embedding_model_id: (row['embedding_model_id'] as string) ?? null,
    created_at: row['created_at'] as string,
    updated_at: row['updated_at'] as string,
  };
}
