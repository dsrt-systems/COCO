import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: conversation, error } = await client
      .schema('memory')
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('conversation_id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages, error: msgErr } = await client
      .schema('memory')
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgErr) throw new Error(msgErr.message);

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get conversation';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string') updates.title = body.title;
    if (typeof body.summary === 'string') updates.summary = body.summary;

    const { data, error } = await client
      .schema('memory')
      .from('conversations')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('conversation_id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ conversation: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update conversation';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
