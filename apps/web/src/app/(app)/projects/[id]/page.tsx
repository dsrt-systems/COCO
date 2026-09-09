'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { FolderKanban, Loader2, Network, Scale, BookOpen, Settings } from 'lucide-react';
import { BrainPanel } from '@/components/brain/brain-panel';
import { DecisionLog } from '@/components/decisions/decision-log';
import { EvidenceAppendix } from '@/components/evidence/evidence-appendix';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'brain' | 'decisions' | 'evidence' | 'settings'>('brain');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data.project);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Failed to load project');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-500">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-400">
              Project
            </span>
            <span className="text-xs text-zinc-500 font-mono">{projectId}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-indigo-400" />
            {project.display_name}
          </h1>
          {project.description && (
            <p className="mt-2 text-sm text-zinc-400 max-w-3xl">
              {project.description}
            </p>
          )}
          <div className="mt-3 flex gap-2 flex-wrap text-xs font-mono text-zinc-500">
            {project.primary_domain && <span>Domain: {project.primary_domain}</span>}
            <span>Missions: {stats?.mission_count}</span>
            <span>Conversations: {stats?.conversation_count}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-px">
        {[
          { id: 'brain', label: 'Project Brain', icon: Network },
          { id: 'decisions', label: 'Decisions', icon: Scale },
          { id: 'evidence', label: 'Evidence', icon: BookOpen },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === t.id
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 border-b-zinc-900 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'brain' && <BrainPanel projectId={projectId} />}
        {activeTab === 'decisions' && <DecisionLog projectId={projectId} />}
        {activeTab === 'evidence' && <EvidenceAppendix projectId={projectId} />}
        {activeTab === 'settings' && (
          <div className="p-8 border border-zinc-800 bg-zinc-950/40 rounded-xl text-center text-zinc-500 text-sm">
            Project settings (visibility, tech stack, archiving) will be available here.
          </div>
        )}
      </div>
    </div>
  );
}
