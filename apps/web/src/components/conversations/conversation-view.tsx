'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, User, Bot, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface ConversationViewProps {
  conversationId: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json();
      if (res.ok) {
        setConversation(data.conversation);
        setMessages(data.messages ?? []);
      } else {
        toast.error(data.error || 'Failed to load conversation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;

    const content = draft.trim();
    setDraft('');
    setSending(true);

    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        message_id: tempId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, role: 'user' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.message_id === tempId ? data.message : m))
        );
      } else {
        toast.error(data.error || 'Failed to send');
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        setDraft(content);
      }
    } catch {
      toast.error('Network error');
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col border-zinc-800 bg-zinc-950/50 overflow-hidden h-[600px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-3">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {conversation?.title || 'Conversation'}
          </h3>
          <p className="text-[10px] font-mono text-zinc-500">
            {conversationId} · {messages.length} messages
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 italic">
            No messages yet. Start the conversation below.
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isCoco = m.role === 'coco' || m.role === 'assistant';
          return (
            <div
              key={m.message_id}
              className={cn('flex gap-3', isUser && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border',
                  isUser && 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',
                  isCoco && 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
                  !isUser && !isCoco && 'bg-zinc-800 border-zinc-700 text-zinc-400'
                )}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={cn(
                  'max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                  isUser && 'bg-indigo-600/20 border border-indigo-500/20 text-zinc-100',
                  isCoco && 'bg-zinc-900 border border-zinc-800 text-zinc-200',
                  !isUser && !isCoco && 'bg-zinc-900/50 border border-zinc-800/50 text-zinc-400'
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <div className="mt-1 text-[10px] font-mono text-zinc-600">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {m.response_mode && ` · ${m.response_mode}`}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-900/20 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500/50"
          disabled={sending}
        />
        <Button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 px-3"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}
