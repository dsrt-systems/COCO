import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { NightlyEvolutionJob } from '@coco/evolution';

export async function POST(req: Request) {
  try {
    // In prod, secure this via CRON_SECRET header matching.
    // For dev/UI testing, we allow authenticated org users to trigger it.
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = new NightlyEvolutionJob(client);
    const report = await job.run(organizationId);

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nightly job failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
