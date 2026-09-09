import { NextResponse } from 'next/server';
import { BUILTIN_MODEL_REGISTRY } from '@coco/model-fabric';
import { getSession } from '@/lib/coco/security/context';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    models: BUILTIN_MODEL_REGISTRY,
  });
}
