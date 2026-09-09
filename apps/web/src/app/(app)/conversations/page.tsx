'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageSquare, Plus, Loader2, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    setLoading(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (res.ok) setConversations(data.conversations ?? []);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'New Conversation',
          initial_message: initialMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Conversation created');
        router.push(`/conversations/${data.conversation.conversation_id}`);
      } else {
        toast.error(data.error || 'Failed to create');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-indigo-400" /> Conversations
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Threaded dialogue with COCO — persisted, searchable, project-linkable.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="w-4 h-4 mr-2" /> New
        </Button>
      </div>

      {showCreate && (
        <Card className="p-5 border-indigo-500/30 bg-indigo-500/5 space-y-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <Label>First Message</Label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="What do you want to discuss?"
                className="w-full h-20 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Start Conversation
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="border-zinc-700">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <Card className="p-12 border-zinc-800 bg-zinc-950/50 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No conversations yet</h3>
          <p className="text-sm text-zinc-500">Start a threaded dialogue with COCO.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link key={c.conversation_id} href={`/conversations/${c.conversation_id}`}>
              <Card className="p-4 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer group flex items-center gap-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                    {c.title || 'Untitled'}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    {c.message_count} messages
                    {c.last_message_at && ` · last ${new Date(c.last_message_at).toLocaleString()}`}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
