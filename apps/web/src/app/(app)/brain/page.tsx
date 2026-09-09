'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState<'memories' | 'compiler' | 'decisions' | 'graph'>('memories');

  // Memory Inspector state
  const [memories, setMemories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState('');
  const [loading, setLoading] = useState(false);

  // New Memory state
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newScope, setNewScope] = useState('semantic');

  // Compiler state
  const [compileQuery, setCompileQuery] = useState('What are the system constraints?');
  const [compiledPacket, setCompiledPacket] = useState<any>(null);
  const [compiling, setCompiling] = useState(false);

  // Decisions state
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    fetchMemories();
    fetchDecisions();
  }, []);

  async function fetchMemories() {
    setLoading(true);
    try {
      let url = '/api/context/memory';
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedScope) params.set('scope', selectedScope);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setMemories(data.memories ?? []);
      } else {
        toast.error(data.error || 'Failed to fetch memories');
      }
    } catch {
      toast.error('Network error loading memories');
    } finally {
      setLoading(false);
    }
  }

  async function handleWriteMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject || !newPredicate || !newValue) {
      toast.error('Subject, predicate, and value are required');
      return;
    }

    try {
      const res = await fetch('/api/context/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: newScope,
          subject: newSubject,
          predicate: newPredicate,
          value: newValue,
          source: 'user_input',
          confidence: 0.9,
          importance: 0.7,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Memory written (${data.embedded ? 'embedded' : 'text-only'})`);
        setNewSubject('');
        setNewPredicate('');
        setNewValue('');
        fetchMemories();
      } else {
        toast.error(data.error || 'Failed to write memory');
      }
    } catch {
      toast.error('Network error writing memory');
    }
  }

  async function handleCompileContext(e: React.FormEvent) {
    e.preventDefault();
    setCompiling(true);
    try {
      const res = await fetch('/api/context/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'UI Playground Compilation',
          query: compileQuery,
          max_memories: 10,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompiledPacket(data.packet);
        toast.success('Context packet compiled with prompt injection defense');
      } else {
        toast.error(data.error || 'Compilation failed');
      }
    } catch {
      toast.error('Network error compiling context');
    } finally {
      setCompiling(false);
    }
  }

  async function fetchDecisions() {
    try {
      const res = await fetch('/api/context/decisions');
      const data = await res.json();
      if (res.ok) {
        setDecisions(data.decisions ?? []);
      }
    } catch {}
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Context Fabric Operations
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage COCO's 7 memory scopes, vector search, decisions, and context compilation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-2">
        {[
          { id: 'memories', label: '7 Memory Scopes' },
          { id: 'compiler', label: 'Context Compiler' },
          { id: 'decisions', label: 'Decision Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: 7 Memory Scopes */}
      {activeTab === 'memories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Write Memory Form */}
          <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100">Write New Memory</h2>
            <form onSubmit={handleWriteMemory} className="space-y-4">
              <div className="space-y-1">
                <Label>Scope</Label>
                <select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  {[
                    'working',
                    'conversation',
                    'episodic',
                    'semantic',
                    'procedural',
                    'project',
                    'organizational',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Subject</Label>
                <Input
                  placeholder="e.g., Auth Architecture"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <Label>Predicate</Label>
                <Input
                  placeholder="e.g., uses_provider"
                  value={newPredicate}
                  onChange={(e) => setNewPredicate(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <Label>Value</Label>
                <Input
                  placeholder="e.g., Supabase Auth with Magic Link"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500">
                Write & Embed Memory
              </Button>
            </form>
          </Card>

          {/* Memory Inspector List */}
          <Card className="lg:col-span-2 p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                Memories ({memories.length})
              </h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Vector / Text Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMemories()}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs w-48"
                />
                <Button onClick={fetchMemories} variant="outline" size="sm" className="text-xs">
                  Search
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {loading ? (
                <p className="text-sm text-zinc-500">Searching vector space...</p>
              ) : memories.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center">No memories found</p>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.memory_id}
                    className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                        {m.scope.toUpperCase()}
                      </span>
                      <span className="text-zinc-500 font-mono">{m.memory_id}</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                      <span className="text-indigo-400">{m.subject}</span>{' '}
                      <span className="text-zinc-400 font-mono text-xs">{m.predicate}</span>{' '}
                      <span className="text-zinc-100">{m.value}</span>
                    </div>
                    <div className="flex gap-4 text-[11px] text-zinc-500">
                      <span>Source: {m.source}</span>
                      <span>Confidence: {m.confidence}</span>
                      <span>Status: {m.status}</span>
                      {m.score !== undefined && (
                        <span className="text-emerald-400 font-mono">
                          Score: {m.score.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Context Compiler Playground */}
      {activeTab === 'compiler' && (
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Context Packet Compiler</h2>
            <p className="text-xs text-zinc-400">
              Retrieves memories and compiles a token-bounded prompt with injection defense
              tags.
            </p>
          </div>

          <form onSubmit={handleCompileContext} className="flex gap-2">
            <Input
              value={compileQuery}
              onChange={(e) => setCompileQuery(e.target.value)}
              placeholder="Query to retrieve context for..."
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
            <Button type="submit" disabled={compiling} className="bg-indigo-600 hover:bg-indigo-500">
              {compiling ? 'Compiling...' : 'Compile Context'}
            </Button>
          </form>

          {compiledPacket && (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              <div className="flex gap-6 text-xs text-zinc-400 font-mono">
                <span>Packet ID: {compiledPacket.packet_id}</span>
                <span>Tokens: ~{compiledPacket.token_count}</span>
                <span>Hash: {compiledPacket.packet_hash.slice(0, 16)}...</span>
                <span>Memories Included: {compiledPacket.included_memory_ids.length}</span>
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Compiled Prompt Content:</Label>
                <textarea
                  readOnly
                  value={compiledPacket.packet_content}
                  className="w-full h-80 rounded-md border border-zinc-800 bg-zinc-900 p-4 text-xs font-mono text-emerald-300 leading-relaxed"
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Decision Log */}
      {activeTab === 'decisions' && (
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100">Decision Log ({decisions.length})</h2>
          <div className="space-y-3">
            {decisions.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">No decisions recorded yet</p>
            ) : (
              decisions.map((d) => (
                <div key={d.decision_id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-400 font-semibold">
                      Decision #{d.decision_number}
                    </span>
                    <span className="text-zinc-500 font-mono">{d.decision_id}</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-200">{d.question}</p>
                  <p className="text-xs text-emerald-400">
                    Selected: <span className="font-semibold">{d.selected_option}</span>
                  </p>
                  <p className="text-xs text-zinc-400">{d.reasoning}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
