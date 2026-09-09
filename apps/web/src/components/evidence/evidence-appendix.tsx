'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { BookOpen, ExternalLink, Loader2, Search, FileText, Link2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EvidenceAppendixProps {
  projectId: string;
}

const CRED_COLORS: Record<string, string> = {
  primary: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  secondary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  unverified: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  discredited: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function EvidenceAppendix({ projectId }: EvidenceAppendixProps) {
  const [sources, setSources] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [citations, setCitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'evidence' | 'sources' | 'citations'>('evidence');

  const fetchAppendix = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/evidence${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSources(data.sources ?? []);
        setEvidence(data.evidence ?? []);
        setCitations(data.citations ?? []);
      } else {
        toast.error(data.error || 'Failed to load evidence');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAppendix();
  }, [fetchAppendix]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Evidence Appendix</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAppendix(query)}
              placeholder="Search claims, sources…"
              className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-8 pl-8 w-52"
            />
          </div>
          <Button onClick={() => fetchAppendix(query)} variant="ghost" size="sm" className="h-8 text-xs">
            Search
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-px">
        {([
          { id: 'evidence', label: `Evidence (${evidence.length})` },
          { id: 'sources', label: `Sources (${sources.length})` },
          { id: 'citations', label: `Citations (${citations.length})` },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium rounded-t-md transition-colors ${
              tab === t.id
                ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 border-b-zinc-900 -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {tab === 'evidence' && (
            evidence.length === 0 ? (
              <EmptyState text="No evidence records yet. Research agents will populate this as they gather sources." />
            ) : (
              evidence.map((ev) => (
                <Card key={ev.evidence_id} className="p-4 border-zinc-800 bg-zinc-950/50 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-200 leading-relaxed flex-1">{ev.claim}</p>
                    <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                      {(ev.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {ev.extracted_quote && (
                    <blockquote className="border-l-2 border-emerald-500/40 pl-3 text-xs text-zinc-400 italic">
                      "{ev.extracted_quote}"
                    </blockquote>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    {ev.sources && (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <FileText className="w-3 h-3" />
                        {ev.sources.title || ev.source_id?.slice(0, 12)}
                      </span>
                    )}
                    {ev.sources?.credibility_class && (
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                        CRED_COLORS[ev.sources.credibility_class] ?? CRED_COLORS.unverified
                      }`}>
                        {ev.sources.credibility_class}
                      </span>
                    )}
                    {ev.location_hint && (
                      <span className="text-zinc-600 font-mono">{ev.location_hint}</span>
                    )}
                    {ev.triangulation_count > 1 && (
                      <span className="text-emerald-500/80 font-mono">
                        ×{ev.triangulation_count} sources
                      </span>
                    )}
                  </div>
                </Card>
              ))
            )
          )}

          {tab === 'sources' && (
            sources.length === 0 ? (
              <EmptyState text="No sources registered yet." />
            ) : (
              sources.map((s) => (
                <Card key={s.source_id} className="p-4 border-zinc-800 bg-zinc-950/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{s.title}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-mono text-zinc-500">{s.source_type}</span>
                      <span className={`px-1.5 py-0.5 rounded border font-semibold uppercase ${
                        CRED_COLORS[s.credibility_class] ?? CRED_COLORS.unverified
                      }`}>
                        {s.credibility_class}
                      </span>
                      {s.publisher && <span className="text-zinc-600">{s.publisher}</span>}
                    </div>
                    {s.content_excerpt && (
                      <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{s.content_excerpt}</p>
                    )}
                  </div>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </Card>
              ))
            )
          )}

          {tab === 'citations' && (
            citations.length === 0 ? (
              <EmptyState text="No citations linked yet. Citations connect findings/decisions to evidence." />
            ) : (
              citations.map((c) => (
                <Card key={c.citation_id} className="p-3 border-zinc-800 bg-zinc-950/50 flex items-center gap-3 text-xs">
                  <Link2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-mono text-zinc-500">{c.cited_from_kind}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="font-mono text-zinc-400 truncate">{c.cited_from_id}</span>
                  <span className="text-zinc-600">cites</span>
                  <span className="font-mono text-emerald-400/80 truncate">{c.evidence_id}</span>
                </Card>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-8 border-zinc-800 bg-zinc-950/40 text-center text-sm text-zinc-500">
      {text}
    </Card>
  );
}
