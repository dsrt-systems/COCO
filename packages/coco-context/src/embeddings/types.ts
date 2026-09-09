export interface EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
  embedOne(text: string): Promise<number[]>;
}

export interface EmbeddingBatchResult {
  vectors: number[][];
  model_id: string;
  input_tokens: number;
  cost_usd: number;
}

export class EmbeddingError extends Error {
  public override readonly cause?: unknown;

  constructor(
    message: string,
    public readonly provider: string,
    cause?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingError';
    this.cause = cause;
  }
}
