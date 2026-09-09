import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(_req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await client
      .schema('tools')
      .from('sandboxes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('allocated_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ count: data?.length ?? 0, sandboxes: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list sandboxes';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
