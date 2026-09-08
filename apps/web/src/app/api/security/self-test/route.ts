import { NextResponse } from 'next/server';
import { emitAudit, verifyAuditChain, AUDIT_EVENTS } from '@coco/security';
import { getSession } from '@/lib/coco/security/context';
import { createAuditStore } from '@/lib/coco/security/store';

/**
 * Self-test endpoint: emits a live audit event, then verifies the chain integrity
 * across the last hour. Returns full result for browser or CI validation.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const store = createAuditStore();

  try {
    const entry = await emitAudit(
      {
        organization_id: session.organization_id,
        user_id: session.user_id,
        fabric: 'security',
        event_type: AUDIT_EVENTS.PERMISSION_EVALUATED,
        subject_kind: 'self_test',
        subject_id: session.user_id,
        action: 'security.self_test',
        outcome: 'success',
        data: {
          triggered_from: 'security.self-test endpoint',
          timestamp: new Date().toISOString(),
        },
      },
      store,
    );

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const until = new Date(Date.now() + 60 * 1000);
    const breaks = await verifyAuditChain(session.organization_id, since, until, store);

    return NextResponse.json({
      ok: true,
      audit_id: entry.audit_id,
      chain_intact: breaks.length === 0,
      chain_breaks: breaks,
      window: { since: since.toISOString(), until: until.toISOString() },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
