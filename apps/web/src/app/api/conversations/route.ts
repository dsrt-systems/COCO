import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';
import { z } from 'zod';

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  project_id: z.string().optional(),
  initial_message: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    let q = client
      .schema('memory')
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (projectId) q = q.eq('project_id', projectId);

    const { data, error } = await q.limit(50);
    if (error) throw new Error(error.message);

    return NextResponse.json({ count: data?.length ?? 0, conversations: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list conversations';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateConversationSchema.parse(body);

    const convId = prefixedId('conv');
    const now = new Date().toISOString();

    const { data: conv, error } = await client
      .schema('memory')
      .from('conversations')
      .insert({
        conversation_id: convId,
        organization_id: organizationId,
        user_id: user.id,
        project_id: parsed.project_id ?? null,
        title: parsed.title ?? 'New Conversation',
        message_count: parsed.initial_message ? 1 : 0,
        last_message_at: parsed.initial_message ? now : null,
        created_at: now,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    let message = null;
    if (parsed.initial_message) {
      const msgId = prefixedId('msg');
      const { data: msg, error: msgErr } = await client
        .schema('memory')
        .from('messages')
        .insert({
          message_id: msgId,
          conversation_id: convId,
          organization_id: organizationId,
          role: 'user',
          content: parsed.initial_message,
          created_at: now,
        })
        .select('*')
        .single();

      if (msgErr) throw new Error(msgErr.message);
      message = msg;
    }

    return NextResponse.json({ conversation: conv, message }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create conversation';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
