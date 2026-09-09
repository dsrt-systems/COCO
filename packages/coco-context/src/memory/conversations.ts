import { prefixedId } from '@coco/common';
import type { ContextEnv } from '../env.js';

export async function createConversation(
  env: ContextEnv,
  title: string,
  project_id?: string
) {
  if (!env.userId) throw new Error('userId required for conversation');
  const convId = prefixedId('conv');
  const { data, error } = await env.supabase
    .schema('memory')
    .from('conversations')
    .insert({
      conversation_id: convId,
      organization_id: env.organizationId,
      user_id: env.userId,
      project_id: project_id ?? null,
      title,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Conversation creation failed: ${error.message}`);
  return data;
}

export async function addMessage(
  env: ContextEnv,
  conversationId: string,
  role: 'user' | 'coco' | 'system' | 'tool',
  content: string,
  missionId?: string
) {
  const msgId = prefixedId('msg');
  const { data, error } = await env.supabase
    .schema('memory')
    .from('messages')
    .insert({
      message_id: msgId,
      conversation_id: conversationId,
      organization_id: env.organizationId,
      mission_id: missionId ?? null,
      role,
      content,
    })
    .select('*')
    .single();
    
  if (error) throw new Error(`Message insertion failed: ${error.message}`);
  
  // Bump last_message_at
  await env.supabase
    .schema('memory')
    .from('conversations')
    .update({ 
      last_message_at: new Date().toISOString(),
      message_count: data.message_count // Ideally via DB trigger
    })
    .eq('conversation_id', conversationId);
    
  return data;
}
