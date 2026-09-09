import { prefixedId, sha256Hex } from '@coco/common';
import type { SourceInput, EvidenceInput } from '@coco/protocol';
import type { ContextEnv } from '../env';
import { getEmbeddingProvider } from '../embeddings/index';

export async function addSource(env: ContextEnv, input: SourceInput) {
  const sourceId = prefixedId('source');
  const contentHash = sha256Hex(input.full_content);

  const row = {
    source_id: sourceId,
    organization_id: env.organizationId,
    source_type: input.source_type,
    url: input.url ?? null,
    canonical_uri: input.canonical_uri ?? null,
    title: input.title,
    authors: input.authors,
    publisher: input.publisher ?? null,
    published_at: input.published_at ?? null,
    content_hash: contentHash,
    content_excerpt: input.content_excerpt ?? null,
    language: input.language ?? null,
    credibility_class: input.credibility_class,
    credibility_score: input.credibility_score,
    metadata: input.metadata,
  };

  // Upsert by org_id + content_hash (unique index)
  const { data, error } = await env.supabase
    .schema('research')
    .from('sources')
    .upsert(row, { onConflict: 'organization_id, content_hash' })
    .select('*')
    .single();

  if (error) throw new Error(`Source insertion failed: ${error.message}`);
  return data;
}

export async function addEvidence(env: ContextEnv, input: EvidenceInput) {
  const evidenceId = prefixedId('evidence');
  const quoteHash = input.extracted_quote ? sha256Hex(input.extracted_quote) : null;

  const provider = getEmbeddingProvider();
  let embeddingStr: string | null = null;
  try {
    const vec = await provider.embedOne(input.claim);
    embeddingStr = `[${vec.join(',')}]`;
  } catch (err) {
    console.error('Evidence embedding failed', err);
  }

  const row = {
    evidence_id: evidenceId,
    organization_id: env.organizationId,
    source_id: input.source_id,
    claim: input.claim,
    extracted_quote: input.extracted_quote ?? null,
    quote_hash: quoteHash,
    location_hint: input.location_hint ?? null,
    extracted_by_run: input.extracted_by_run ?? null,
    confidence: input.confidence,
    triangulation_count: 1,
    embedding: embeddingStr,
  };

  const { data, error } = await env.supabase
    .schema('research')
    .from('evidence')
    .insert(row)
    .select('*')
    .single();

  if (error) throw new Error(`Evidence insertion failed: ${error.message}`);
  return data;
}

export async function linkCitation(
  env: ContextEnv,
  citedFromKind: 'finding' | 'decision' | 'artifact' | 'memory',
  citedFromId: string,
  evidenceId: string
) {
  const { error } = await env.supabase
    .schema('research')
    .from('citations')
    .insert({
      citation_id: prefixedId('citation'),
      organization_id: env.organizationId,
      cited_from_kind: citedFromKind,
      cited_from_id: citedFromId,
      evidence_id: evidenceId,
    });
  if (error) throw new Error(`Citation linking failed: ${error.message}`);
}

export * from './corpus-pipeline';

