import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const missionId = searchParams.get('mission_id');

    let q = client
      .schema('verification')
      .from('verifications')
      .select('*, level_results(*), critic_reports(*)')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false });

    if (missionId) q = q.eq('mission_id', missionId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ count: data?.length ?? 0, verifications: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch verification report';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
