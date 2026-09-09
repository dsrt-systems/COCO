import type { MemoryQuery, RankedMemory, SensitivityClass } from '@coco/protocol';
import type { ContextEnv } from '../env';
import { searchMemoriesByVector } from './vector-search';
import { searchMemoriesByText } from './text-search';
import { rankMemories, DEFAULT_WEIGHTS, type RankWeights } from './ranker';

export interface RetrievalOptions {
  weights?: RankWeights;
  enforce_sensitivity_ceiling?: boolean;
}

const SENSITIVITY_ORDER: Record<SensitivityClass, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export async function retrieveMemories(
  env: ContextEnv,
  query: MemoryQuery,
  options: RetrievalOptions = {}
): Promise<RankedMemory[]> {
  const wideQuery: MemoryQuery = {
    ...query,
    limit: Math.min(200, query.limit * 5),
    vector_query: query.vector_query ?? query.text_query,
  };

  const [vectorResults, textResults] = await Promise.all([
    wideQuery.vector_query ? searchMemoriesByVector(env, wideQuery) : Promise.resolve([]),
    wideQuery.text_query ? searchMemoriesByText(env, wideQuery) : Promise.resolve([]),
  ]);

  const weights = options.weights ?? DEFAULT_WEIGHTS;
  let ranked = rankMemories(vectorResults, textResults, weights);

  if (query.epistemic_status_in && query.epistemic_status_in.length > 0) {
    const statuses = query.epistemic_status_in;
    ranked = ranked.filter((r) => statuses.includes(r.epistemic_status));
  }

  if (options.enforce_sensitivity_ceiling && query.max_sensitivity) {
    const ceiling = SENSITIVITY_ORDER[query.max_sensitivity];
    if (ceiling !== undefined) {
      ranked = ranked.filter((r) => {
        const itemSens = SENSITIVITY_ORDER[r.sensitivity];
        return itemSens !== undefined && itemSens <= ceiling;
      });
    }
  }

  return ranked.slice(0, query.limit);
}

