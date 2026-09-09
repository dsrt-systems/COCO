import { NextResponse } from 'next/server';
import { getSession } from '@/lib/coco/security/context';
import { createMissionEngine } from '@/lib/coco/kernel/factory';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  const { id } = await context.params;
  const engine = createMissionEngine();
  const mission = await engine.get(id);

  if (!mission) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  if (mission.organization_id !== session.organization_id) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, mission });
}
