'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Scale, Plus, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DecisionLogProps {
  projectId: string;
}

export function DecisionLog({ projectId }: DecisionLogProps) {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [selected, setSelected] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [confidence, setConfidence] = useState(0.8);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/decisions`);
      const data = await res.json();
      if (res.ok) setDecisions(data.decisions ?? []);
      else toast.error(data.error || 'Failed to load decisions');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !optionA || !optionB || !selected || !reasoning) {
      toast.error('Fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options: [
            { name: optionA, description: optionA },
            { name: optionB, description: optionB },
          ],
          selected_option: selected,
          reasoning,
          confidence,
          reversible: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Decision #${data.decision.decision_number} recorded`);
        setShowForm(false);
        setQuestion('');
        setOptionA('');
        setOptionB('');
        setSelected('');
        setReasoning('');
        fetchDecisions();
      } else {
        toast.error(data.error || 'Failed to record decision');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Decision Log
            <span className="ml-2 text-xs font-mono text-zinc-500">{decisions.length}</span>
          </h2>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="h-8 bg-amber-600 hover:bg-amber-500 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Record Decision
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 border-amber-500/30 bg-amber-500/5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Question</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Should we use Postgres or DynamoDB?"
                className="bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Option A</Label>
                <Input value={optionA} onChange={(e) => setOptionA(e.target.value)} placeholder="Postgres" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>
              <div className="space-y-1">
                <Label>Option B</Label>
                <Input value={optionB} onChange={(e) => setOptionB(e.target.value)} placeholder="DynamoDB" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Selected Option</Label>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">Choose…</option>
                  {optionA && <option value={optionA}>{optionA}</option>}
                  {optionB && <option value={optionB}>{optionB}</option>}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Confidence ({(confidence * 100).toFixed(0)}%)</Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reasoning</Label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Why was this option selected? What tradeoffs were considered?"
                className="w-full h-24 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-500">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Record
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      ) : decisions.length === 0 ? (
        <Card className="p-8 border-zinc-800 bg-zinc-950/40 text-center text-sm text-zinc-500">
          No decisions recorded yet. Important architectural choices should be logged here.
        </Card>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => {
            const expanded = expandedId === d.decision_id;
            return (
              <Card
                key={d.decision_id}
                className="border-zinc-800 bg-zinc-950/50 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : d.decision_id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-400">#{d.decision_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100">{d.question}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-emerald-400 font-semibold">
                        → {d.selected_option}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {(d.confidence * 100).toFixed(0)}% conf
                      </span>
                      {!d.reversible && (
                        <span className="flex items-center gap-1 text-[10px] text-red-400">
                          <AlertTriangle className="w-3 h-3" /> irreversible
                        </span>
                      )}
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  )}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800/60 pt-3 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Reasoning</div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{d.reasoning}</p>
                    </div>
                    {Array.isArray(d.options) && d.options.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Options Considered</div>
                        <div className="flex flex-wrap gap-2">
                          {d.options.map((o: any, i: number) => (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded text-xs border ${
                                o.name === d.selected_option
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {o.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(d.risks) && d.risks.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Risks</div>
                        <ul className="text-xs text-zinc-400 space-y-0.5">
                          {d.risks.map((r: string, i: number) => (
                            <li key={i}>• {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-zinc-600">
                      {d.decision_id} · {new Date(d.created_at).toLocaleString()} · by {d.created_by_agent}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
