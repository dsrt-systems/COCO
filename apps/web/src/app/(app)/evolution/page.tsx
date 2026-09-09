'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dna, CheckCircle2, XCircle, Play, Loader2, GitMerge, FileArchive, ShieldAlert } from 'lucide-react';

export default function EvolutionPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [propRes, bundleRes] = await Promise.all([
        fetch('/api/evolution/proposals?status=pending_review'),
        fetch('/api/evolution/bundle')
      ]);

      if (propRes.ok) {
        const pData = await propRes.json();
        setProposals(pData.proposals ?? []);
      }
      
      if (bundleRes.ok) {
        const bData = await bundleRes.json();
        setBundle(bData.bundle);
      }
    } catch {
      toast.error('Failed to load evolution data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunNightly() {
    setRunningJob(true);
    try {
      const res = await fetch('/api/evolution/nightly', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Nightly job completed! ${data.report.proposals.proposals_created} proposals generated.`);
        fetchData();
      } else {
        toast.error(data.error || 'Nightly job failed');
      }
    } catch {
      toast.error('Network error running nightly job');
    } finally {
      setRunningJob(false);
    }
  }

  async function handleDecide(proposalId: string, decision: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/evolution/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: proposalId, decision, reason: 'UI Action' }),
      });
      if (res.ok) {
        toast.success(`Proposal ${decision}`);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Decision failed');
      }
    } catch {
      toast.error('Network error');
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Dna className="w-8 h-8 text-fuchsia-400" /> Evolution Fabric
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Closed-loop learning from telemetry. Approve proposals to publish new policy bundles.
          </p>
        </div>
        <Button onClick={handleRunNightly} disabled={runningJob} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold">
          {runningJob ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {runningJob ? 'Running Learners...' : 'Trigger Nightly Job'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Proposals Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-indigo-400" /> Pending Proposals
            </h2>
            <span className="text-xs font-mono text-zinc-500">{proposals.length} pending</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : proposals.length === 0 ? (
            <Card className="p-8 border-zinc-800 bg-zinc-950/40 text-center text-sm text-zinc-500">
              No pending proposals. Run the nightly job to trigger learners.
            </Card>
          ) : (
            <div className="space-y-4">
              {proposals.map((p) => {
                const isMajor = p.severity === 'major';
                return (
                  <Card key={p.proposal_id} className={`p-5 border-zinc-800 bg-zinc-950/50 space-y-4 ${isMajor ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400">
                            {p.proposal_kind.replace('_', ' ')}
                          </span>
                          {isMajor && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-950 text-amber-400 border border-amber-500/20">
                              <ShieldAlert className="w-3 h-3" /> MAJOR SEVERITY
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-100">{p.subject_id}</h3>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">from {p.proposer} · {p.proposal_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleDecide(p.proposal_id, 'rejected')} variant="outline" size="sm" className="h-8 border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300">
                          <XCircle className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                        <Button onClick={() => handleDecide(p.proposal_id, 'approved')} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Expected Impact</span>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Quality:</span>
                            <span className={p.expected_impact.quality_delta > 0 ? 'text-emerald-400' : 'text-zinc-300'}>
                              {p.expected_impact.quality_delta > 0 ? '+' : ''}{p.expected_impact.quality_delta.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Cost (USD/call):</span>
                            <span className="text-zinc-300">${p.expected_impact.cost_delta_usd_per_call.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Evidence Base</span>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Sample Size:</span>
                            <span className="text-indigo-400">{p.evidence.sample_size} outcomes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Window:</span>
                            <span className="text-zinc-300">{p.evidence.window_kind}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500 uppercase tracking-wider text-[10px] block mb-1">Rollout Plan</span>
                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        {p.rollout_plan.stages?.length > 0 
                          ? `${p.shadow_duration_hours}h Shadow → ${p.rollout_plan.stages.map((s:any) => `${s.traffic_percent}%`).join(' → ')}`
                          : 'Immediate Activation'}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Policy Bundle */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-emerald-400" /> Active Policy Bundle
          </h2>
          
          <Card className="p-5 border-zinc-800 bg-zinc-950/50 space-y-4">
            {bundle ? (
              <>
                <div className="space-y-1 border-b border-zinc-800/60 pb-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Version</div>
                  <div className="text-sm font-mono text-emerald-400 font-bold">{bundle.bundle_version}</div>
                  <div className="text-xs text-zinc-500">{new Date(bundle.published_at).toLocaleString()}</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Components</div>
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-300">Router Overrides</span>
                    <span className="text-indigo-400 font-mono">{Object.keys(bundle.manifest.components.router || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-300">Prompt Templates</span>
                    <span className="text-indigo-400 font-mono">{Object.keys(bundle.manifest.components.prompts || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-300">Agent Versions</span>
                    <span className="text-indigo-400 font-mono">{Object.keys(bundle.manifest.components.agents || {}).length}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Signature (SHA-256)</div>
                  <div className="text-[10px] font-mono text-zinc-600 break-all bg-zinc-900 p-2 rounded">
                    {bundle.signature}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-500 text-center py-6">
                No policy bundles published yet. Approve proposals and run the nightly job.
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
