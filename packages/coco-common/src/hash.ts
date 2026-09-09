import { createHash } from 'node:crypto';

export const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hashSha256(data: string | Uint8Array): string {
  return sha256Hex(data);
}

export function hashString(str: string): string {
  return sha256Hex(str);
}

export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalJson((obj as Record<string, unknown>)[k])
  );
  return '{' + pairs.join(',') + '}';
}

export function hashJson(obj: unknown): string {
  return sha256Hex(canonicalJson(obj));
}
