import type { EmbeddingProvider } from './types.js';

/**
 * Deterministic fallback: hashes text into a normalized vector.
 * NOT semantically meaningful — used only when no real provider is configured.
 * Prevents pipeline crashes in dev/test environments.
 */
export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly modelId = 'coco/deterministic-fallback';
  readonly dimensions: number;

  constructor(dimensions = 1536) {
    this.dimensions = dimensions;
  }

  async embedOne(text: string): Promise<number[]> {
    return this.hashToVector(text);
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashToVector(t));
  }

  private hashToVector(text: string): number[] {
    const vec = new Array<number>(this.dimensions).fill(0);
    const bytes = new TextEncoder().encode(text);
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]!;
      const idx = (byte * 31 + i * 7) % this.dimensions;
      vec[idx] = (vec[idx] ?? 0) + (byte / 255) * 2 - 1;
    }
    // L2 normalize
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }
}
