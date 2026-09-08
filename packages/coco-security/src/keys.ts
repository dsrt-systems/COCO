import * as ed from '@noble/ed25519';
import { ConfigError } from '@coco/common';

/**
 * Ed25519 key material loaded from environment.
 * Keys stored as base64-encoded DER (PKCS#8 for private, SPKI for public).
 *
 * Uses ONLY async APIs from @noble/ed25519 v2 — no sync hash setup required.
 */

let privateKeyBytes: Uint8Array | null = null;
let publicKeyBytes: Uint8Array | null = null;

function base64ToBytes(b64: string): Uint8Array {
  // Works in Node and Edge runtimes (no Buffer dependency)
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Buffer } = require('node:buffer') as typeof import('node:buffer');
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * Load and cache the Ed25519 keypair from environment variables.
 * Throws if keys are missing or malformed.
 */
export function loadKeys(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  if (privateKeyBytes && publicKeyBytes) {
    return { privateKey: privateKeyBytes, publicKey: publicKeyBytes };
  }

  const privB64 = process.env.COCO_ED25519_PRIVATE_KEY_B64;
  const pubB64 = process.env.COCO_ED25519_PUBLIC_KEY_B64;

  if (!privB64 || !pubB64) {
    throw new ConfigError(
      'security.keys_missing',
      'COCO_ED25519_PRIVATE_KEY_B64 and COCO_ED25519_PUBLIC_KEY_B64 must be set',
    );
  }

  const privDer = base64ToBytes(privB64);
  const pubDer = base64ToBytes(pubB64);

  // PKCS#8 for Ed25519: last 32 bytes are the raw private key seed
  // SPKI for Ed25519: last 32 bytes are the raw public key
  privateKeyBytes = privDer.subarray(privDer.length - 32);
  publicKeyBytes = pubDer.subarray(pubDer.length - 32);

  if (privateKeyBytes.length !== 32) {
    throw new ConfigError(
      'security.keys_invalid',
      `Invalid private key length: ${privateKeyBytes.length}`,
    );
  }
  if (publicKeyBytes.length !== 32) {
    throw new ConfigError(
      'security.keys_invalid',
      `Invalid public key length: ${publicKeyBytes.length}`,
    );
  }

  return { privateKey: privateKeyBytes, publicKey: publicKeyBytes };
}

/**
 * Sign a message with the platform Ed25519 private key.
 * Returns hex-encoded signature.
 */
export async function signMessage(message: string): Promise<string> {
  const { privateKey } = loadKeys();
  const messageBytes = new TextEncoder().encode(message);
  const signature = await ed.signAsync(messageBytes, privateKey);
  return bytesToHex(signature);
}

/**
 * Verify a hex-encoded signature against a message using the platform public key.
 */
export async function verifySignature(message: string, signatureHex: string): Promise<boolean> {
  try {
    const { publicKey } = loadKeys();
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = hexToBytes(signatureHex);
    return await ed.verifyAsync(signatureBytes, messageBytes, publicKey);
  } catch {
    return false;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
