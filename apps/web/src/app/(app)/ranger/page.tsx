'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Compass, Play, ShieldAlert, Loader2, DollarSign, Clock, Layers } from 'lucide-react';

export default function RangerConsolePage() {
  const [objective, setObjective] = useState('');
  const [maxCost, setMaxCost] = useState('25.00');
  const [autonomy, setAutonomy] = useState('l3_multistep');
  const [running, setRunning] = useState(false);
  const [activeResult, setActiveResult] = useState<any>(null);

  async function handleStartRanger(e: React.FormEvent) {
    e.preventDefault();
    if (!objective.trim()) {
      toast.error('Mission objective is required');
      return;
    }

    setRunning(true);
    setActiveResult(null);
    try {
      const res = await fetch('/api/ranger/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: objective.trim(),
          max_cost_usd: parseFloat(maxCost) || 25.0,
          autonomy_level: autonomy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Ranger Mission Started: ${data.result.mission_id}`);
        setActiveResult(data.result);
      } else {
        toast.error(data.error || 'Failed to start Ranger mission');
      }
    } catch {
      toast.error('Network error starting Ranger mission');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Compass className="w-8 h-8 text-amber-400" /> Ranger Autonomous Console
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Execute multi-hour, multi-step autonomous missions with durable checkpoints, budget enforcement, and autonomy gates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charter Wizard */}
        <Card className="p-6 border-amber-500/30 bg-amber-500/5 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" /> Issue Mission Charter
          </h2>
          <form onSubmit={handleStartRanger} className="space-y-4">
            <div className="space-y-1">
              <Label>Objective</Label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Audit security vulnerabilities across project Acme and generate compliance report."
                className="w-full h-28 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1">
              <Label>Autonomy Level</Label>
              <select
                value={autonomy}
                onChange={(e) => setAutonomy(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="l1_recommend">L1 - Recommend Only</option>
                <option value="l2_reversible">L2 - Reversible Sandbox Actions</option>
                <option value="l3_multistep">L3 - Multi-Step Autonomous DAG</option>
                <option value="l4_checkpointed">L4 - Long Autonomous Run (Ranger)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Max Spend (USD)</Label>
              <Input
                type="number"
                step="5.00"
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono"
              />
            </div>

            <Button type="submit" disabled={running} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold">
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {running ? 'Supervisor Running...' : 'Authorize & Start Mission'}
            </Button>
          </form>
        </Card>

        {/* Live Execution Output */}
        <Card className="lg:col-span-2 p-6 border-zinc-800 bg-zinc-950/50 space-y-6">
          <h2 className="text-lg font-semibold text-zinc-100">Supervisor Status & Checkpoints</h2>

          {!activeResult && !running && (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
              <Compass className="w-8 h-8 text-zinc-700 mb-2" />
              Issue a charter to launch the Ranger Supervisor.
            </div>
          )}

          {running && (
            <div className="p-8 border border-amber-500/30 bg-amber-500/10 rounded-xl flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm font-medium text-amber-300">Ranger Supervisor executing autonomous loop...</p>
              <p className="text-xs text-zinc-500">Creating checkpoints and evaluating task gates</p>
            </div>
          )}

          {activeResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Phase
                  </div>
                  <div className="text-lg font-bold font-mono text-indigo-400 uppercase">{activeResult.phase}</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Checkpoints
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-400">{activeResult.checkpoints_taken}</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Cost Accrued
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-400">${activeResult.total_cost_usd.toFixed(4)}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono space-y-1 text-zinc-300">
                <div>Mission ID: <span className="text-indigo-400">{activeResult.mission_id}</span></div>
                <div>Completed Tasks: <span className="text-emerald-400">{activeResult.completed_tasks}</span></div>
                <div>Status: <span className="text-emerald-400">SUCCESS</span></div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
