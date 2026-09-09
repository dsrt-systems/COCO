import { prefixedId, sha256Hex } from '@coco/common';
import type { MemoryWriteInput, MemoryRecord } from '@coco/protocol';
import type { ContextEnv } from '../env.js';
import { getEmbeddingProvider } from '../embeddings/index.js';

export interface MemoryWriteResult {
  memory: MemoryRecord;
  embedded: boolean;
  superseded_count: number;
}

export async function writeMemory(
  env: ContextEnv,
  input: MemoryWriteInput
): Promise<MemoryWriteResult> {
  const memoryId = prefixedId('memory');

  const embedText = `${input.subject}\n${input.predicate}\n${input.value}`;
  const provider = getEmbeddingProvider();
  let embedding: number[] | null = null;
  let embedded = false;
  try {
    embedding = await provider.embedOne(embedText);
    embedded = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[coco/context] Embedding failed, writing without vector:', err);
  }

  let expiresAt: string | null = null;
  if (input.ttl_seconds && input.ttl_seconds > 0) {
    expiresAt = new Date(Date.now() + input.ttl_seconds * 1000).toISOString();
  } else if (input.scope === 'working') {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const row = {
    memory_id: memoryId,
    organization_id: env.organizationId,
    scope: input.scope,

    user_id: input.user_id ?? env.userId ?? null,
    project_id: input.project_id ?? null,
    mission_id: input.mission_id ?? null,
    conversation_id: input.conversation_id ?? null,

    subject: input.subject,
    predicate: input.predicate,
    value: input.value,
    value_structured: input.value_structured ?? null,

    source: input.source,
    source_ref: input.source_ref ?? null,
    written_by_agent: input.written_by_agent ?? null,
    written_by_run: input.written_by_run ?? null,
    citations: input.citations ?? [],

    epistemic_status: input.epistemic_status,
    confidence: input.confidence,
    evidence_count: input.citations?.length ?? 0,
    contradicts_ids: [] as string[],
    supersedes_ids: input.supersedes_ids ?? [],

    version: 1,
    status: 'active' as const,
    expires_at: expiresAt,
    importance: input.importance,

    visibility: input.visibility,
    sensitivity: input.sensitivity,

    embedding: embedding ? formatVectorLiteral(embedding) : null,
    embedding_model_id: embedded ? provider.modelId : null,
  };

  const { data: inserted, error } = await env.supabase
    .schema('memory')
    .from('memories')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to write memory: ${error.message}`);
  }

  let supersededCount = 0;
  if (input.supersedes_ids && input.supersedes_ids.length > 0) {
    const { error: supErr, count } = await env.supabase
      .schema('memory')
      .from('memories')
      .update({ status: 'superseded' })
      .in('memory_id', input.supersedes_ids)
      .eq('status', 'active');
    if (supErr) {
      // eslint-disable-next-line no-console
      console.error('[coco/context] Supersession failed:', supErr);
    } else {
      supersededCount = count ?? input.supersedes_ids.length;
    }
  }

  return {
    memory: rowToMemory(inserted),
    embedded,
    superseded_count: supersededCount,
  };
}

export async function writeMemoriesBatch(
  env: ContextEnv,
  inputs: MemoryWriteInput[]
): Promise<MemoryWriteResult[]> {
  if (inputs.length === 0) return [];

  const provider = getEmbeddingProvider();
  const embedTexts = inputs.map((i) => `${i.subject}\n${i.predicate}\n${i.value}`);
  let embeddings: (number[] | null)[] = new Array(inputs.length).fill(null);
  let embedded = false;
  try {
    const vectors = await provider.embed(embedTexts);
    embeddings = vectors;
    embedded = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[coco/context] Batch embedding failed:', err);
  }

  const rows = inputs.map((input, idx) => {
    const memoryId = prefixedId('memory');
    let expiresAt: string | null = null;
    if (input.ttl_seconds && input.ttl_seconds > 0) {
      expiresAt = new Date(Date.now() + input.ttl_seconds * 1000).toISOString();
    } else if (input.scope === 'working') {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const emb = embeddings[idx];
    return {
      memory_id: memoryId,
      organization_id: env.organizationId,
      scope: input.scope,
      user_id: input.user_id ?? env.userId ?? null,
      project_id: input.project_id ?? null,
      mission_id: input.mission_id ?? null,
      conversation_id: input.conversation_id ?? null,
      subject: input.subject,
      predicate: input.predicate,
      value: input.value,
      value_structured: input.value_structured ?? null,
      source: input.source,
      source_ref: input.source_ref ?? null,
      written_by_agent: input.written_by_agent ?? null,
      written_by_run: input.written_by_run ?? null,
      citations: input.citations ?? [],
      epistemic_status: input.epistemic_status,
      confidence: input.confidence,
      evidence_count: input.citations?.length ?? 0,
      contradicts_ids: [] as string[],
      supersedes_ids: input.supersedes_ids ?? [],
      version: 1,
      status: 'active' as const,
      expires_at: expiresAt,
      importance: input.importance,
      visibility: input.visibility,
      sensitivity: input.sensitivity,
      embedding: emb ? formatVectorLiteral(emb) : null,
      embedding_model_id: embedded && emb ? provider.modelId : null,
    };
  });

  const { data: inserted, error } = await env.supabase
    .schema('memory')
    .from('memories')
    .insert(rows)
    .select('*');

  if (error) {
    throw new Error(`Batch memory write failed: ${error.message}`);
  }

  return (inserted ?? []).map((row: Record<string, unknown>) => ({
    memory: rowToMemory(row),
    embedded,
    superseded_count: 0,
  }));
}

export async function markContradicted(
  env: ContextEnv,
  memoryId: string,
  contradictorId: string
): Promise<void> {
  const { data, error } = await env.supabase
    .schema('memory')
    .from('memories')
    .select('contradicts_ids')
    .eq('memory_id', memoryId)
    .single();
  if (error) throw new Error(`Read for contradiction failed: ${error.message}`);

  const current = (data?.contradicts_ids ?? []) as string[];
  if (current.includes(contradictorId)) return;
  const next = [...current, contradictorId];

  const { error: updErr } = await env.supabase
    .schema('memory')
    .from('memories')
    .update({ contradicts_ids: next, status: 'contradicted' })
    .eq('memory_id', memoryId);
  if (updErr) throw new Error(`Contradiction mark failed: ${updErr.message}`);
}

function formatVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
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

export { sha256Hex };
