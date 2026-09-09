import type { MemoryRecord, MemoryQuery } from '@coco/protocol';
import type { ContextEnv } from '../env';
import { getEmbeddingProvider } from '../embeddings/index';

export interface VectorSearchResult {
  memory: MemoryRecord;
  similarity: number;
}

/**
 * Perform HNSW cosine similarity search against memory.memories.
 * Uses raw SQL via RPC-style query because pgvector <-> operator
 * isn't directly exposed by supabase-js query builder.
 *
 * We store a helper function in Postgres for this.
 */
export async function searchMemoriesByVector(
  env: ContextEnv,
  query: MemoryQuery
): Promise<VectorSearchResult[]> {
  if (!query.vector_query && !query.text_query) return [];

  const text = query.vector_query ?? query.text_query!;
  const provider = getEmbeddingProvider();

  let vector: number[];
  try {
    vector = await provider.embedOne(text);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[coco/context] Vector search embedding failed:', err);
    return [];
  }

  const vectorLiteral = `[${vector.join(',')}]`;

  // Build the query using raw SQL through the postgrest rpc mechanism.
  // We call a helper function defined below in setup SQL.
  const { data, error } = await env.supabase.rpc('memory_vector_search', {
    p_organization_id: env.organizationId,
    p_query_embedding: vectorLiteral,
    p_scopes: query.scopes ?? null,
    p_project_id: query.project_id ?? null,
    p_mission_id: query.mission_id ?? null,
    p_conversation_id: query.conversation_id ?? null,
    p_min_confidence: query.min_confidence ?? 0.0,
    p_min_importance: query.min_importance ?? 0.0,
    p_limit: query.limit,
    p_include_superseded: query.include_superseded,
    p_include_contradicted: query.include_contradicted,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[coco/context] Vector search RPC failed:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    memory: rowToMemory(row),
    similarity: (row.similarity as number) ?? 0,
  }));
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

