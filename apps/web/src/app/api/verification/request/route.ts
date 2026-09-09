import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { VerificationOrchestrator } from '@coco/verification';
import { VerificationRequestSchema } from '@coco/protocol';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsedRequest = VerificationRequestSchema.parse(body);

    const orchestrator = new VerificationOrchestrator({
      supabase: client,
      organizationId,
    });

    const result = await orchestrator.verify(parsedRequest);

    return NextResponse.json({ result }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
