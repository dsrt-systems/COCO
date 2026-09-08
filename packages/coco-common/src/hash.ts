/**
 * SHA-256 hashing utilities. Uses Web Crypto API (works in Edge + Node 20+).
 */

const encoder = new TextEncoder();

async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', input);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a UTF-8 string with SHA-256, return hex.
 */
export async function hashString(input: string): Promise<string> {
  return sha256Hex(encoder.encode(input).buffer as ArrayBuffer);
}

/**
 * Hash a JSON-serializable value with SHA-256. Uses canonical JSON.
 */
export async function hashJson(input: unknown): Promise<string> {
  return hashString(canonicalJson(input));
}

/**
 * Canonical JSON: sorted keys, no whitespace. Deterministic across serializations.
 */
export function canonicalJson(input: unknown): string {
  return JSON.stringify(input, sortKeysReplacer());
}

function sortKeysReplacer() {
  return (_key: string, value: unknown): unknown => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  };
}

/**
 * Chain-hash: sha256(prevHash + canonicalJson(current)).
 * Used for tamper-evident audit logs.
 */
export async function chainHash(prevHash: string, current: unknown): Promise<string> {
  return hashString(prevHash + canonicalJson(current));
}

/**
 * The zero hash used as the starting point of a hash chain.
 */
export const ZERO_HASH = '0'.repeat(64);
