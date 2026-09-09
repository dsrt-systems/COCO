import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { TelemetryIngestion } from '@coco/evolution';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.mission_id) {
      return NextResponse.json({ error: 'mission_id is required' }, { status: 400 });
    }

    const ingestion = new TelemetryIngestion(client);
    const record = await ingestion.finalizeOutcome(body.mission_id, organizationId);

    return NextResponse.json({ record }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Outcome finalization failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
