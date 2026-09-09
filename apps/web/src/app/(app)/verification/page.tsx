'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2, ChevronRight, XCircle } from 'lucide-react';

export default function VerificationPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const [missionId, setMissionId] = useState('');
  const [domain, setDomain] = useState('software');
  const [targetLevel, setTargetLevel] = useState(10);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch('/api/verification/report');
      const data = await res.json();
      if (res.ok) setReports(data.verifications ?? []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!missionId) {
      toast.error('Mission ID is required');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/verification/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: missionId,
          requesting_agent_id: 'A1_coco_director',
          target_level: targetLevel,
          domain,
          critic_agent_id: targetLevel >= 9 ? 'A3_universal_critic' : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Verification complete! Verdict: ${data.result.verdict}`);
        fetchReports();
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Network error executing verification');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-fuchsia-400" /> Verification Ladder
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          The 10-level quality gate. No artifact is delivered without passing this gauntlet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Trigger & List */}
        <div className="space-y-6">
          <Card className="p-5 border-zinc-800 bg-zinc-950/50">
            <form onSubmit={handleRunVerification} className="space-y-4">
              <div className="space-y-1">
                <Label>Mission ID</Label>
                <Input value={missionId} onChange={(e) => setMissionId(e.target.value)} placeholder="mis_..." className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Domain</Label>
                  <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                    {['software','legal','financial','research','medical'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Target Level (0-10)</Label>
                  <Input type="number" min={0} max={10} value={targetLevel} onChange={(e) => setTargetLevel(parseInt(e.target.value)||0)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
                </div>
              </div>
              <Button type="submit" disabled={verifying} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Run Verification
              </Button>
            </form>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/50 overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
              <h3 className="font-medium text-zinc-200">Recent Reports</h3>
              <Button onClick={fetchReports} variant="ghost" size="sm" className="h-7 text-xs">Refresh</Button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {reports.map((r) => (
                <button
                  key={r.verification_id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left p-3 rounded-md transition-colors flex items-center justify-between ${
                    selectedReport?.verification_id === r.verification_id 
                      ? 'bg-zinc-800/80 border border-zinc-700' 
                      : 'hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div>
                    <div className="text-xs font-mono text-zinc-400 mb-1">{r.verification_id.slice(0, 14)}...</div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${
                      r.verdict === 'accepted' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {r.verdict.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Detailed Report View */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card className="border-zinc-800 bg-zinc-950/50 overflow-hidden">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100">Verification Report</h2>
                    <p className="text-xs font-mono text-zinc-500 mt-1">{selectedReport.verification_id}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider ${
                    selectedReport.verdict === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    selectedReport.verdict === 'repair_required' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {selectedReport.verdict.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-zinc-500">Mission:</span> <span className="text-zinc-200 font-mono text-xs">{selectedReport.mission_id.slice(0,12)}</span></div>
                  <div><span className="text-zinc-500">Domain:</span> <span className="text-zinc-200">{selectedReport.domain}</span></div>
                  <div><span className="text-zinc-500">Passed:</span> <span className="text-fuchsia-400 font-bold">L{selectedReport.highest_level_passed}</span> of L{selectedReport.highest_level_attempted}</div>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                
                {/* Level Results */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Level Results</h3>
                  {selectedReport.level_results?.map((lvl: any) => (
                    <div key={lvl.level} className="flex items-center p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                      <div className="w-12 text-center">
                        <span className="text-xs font-mono font-bold text-zinc-500">L{lvl.level}</span>
                      </div>
                      <div className="flex-1 px-4 border-l border-zinc-800">
                        <div className="text-sm font-medium text-zinc-200">{lvl.level_name.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="text-xs text-zinc-500">{lvl.checks_total} checks run in {lvl.duration_ms}ms</div>
                      </div>
                      <div>
                        {lvl.status === 'passed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    </div>
                  ))}
                  {(!selectedReport.level_results || selectedReport.level_results.length === 0) && (
                    <p className="text-sm text-zinc-500 italic">No level details captured.</p>
                  )}
                </div>

                {/* Critic Report */}
                {selectedReport.critic_reports?.[0] && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">L9 Paired Critic Review</h3>
                    <div className="p-5 rounded-lg border border-fuchsia-900/30 bg-fuchsia-500/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-sm font-medium text-zinc-200">{selectedReport.critic_reports[0].critic_agent_id}</div>
                        <div className="text-xs font-mono text-fuchsia-400">Score: {(selectedReport.critic_reports[0].overall_score * 100).toFixed(0)}%</div>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded border border-zinc-800/50">
                        {selectedReport.critic_reports[0].reasoning}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
              Select a report to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
