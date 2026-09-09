import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/coco/security/context';
import { createMissionEngine } from '@/lib/coco/kernel/factory';
import { emitAudit, AUDIT_EVENTS } from '@coco/security';
import { createAuditStore } from '@/lib/coco/security/store';

const CreateBody = z.object({
  objective: z.string().min(3).max(4000),
  tier: z.enum(['default', 'pro', 'ranger', 'enterprise']).default('default'),
  cognitive_depth: z.number().int().min(0).max(6).default(2),
  autonomy_level: z
    .enum(['l0_answer', 'l1_recommend', 'l2_reversible', 'l3_multistep', 'l4_checkpointed', 'l5_continuous'])
    .default('l1_recommend'),
  success_criteria: z.array(z.string()).default([]),
  run_bootstrap: z.boolean().default(true),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'invalid_body', detail: String(e) }, { status: 400 });
  }

  const engine = createMissionEngine();

  const mission = await engine.create({
    organization_id: session.organization_id,
    created_by: session.user_id,
    objective: body.objective,
    tier: body.tier,
    cognitive_depth: body.cognitive_depth,
    autonomy_level: body.autonomy_level,
    success_criteria: body.success_criteria,
  });

  // Audit
  try {
    await emitAudit(
      {
        organization_id: session.organization_id,
        user_id: session.user_id,
        fabric: 'kernel',
        event_type: AUDIT_EVENTS.PERMISSION_EVALUATED,
        subject_kind: 'mission',
        subject_id: mission.mission_id,
        action: 'mission.create',
        outcome: 'success',
        data: { objective: body.objective, tier: body.tier },
      },
      createAuditStore(),
    );
  } catch (err) {
    console.error('[missions] audit failed (non-fatal)', err);
  }

  // Fire-and-forget bootstrap progression so the response returns immediately
  if (body.run_bootstrap) {
    // Don't await — let it run in background while client polls timeline
    void engine
      .runBootstrap(mission.mission_id, { delayMs: 600, actorId: 'system:bootstrap' })
      .catch((err) => console.error('[missions] bootstrap failed', err));
  }

  return NextResponse.json({ ok: true, mission }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const engine = createMissionEngine();
  const missions = await engine.list(session.organization_id, 30);
  return NextResponse.json({ ok: true, missions });
}
