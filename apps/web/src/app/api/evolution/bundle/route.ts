import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { PolicyBundleBuilder } from '@coco/evolution';

export async function GET() {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const builder = new PolicyBundleBuilder(client);
    const bundle = await builder.getLatest();

    if (!bundle) return NextResponse.json({ error: 'No bundles published' }, { status: 404 });
    return NextResponse.json({ bundle });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
