import type { EmbeddingProvider } from './types';
import { EmbeddingError } from './types';

const OPENAI_EMBED_ENDPOINT = 'https://api.openai.com/v1/embeddings';

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

const MODEL_DEFAULT_DIMS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly requestDimensions?: number;

  constructor(config: OpenAIEmbeddingConfig) {
    if (!config.apiKey) {
      throw new EmbeddingError('OpenAI API key required', 'openai');
    }
    this.apiKey = config.apiKey;
    this.modelId = config.model ?? 'text-embedding-3-small';
    const defaultDims = MODEL_DEFAULT_DIMS[this.modelId] ?? 1536;
    this.dimensions = config.dimensions ?? defaultDims;
    // Only pass dimensions param for models that support it
    if (config.dimensions && this.modelId.startsWith('text-embedding-3')) {
      this.requestDimensions = config.dimensions;
    }
  }

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    if (!vector) {
      throw new EmbeddingError('No embedding returned', 'openai');
    }
    return vector;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // OpenAI accepts up to 2048 inputs per request; batch defensively
    const BATCH_SIZE = 96;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchVectors = await this.embedBatch(batch);
      results.push(...batchVectors);
    }

    return results;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      input: texts,
      encoding_format: 'float',
    };
    if (this.requestDimensions) {
      body.dimensions = this.requestDimensions;
    }

    let response: Response;
    try {
      response = await fetch(OPENAI_EMBED_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new EmbeddingError('OpenAI embeddings network error', 'openai', cause);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new EmbeddingError(
        `OpenAI embeddings failed (${response.status}): ${errText}`,
        'openai'
      );
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage?: { prompt_tokens: number; total_tokens: number };
    };

    // Sort by index to guarantee input order
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}

