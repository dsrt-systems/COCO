import { z } from 'zod';

export const CredibilityClass = z.enum(['primary', 'secondary', 'unverified', 'discredited']);
export type CredibilityClass = z.infer<typeof CredibilityClass>;

export const CorpusIngestInputSchema = z.object({
  source_type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  canonical_uri: z.string().optional(),
  authors: z.array(z.string()).default([]),
  publisher: z.string().optional(),
  published_at: z.string().optional(),
  full_content: z.string().min(10),
  language: z.string().default('en'),
  credibility_class: CredibilityClass.default('unverified'),
  credibility_score: z.number().min(0).max(1).default(0.8),
  domain: z.string(),
  project_id: z.string().optional(),
  chunk_size: z.number().int().positive().default(1000),
  chunk_overlap: z.number().int().nonnegative().default(200),
  metadata: z.record(z.unknown()).default({}),
});
export type CorpusIngestInput = z.infer<typeof CorpusIngestInputSchema>;

export const CorpusIngestResultSchema = z.object({
  source_id: z.string(),
  content_hash: z.string(),
  chunks_created: z.number().int(),
  memories_written: z.array(z.string()),
  embedded: z.boolean(),
  ingested_at: z.string(),
});
export type CorpusIngestResult = z.infer<typeof CorpusIngestResultSchema>;
