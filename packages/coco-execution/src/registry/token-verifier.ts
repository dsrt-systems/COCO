import type { SupabaseClient } from '@supabase/supabase-js';

export interface CapabilityTokenRecord {
  token_id: string;
  agent_instance_id: string;
  tool_id: string;
  granted_scope: string;
  max_invocations: number;
  invocations_used: number;
  expires_at: string;
  revoked_at: string | null;
  signature: string;
}

export interface TokenVerifyResult {
  valid: boolean;
  reason?: string;
  token?: CapabilityTokenRecord;
}

/**
 * Verifies a capability token per Deep Spec 8 §4.2:
 * - Token exists
 * - Not revoked
 * - Not expired
 * - invocations_used < max_invocations
 * - Matches requested tool
 * - Signature verification (delegated to @coco/security, deferred to full integration)
 */
export class TokenVerifier {
  constructor(private readonly supabase: SupabaseClient) {}

  async verify(
    tokenId: string,
    agentInstanceId: string,
    toolId: string
  ): Promise<TokenVerifyResult> {
    const { data, error } = await this.supabase
      .schema('security')
      .from('capability_tokens')
      .select('*')
      .eq('token_id', tokenId)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, reason: 'token_not_found' };
    }

    const token = data as CapabilityTokenRecord;

    if (token.revoked_at) {
      return { valid: false, reason: 'token_revoked', token };
    }
    if (new Date(token.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: 'token_expired', token };
    }
    if (token.invocations_used >= token.max_invocations) {
      return { valid: false, reason: 'invocations_exhausted', token };
    }
    if (token.agent_instance_id !== agentInstanceId) {
      return { valid: false, reason: 'agent_mismatch', token };
    }
    if (token.tool_id !== toolId) {
      return { valid: false, reason: 'tool_mismatch', token };
    }

    return { valid: true, token };
  }

  async incrementUsage(tokenId: string): Promise<void> {
    const { data } = await this.supabase
      .schema('security')
      .from('capability_tokens')
      .select('invocations_used')
      .eq('token_id', tokenId)
      .maybeSingle();

    const current = data?.invocations_used ?? 0;

    await this.supabase
      .schema('security')
      .from('capability_tokens')
      .update({ invocations_used: current + 1 })
      .eq('token_id', tokenId);
  }
}
