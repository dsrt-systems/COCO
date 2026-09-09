import type { EmbeddingProvider } from './types';
import { OpenAIEmbeddingProvider } from './openai';
import { DeterministicEmbeddingProvider } from './deterministic';

let cachedProvider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;

  const openaiKey = typeof process !== 'undefined' ? process.env['OPENAI_API_KEY'] : undefined;
  if (openaiKey && openaiKey.length > 10) {
    cachedProvider = new OpenAIEmbeddingProvider({
      apiKey: openaiKey,
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
    return cachedProvider;
  }

  // Fallback: deterministic (dev/test only)
  // eslint-disable-next-line no-console
  console.warn(
    '[coco/context] No OPENAI_API_KEY set — using deterministic embedding fallback. ' +
      'Vector search quality will be poor. Set OPENAI_API_KEY for production.'
  );
  cachedProvider = new DeterministicEmbeddingProvider(1536);
  return cachedProvider;
}

export function resetEmbeddingProvider(): void {
  cachedProvider = null;
}

