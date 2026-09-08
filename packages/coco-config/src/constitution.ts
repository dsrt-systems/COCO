import { z } from 'zod';
import { load as loadYaml } from 'js-yaml';
import { ConfigError } from '@coco/common';

export const IdentitySchema = z.object({
  name: z.string(),
  version: z.string(),
  tagline: z.string(),
  one_sentence: z.string(),
  what_coco_is: z.array(z.string()),
  what_coco_is_not: z.array(z.string()),
  standard: z.string(),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const LawSchema = z.object({
  number: z.number().int().min(1).max(12),
  name: z.string(),
  text: z.string(),
});

export const LawsSchema = z.object({
  version: z.string(),
  laws: z.array(LawSchema).length(12),
});
export type Laws = z.infer<typeof LawsSchema>;

export const VoiceSchema = z.object({
  principles: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      example_good: z.string().optional(),
      example_bad: z.string().optional(),
    }),
  ),
  banned_phrases: z.array(z.string()),
  preferred_phrases: z.array(z.string()),
});
export type Voice = z.infer<typeof VoiceSchema>;

export const MethodStepSchema = z.object({
  number: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
});

export const CocoMethodSchema = z.object({
  name: z.string(),
  steps: z.array(MethodStepSchema).length(11),
});
export type CocoMethod = z.infer<typeof CocoMethodSchema>;

export const DepthLevelSchema = z.object({
  level: z.number().int().min(0).max(6),
  name: z.string(),
  description: z.string(),
  typical_latency_ms: z.number().int().positive(),
  typical_use: z.string(),
});

export const DepthPolicySchema = z.object({
  levels: z.array(DepthLevelSchema).length(7),
  selection_rules: z.array(z.string()),
});
export type DepthPolicy = z.infer<typeof DepthPolicySchema>;

export interface Constitution {
  identity: Identity;
  laws: Laws;
  voice: Voice;
  method: CocoMethod;
  depth: DepthPolicy;
}

export function parseYaml<T>(schema: z.ZodType<T>, yaml: string, path: string): T {
  let raw: unknown;
  try {
    raw = loadYaml(yaml);
  } catch (e) {
    throw new ConfigError('constitution.yaml_parse', `Failed to parse YAML at ${path}`, {
      cause: String(e),
    });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError('constitution.schema_invalid', `Schema violation in ${path}`, {
      issues: result.error.issues,
    });
  }
  return result.data;
}

export function buildConstitution(files: {
  identity: string;
  laws: string;
  voice: string;
  method: string;
  depth: string;
}): Constitution {
  return {
    identity: parseYaml(IdentitySchema, files.identity, 'identity.yaml'),
    laws: parseYaml(LawsSchema, files.laws, 'laws.yaml'),
    voice: parseYaml(VoiceSchema, files.voice, 'voice.yaml'),
    method: parseYaml(CocoMethodSchema, files.method, 'methods/coco_method.yaml'),
    depth: parseYaml(DepthPolicySchema, files.depth, 'cognitive/depth_policy.yaml'),
  };
}
