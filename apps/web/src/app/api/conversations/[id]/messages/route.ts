import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';
import { z } from 'zod';

const PostMessageSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'coco', 'system', 'tool']).default('user'),
  mission_id: z.string().optional(),
  content_structured: z.record(z.unknown()).optional(),
  attachments: z.array(z.unknown()).default([]),
  response_mode: z.string().optional(),
  produced_by_run: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await req.json();
    const parsed = PostMessageSchema.parse(body);

    // Verify conversation belongs to this org
    const { data: conv, error: convErr } = await client
      .schema('memory')
      .from('conversations')
      .select('conversation_id, message_count')
      .eq('organization_id', organizationId)
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (convErr) throw new Error(convErr.message);
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const msgId = prefixedId('msg');
    const now = new Date().toISOString();

    const { data: message, error } = await client
      .schema('memory')
      .from('messages')
      .insert({
        message_id: msgId,
        conversation_id: conversationId,
        organization_id: organizationId,
        mission_id: parsed.mission_id ?? null,
        role: parsed.role,
        content: parsed.content,
        content_structured: parsed.content_structured ?? null,
        attachments: parsed.attachments,
        response_mode: parsed.response_mode ?? null,
        produced_by_run: parsed.produced_by_run ?? null,
        created_at: now,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Bump conversation metadata
    await client
      .schema('memory')
      .from('conversations')
      .update({
        message_count: (conv.message_count ?? 0) + 1,
        last_message_at: now,
      })
      .eq('conversation_id', conversationId);

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to post message';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
