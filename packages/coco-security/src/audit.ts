import { hashString, canonicalJson, prefixedId, nowUnixMs, ZERO_HASH } from '@coco/common';

/**
 * Tamper-evident audit logger.
 *
 * Every audit entry hash-chains to the previous entry in its organization.
 * Any mutation of a historical row breaks the chain from that point forward.
 * A nightly verification job walks the chain and alerts on breaks.
 */

export interface AuditEntry {
  audit_id: string;
  organization_id: string;
  user_id?: string;
  agent_id?: string;
  fabric: string;
  event_type: string;
  subject_kind: string;
  subject_id?: string;
  action: string;
  outcome: 'success' | 'failure' | 'denied' | 'blocked' | 'escalated';
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  correlation_id?: string;
  data?: Record<string, unknown>;
}

export interface AuditPersistence {
  fetchLastChainHash(organizationId: string): Promise<string | null>;
  insert(entry: AuditEntry & { prev_hash: string; chain_hash: string }): Promise<void>;
  fetchChainInRange(organizationId: string, since: Date, until: Date): Promise<Array<AuditEntry & { prev_hash: string; chain_hash: string; occurred_at: string }>>;
}

/**
 * Emit an audit event. Chain hash is computed atomically:
 *   chain_hash = sha256( canonicalJson(entry) + prev_hash )
 */
export async function emitAudit(entry: Omit<AuditEntry, 'audit_id'>, store: AuditPersistence): Promise<AuditEntry> {
  const audit_id = prefixedId('audit');
  const prev_hash = (await store.fetchLastChainHash(entry.organization_id)) ?? ZERO_HASH;

  const full: AuditEntry = { ...entry, audit_id };

  const canonicalForHash = canonicalJson({
    audit_id: full.audit_id,
    organization_id: full.organization_id,
    user_id: full.user_id ?? null,
    agent_id: full.agent_id ?? null,
    fabric: full.fabric,
    event_type: full.event_type,
    subject_kind: full.subject_kind,
    subject_id: full.subject_id ?? null,
    action: full.action,
    outcome: full.outcome,
    data: full.data ?? {},
    prev_hash,
  });

  const chain_hash = await hashString(canonicalForHash + prev_hash);

  await store.insert({ ...full, prev_hash, chain_hash });
  return full;
}

/**
 * Verify chain integrity across a time range.
 * Returns array of broken links if any exist; empty array means chain is intact.
 */
export interface ChainBreak {
  audit_id: string;
  occurred_at: string;
  expected_prev_hash: string;
  actual_prev_hash: string;
  expected_chain_hash: string;
  actual_chain_hash: string;
}

export async function verifyAuditChain(
  organizationId: string,
  since: Date,
  until: Date,
  store: AuditPersistence,
): Promise<ChainBreak[]> {
  const rows = await store.fetchChainInRange(organizationId, since, until);
  const breaks: ChainBreak[] = [];

  let expectedPrevHash = rows[0]?.prev_hash ?? ZERO_HASH;

  for (const row of rows) {
    if (row.prev_hash !== expectedPrevHash) {
      breaks.push({
        audit_id: row.audit_id,
        occurred_at: row.occurred_at,
        expected_prev_hash: expectedPrevHash,
        actual_prev_hash: row.prev_hash,
        expected_chain_hash: '(not computed - prev broken)',
        actual_chain_hash: row.chain_hash,
      });
    }

    const canonical = canonicalJson({
      audit_id: row.audit_id,
      organization_id: row.organization_id,
      user_id: row.user_id ?? null,
      agent_id: row.agent_id ?? null,
      fabric: row.fabric,
      event_type: row.event_type,
      subject_kind: row.subject_kind,
      subject_id: row.subject_id ?? null,
      action: row.action,
      outcome: row.outcome,
      data: row.data ?? {},
      prev_hash: row.prev_hash,
    });

    const computedHash = await hashString(canonical + row.prev_hash);
    if (computedHash !== row.chain_hash) {
      breaks.push({
        audit_id: row.audit_id,
        occurred_at: row.occurred_at,
        expected_prev_hash: row.prev_hash,
        actual_prev_hash: row.prev_hash,
        expected_chain_hash: computedHash,
        actual_chain_hash: row.chain_hash,
      });
    }

    expectedPrevHash = row.chain_hash;
  }

  return breaks;
}

// Convenience audit-event constants
export const AUDIT_EVENTS = {
  // Auth
  AUTH_LOGIN_SUCCEEDED: 'auth.login_succeeded',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_SESSION_CREATED: 'auth.session_created',
  AUTH_SESSION_REVOKED: 'auth.session_revoked',

  // Capability tokens
  CAPABILITY_TOKEN_ISSUED: 'capability.token_issued',
  CAPABILITY_TOKEN_USED: 'capability.token_used',
  CAPABILITY_TOKEN_DENIED: 'capability.token_denied',
  CAPABILITY_TOKEN_REVOKED: 'capability.token_revoked',
  CAPABILITY_TOKEN_EXPIRED: 'capability.token_expired',

  // Permissions
  PERMISSION_EVALUATED: 'policy.evaluated',
  PERMISSION_DENIED: 'policy.denied',

  // Sensitive actions
  DESTRUCTIVE_ACTION_BLOCKED: 'security.destructive_action_blocked',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_GRANTED: 'approval.granted',
  APPROVAL_DENIED: 'approval.denied',
} as const;

export type AuditEventType = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];
