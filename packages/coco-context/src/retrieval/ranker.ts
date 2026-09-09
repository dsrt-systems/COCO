import type { RankedMemory, MemoryRecord } from '@coco/protocol';
import type { VectorSearchResult } from './vector-search.js';
import type { TextSearchResult } from './text-search.js';

export interface RankWeights {
  vector: number;
  text: number;
  recency: number;
  importance: number;
  confidence: number;
}

export const DEFAULT_WEIGHTS: RankWeights = {
  vector: 0.45,
  text: 0.15,
  recency: 0.10,
  importance: 0.15,
  confidence: 0.15,
};

/**
 * Merge vector and text results, deduplicate by memory_id,
 * and produce a unified ranked list with score decomposition.
 */
export function rankMemories(
  vectorResults: VectorSearchResult[],
  textResults: TextSearchResult[],
  weights: RankWeights = DEFAULT_WEIGHTS
): RankedMemory[] {
  const byId = new Map<
    string,
    {
      memory: MemoryRecord;
      vector_similarity: number;
      text_match: number;
    }
  >();

  for (const v of vectorResults) {
    byId.set(v.memory.memory_id, {
      memory: v.memory,
      vector_similarity: v.similarity,
      text_match: 0,
    });
  }
  for (const t of textResults) {
    const existing = byId.get(t.memory.memory_id);
    if (existing) {
      existing.text_match = t.match_score;
    } else {
      byId.set(t.memory.memory_id, {
        memory: t.memory,
        vector_similarity: 0,
        text_match: t.match_score,
      });
    }
  }

  const now = Date.now();

  const ranked: RankedMemory[] = [];
  for (const entry of byId.values()) {
    const m = entry.memory;
    const recency = recencyScore(m.created_at, now);
    const importance = m.importance;
    const confidence = m.confidence;

    const score =
      weights.vector * entry.vector_similarity +
      weights.text * entry.text_match +
      weights.recency * recency +
      weights.importance * importance +
      weights.confidence * confidence;

    ranked.push({
      ...m,
      score,
      score_components: {
        vector_similarity: entry.vector_similarity,
        text_match: entry.text_match,
        recency,
        importance,
        confidence,
      },
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/**
 * Exponential decay: memory 1 day old = ~0.95; 7 days = ~0.72; 30 days = ~0.30
 */
function recencyScore(createdAtIso: string, nowMs: number): number {
  const created = new Date(createdAtIso).getTime();
  if (isNaN(created)) return 0.5;
  const ageDays = (nowMs - created) / (24 * 60 * 60 * 1000);
  return Math.exp(-ageDays / 20);
}
