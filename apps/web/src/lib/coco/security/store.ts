import type { AuditEntry, AuditPersistence, CapabilityTokenPersistence } from '@coco/security';
import type { CapabilityToken } from '@coco/protocol';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Concrete Supabase-backed store for the security package's abstract interfaces.
 * Uses the service-role client to bypass RLS — security fabric operates at
 * elevated authority and enforces its own boundaries.
 */

export function createAuditStore(): AuditPersistence {
  const supabase = createServiceClient();

  return {
    async fetchLastChainHash(organizationId: string): Promise<string | null> {
      const { data, error } = await supabase
        .schema('security')
        .from('audit_log')
        .select('chain_hash')
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.chain_hash ?? null;
    },

    async insert(entry): Promise<void> {
      const { error } = await supabase.schema('security').from('audit_log').insert({
        audit_id: entry.audit_id,
        organization_id: entry.organization_id,
        user_id: entry.user_id,
        agent_id: entry.agent_id,
        fabric: entry.fabric,
        event_type: entry.event_type,
        subject_kind: entry.subject_kind,
        subject_id: entry.subject_id,
        action: entry.action,
        outcome: entry.outcome,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        request_id: entry.request_id,
        correlation_id: entry.correlation_id,
        data: entry.data ?? {},
        prev_hash: entry.prev_hash,
        chain_hash: entry.chain_hash,
      });
      if (error) throw error;
    },

    async fetchChainInRange(
      organizationId: string,
      since: Date,
      until: Date,
    ): Promise<Array<AuditEntry & { prev_hash: string; chain_hash: string; occurred_at: string }>> {
      const { data, error } = await supabase
        .schema('security')
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('occurred_at', since.toISOString())
        .lte('occurred_at', until.toISOString())
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<AuditEntry & { prev_hash: string; chain_hash: string; occurred_at: string }>;
    },
  };
}

export function createCapabilityTokenStore(): CapabilityTokenPersistence {
  const supabase = createServiceClient();

  return {
    async insert(token): Promise<void> {
      const { error } = await supabase.schema('security').from('capability_tokens').insert({
        token_id: token.token_id,
        organization_id: token.organization_id,
        mission_id: token.mission_id,
        agent_instance_id: token.agent_instance_id,
        tool_id: token.tool_id,
        granted_scope: token.granted_scope,
        max_invocations: token.max_invocations,
        invocations_used: token.invocations_used,
        issued_by: token.issued_by,
        signature: token.signature,
        issued_at: new Date(token.issued_at_unix_ms).toISOString(),
        expires_at: new Date(token.expires_at_unix_ms).toISOString(),
      });
      if (error) throw error;
    },

    async findById(tokenId: string): Promise<(CapabilityToken & { organization_id: string; revoked_at?: string | null }) | null> {
      const { data, error } = await supabase
        .schema('security')
        .from('capability_tokens')
        .select('*')
        .eq('token_id', tokenId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        token_id: data.token_id,
        agent_instance_id: data.agent_instance_id,
        tool_id: data.tool_id,
        granted_scope: data.granted_scope,
        max_invocations: data.max_invocations,
        invocations_used: data.invocations_used,
        issued_at_unix_ms: new Date(data.issued_at).getTime(),
        expires_at_unix_ms: new Date(data.expires_at).getTime(),
        issued_by: data.issued_by,
        signature: data.signature,
        organization_id: data.organization_id,
        revoked_at: data.revoked_at,
      };
    },

    async markUsed(tokenId: string): Promise<void> {
      const { data: current, error: fetchError } = await supabase
        .schema('security')
        .from('capability_tokens')
        .select('invocations_used')
        .eq('token_id', tokenId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .schema('security')
        .from('capability_tokens')
        .update({ invocations_used: (current.invocations_used ?? 0) + 1 })
        .eq('token_id', tokenId);
      if (error) throw error;
    },

    async revoke(tokenId: string, reason: string): Promise<void> {
      const { error } = await supabase
        .schema('security')
        .from('capability_tokens')
        .update({
          revoked_at: new Date().toISOString(),
          revoke_reason: reason,
        })
        .eq('token_id', tokenId);
      if (error) throw error;
    },
  };
}
