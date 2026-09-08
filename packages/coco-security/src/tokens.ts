import { CapabilityToken, ToolScope } from '@coco/protocol';
import { prefixedId, canonicalJson, PermissionError, nowUnixMs } from '@coco/common';
import { signMessage, verifySignature } from './keys';

/**
 * The Capability Broker.
 * Issues, verifies, and revokes short-lived Ed25519-signed capability tokens
 * that grant agents specific tool scopes.
 */

export interface IssueTokenInput {
  organizationId: string;
  missionId?: string;
  agentInstanceId: string;
  toolId: string;
  grantedScope: ToolScope;
  maxInvocations?: number;
  ttlSeconds?: number;
}

export interface CapabilityTokenPersistence {
  insert(token: CapabilityToken & { organization_id: string; mission_id?: string }): Promise<void>;
  findById(tokenId: string): Promise<(CapabilityToken & { organization_id: string; revoked_at?: string | null }) | null>;
  markUsed(tokenId: string): Promise<void>;
  revoke(tokenId: string, reason: string): Promise<void>;
}

const DEFAULT_TTL_SECONDS = Number(process.env.COCO_CAPABILITY_TOKEN_DEFAULT_TTL_SECONDS ?? 300);
const MAX_TTL_SECONDS = Number(process.env.COCO_CAPABILITY_TOKEN_MAX_TTL_SECONDS ?? 3600);

/**
 * Compute the canonical payload string that gets signed.
 * Signature covers: token_id + agent_instance_id + tool_id + granted_scope + expires_at + max_invocations.
 * If any of these are tampered with, verification fails.
 */
function canonicalPayload(token: Omit<CapabilityToken, 'signature'>): string {
  return canonicalJson({
    token_id: token.token_id,
    agent_instance_id: token.agent_instance_id,
    tool_id: token.tool_id,
    granted_scope: token.granted_scope,
    max_invocations: token.max_invocations,
    expires_at_unix_ms: token.expires_at_unix_ms,
    issued_at_unix_ms: token.issued_at_unix_ms,
    issued_by: token.issued_by,
  });
}

export async function issueCapabilityToken(
  input: IssueTokenInput,
  store: CapabilityTokenPersistence,
): Promise<CapabilityToken> {
  const ttl = Math.min(input.ttlSeconds ?? DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS);
  const now = nowUnixMs();
  const tokenId = prefixedId('capabilityToken');

  const draft: Omit<CapabilityToken, 'signature'> = {
    token_id: tokenId,
    agent_instance_id: input.agentInstanceId,
    tool_id: input.toolId,
    granted_scope: input.grantedScope,
    max_invocations: input.maxInvocations ?? 1,
    invocations_used: 0,
    issued_at_unix_ms: now,
    expires_at_unix_ms: now + ttl * 1000,
    issued_by: 'a6_risk_officer',
  };

  const payload = canonicalPayload(draft);
  const signature = await signMessage(payload);
  const token: CapabilityToken = { ...draft, signature };

  await store.insert({
    ...token,
    organization_id: input.organizationId,
    mission_id: input.missionId,
  });

  return token;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  token?: CapabilityToken;
}

export async function verifyCapabilityToken(
  tokenId: string,
  toolId: string,
  requiredScope: ToolScope,
  store: CapabilityTokenPersistence,
): Promise<VerifyResult> {
  const stored = await store.findById(tokenId);
  if (!stored) return { valid: false, reason: 'token_not_found' };

  if (stored.revoked_at) return { valid: false, reason: 'token_revoked' };

  if (stored.expires_at_unix_ms < nowUnixMs()) {
    return { valid: false, reason: 'token_expired' };
  }

  if (stored.tool_id !== toolId) {
    return { valid: false, reason: 'tool_mismatch' };
  }

  if (stored.granted_scope !== requiredScope) {
    return { valid: false, reason: 'scope_insufficient' };
  }

  if (stored.invocations_used >= stored.max_invocations) {
    return { valid: false, reason: 'invocation_limit_reached' };
  }

  // Cryptographic verification of signature
  const payload = canonicalPayload(stored);
  const signatureOk = await verifySignature(payload, stored.signature);
  if (!signatureOk) {
    return { valid: false, reason: 'signature_invalid' };
  }

  return { valid: true, token: stored };
}

export async function consumeCapabilityToken(
  tokenId: string,
  toolId: string,
  requiredScope: ToolScope,
  store: CapabilityTokenPersistence,
): Promise<CapabilityToken> {
  const result = await verifyCapabilityToken(tokenId, toolId, requiredScope, store);
  if (!result.valid || !result.token) {
    throw new PermissionError(
      'capability.verification_failed',
      `Capability token verification failed: ${result.reason}`,
      { tokenId, toolId, requiredScope, reason: result.reason },
    );
  }
  await store.markUsed(tokenId);
  return result.token;
}

export async function revokeCapabilityToken(
  tokenId: string,
  reason: string,
  store: CapabilityTokenPersistence,
): Promise<void> {
  await store.revoke(tokenId, reason);
}
