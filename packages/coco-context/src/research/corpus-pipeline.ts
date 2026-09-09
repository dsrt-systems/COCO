import { prefixedId, sha256Hex } from '@coco/common';
import type { CorpusIngestInput, CorpusIngestResult } from '@coco/protocol';
import type { ContextEnv } from '../env';
import { getEmbeddingProvider } from '../embeddings/index';
import { addSource } from './index';
import { writeMemoriesBatch } from '../memory/writer';

export class CorpusPipeline {
  constructor(private readonly env: ContextEnv) {}

  /**
   * Ingests a raw domain document/corpus into research.sources and compiles
   * semantic memory records (scope='semantic') with pgvector embeddings.
   */
  async ingest(input: CorpusIngestInput): Promise<CorpusIngestResult> {
    const contentHash = sha256Hex(input.full_content);
    const now = new Date().toISOString();

    // 1. Register Source Record in research.sources
    const source = await addSource(this.env, {
      source_type: input.source_type,
      url: input.url ?? null,
      canonical_uri: input.canonical_uri ?? null,
      title: input.title,
      authors: input.authors,
      publisher: input.publisher ?? null,
      published_at: input.published_at ?? null,
      full_content: input.full_content,
      content_excerpt: input.full_content.slice(0, 300) + '...',
      language: input.language,
      credibility_class: input.credibility_class,
      credibility_score: input.credibility_score,
      metadata: { ...input.metadata, domain: input.domain },
    });

    const sourceId = source.source_id;

    // 2. Semantic Chunking
    const chunks = this.chunkText(input.full_content, input.chunk_size, input.chunk_overlap);

    // 3. Batch Write to Semantic Memory (scope='semantic') with Vector Embeddings
    const memoryInputs = chunks.map((chunkText, idx) => ({
      scope: 'semantic' as const,
      subject: `[${input.domain.toUpperCase()}] ${input.title} (Part ${idx + 1}/${chunks.length})`,
      predicate: 'contains_knowledge',
      value: chunkText,
      source: `corpus_pipeline:${input.source_type}`,
      source_ref: sourceId,
      written_by_agent: 'B2_research_director',
      citations: [
        {
          source_id: sourceId,
          quote: chunkText.slice(0, 150),
          url: input.url,
        },
      ],
      epistemic_status: 'fact' as const,
      confidence: input.credibility_score,
      importance: 0.8,
      visibility: 'organization' as const,
      sensitivity: 'internal' as const,
      project_id: input.project_id ?? null,
      supersedes_ids: [],
    }));

    const writeResults = await writeMemoriesBatch(this.env, memoryInputs);
    const memoryIds = writeResults.map((r) => r.memory.memory_id);
    const isEmbedded = writeResults.some((r) => r.embedded);

    return {
      source_id: sourceId,
      content_hash: contentHash,
      chunks_created: chunks.length,
      memories_written: memoryIds,
      embedded: isEmbedded,
      ingested_at: now,
    };
  }

  /**
   * Overlapping sliding-window chunker preserving sentence boundaries where possible.
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (cleaned.length <= chunkSize) return [cleaned];

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + chunkSize;
      if (end < cleaned.length) {
        // Try to break at nearest sentence or newline
        const breakIdx = cleaned.lastIndexOf('\n', end);
        if (breakIdx > start + chunkSize / 2) {
          end = breakIdx + 1;
        } else {
          const periodIdx = cleaned.lastIndexOf('. ', end);
          if (periodIdx > start + chunkSize / 2) {
            end = periodIdx + 2;
          }
        }
      } else {
        end = cleaned.length;
      }

      const chunk = cleaned.slice(start, end).trim();
      if (chunk.length > 0) chunks.push(chunk);

      start = end - overlap;
      if (start >= cleaned.length - overlap) break;
    }

    return chunks;
  }
}

