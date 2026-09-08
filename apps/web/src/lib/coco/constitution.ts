import { buildConstitution, type Constitution } from '@coco/config';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Load the Constitution from disk at server startup.
 * Cached in module scope; loaded once per Node instance.
 */
let cached: Constitution | null = null;

function readFile(relPath: string): string {
  // Resolve relative to the monorepo root
  const root = path.resolve(process.cwd(), '../..');
  const full = path.join(root, 'constitution', relPath);
  return fs.readFileSync(full, 'utf-8');
}

export function getConstitution(): Constitution {
  if (cached) return cached;
  cached = buildConstitution({
    identity: readFile('identity.yaml'),
    laws: readFile('laws.yaml'),
    voice: readFile('voice.yaml'),
    method: readFile('methods/coco_method.yaml'),
    depth: readFile('cognitive/depth_policy.yaml'),
  });
  return cached;
}
