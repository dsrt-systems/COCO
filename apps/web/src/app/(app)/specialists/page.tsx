'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Network, Search, Loader2, ShieldCheck, FileText, BarChart, ChevronDown, ChevronUp } from 'lucide-react';

const DOMAINS = [
  'All Domains',
  'Software & Systems Engineering',
  'Research & Information Intelligence',
  'Legal, Policy & Governance',
  'Financial, Economic & Valuation',
  'Medicine, Life Sciences & Healthcare',
  'Business, Product & Growth',
  'Hardware, Robotics & Physical Systems',
  'Creative, Media & Communications',
  'Applied Sciences & Mathematics',
  'Operational & Domain-Specific',
];

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('All Domains');
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [datasheet, setDatasheet] = useState<any>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);

  useEffect(() => {
    fetchSpecialists();
  }, []);

  async function fetchSpecialists() {
    setLoading(true);
    try {
      // Pass seed=true on first load in dev to ensure DB is populated
      const res = await fetch('/api/specialists?seed=true');
      const data = await res.json();
      if (res.ok) setSpecialists(data.specialists ?? []);
      else toast.error(data.error);
    } catch {
      toast.error('Failed to load specialists');
    } finally {
      setLoading(false);
    }
  }

  async function fetchDatasheet(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      return;
    }
    
    setSelectedId(id);
    setLoadingSheet(true);
    try {
      const res = await fetch(`/api/specialists/${id}`);
      const data = await res.json();
      if (res.ok) setDatasheet(data.datasheet);
    } catch {
      toast.error('Failed to load datasheet');
    } finally {
      setLoadingSheet(false);
    }
  }

  const filtered = specialists.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.agent_id.toLowerCase().includes(search.toLowerCase());
    const matchDomain = domainFilter === 'All Domains' || s.domain === domainFilter;
    return matchSearch && matchDomain;
  });

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Network className="w-8 h-8 text-indigo-400" /> Specialist Roster
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          The 134 deep capabilities available to COCO. Every specialist must beat the median human expert.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-950/50 p-4 border border-zinc-800 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input 
            placeholder="Search specialists (e.g. C36, Python)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100"
          />
        </div>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="w-full sm:w-auto rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-mono text-zinc-500 mb-2">Showing {filtered.length} of {specialists.length} capabilities</div>
          {filtered.map(s => (
            <Card key={s.agent_id} className="border-zinc-800 bg-zinc-950/50 overflow-hidden transition-colors hover:border-zinc-700">
              <button
                onClick={() => fetchDatasheet(s.agent_id)}
                className="w-full text-left p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {s.agent_id.split('_')[0]}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider truncate">{s.domain}</span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100">{s.name}</h3>
                </div>
                
                <div className="flex items-center gap-4 text-zinc-400">
                  <span className="text-xs bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    Critic: <span className="font-mono text-zinc-300">{s.agent_id.split('_')[0]}_critic</span>
                  </span>
                  {selectedId === s.agent_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Expandable Datasheet */}
              {selectedId === s.agent_id && (
                <div className="border-t border-zinc-800 bg-zinc-900/20 p-6">
                  {loadingSheet ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
                  ) : datasheet ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Expert-Beating Thesis
                          </h4>
                          <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-950/50 p-3 rounded border border-zinc-800/50">
                            {datasheet.expert_beating_thesis}
                          </p>
                        </div>

                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                            <FileText className="w-4 h-4 text-indigo-400" /> Cognitive Methodology
                          </h4>
                          <ul className="space-y-1.5">
                            {datasheet.capabilities_summary.map((step: string, i: number) => (
                              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                <span className="text-indigo-500 font-mono mt-0.5">{i+1}.</span> {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                            <BarChart className="w-4 h-4 text-amber-400" /> Benchmark Performance vs Human Baseline
                          </h4>
                          <div className="space-y-3">
                            {Object.entries(datasheet.benchmark_performance).map(([metric, scores]: [string, any]) => (
                              <div key={metric} className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                                <div className="text-xs text-zinc-300 mb-2">{metric}</div>
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                      <span>COCO Score</span>
                                      <span className="text-emerald-400 font-mono">{(scores.score * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500" style={{ width: `${scores.score * 100}%` }} />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                      <span>Human Median</span>
                                      <span className="text-amber-400 font-mono">{(scores.human_median * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500/50" style={{ width: `${scores.human_median * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-zinc-200 mb-2">Known Limitations</h4>
                          <ul className="text-xs text-zinc-500 space-y-1 list-disc pl-4">
                            {datasheet.limitations.map((l: string, i: number) => <li key={i}>{l}</li>)}
                          </ul>
                        </div>
                      </div>

                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
