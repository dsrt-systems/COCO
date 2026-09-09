import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ProposalEngine } from '@coco/evolution';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const kind = searchParams.get('kind') ?? undefined;

    const engine = new ProposalEngine(client);
    const proposals = await engine.listProposals({ status, kind });

    return NextResponse.json({ count: proposals.length, proposals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'List failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { proposal_id, decision, reason } = body;

    if (!proposal_id || (decision !== 'approved' && decision !== 'rejected')) {
      return NextResponse.json({ error: 'Valid proposal_id and decision required' }, { status: 400 });
    }

    const engine = new ProposalEngine(client);
    await engine.decideProposal(proposal_id, decision, user.id, reason);

    return NextResponse.json({ ok: true, proposal_id, decision });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Decision failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
