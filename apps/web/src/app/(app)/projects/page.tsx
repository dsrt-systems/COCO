'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FolderKanban, Archive, Loader2, ChevronRight, Globe, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('software');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects?status=active');
      const data = await res.json();
      if (res.ok) setProjects(data.projects ?? []);
      else toast.error(data.error || 'Failed to load projects');
    } catch {
      toast.error('Network error loading projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name.trim(),
          description: description.trim() || undefined,
          primary_domain: domain,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Project "${data.project.display_name}" created`);
        setShowCreate(false);
        setName('');
        setDescription('');
        router.push(`/projects/${data.project.project_id}`);
      } else {
        toast.error(data.error || 'Failed to create project');
      }
    } catch {
      toast.error('Network error creating project');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <FolderKanban className="w-8 h-8 text-indigo-400" /> Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Long-lived containers for missions, conversations, knowledge, and decisions.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6 border-indigo-500/30 bg-indigo-500/5 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100">Create Project</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Display Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Platform Rebuild"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label>Primary Domain</Label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  {['software', 'research', 'legal', 'financial', 'medical', 'product', 'hardware', 'operations'].map((d) => (
                    <option key={d} value={d}>{d.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                className="w-full h-20 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-500">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Project
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="border-zinc-700">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Project Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 border-zinc-800 bg-zinc-950/50 text-center">
          <FolderKanban className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No projects yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Create a project to organize missions, conversations, and knowledge.</p>
          <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-500">
            <Plus className="w-4 h-4 mr-2" /> Create First Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.project_id} href={`/projects/${p.project_id}`}>
              <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200 cursor-pointer group h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.visibility === 'private' ? (
                      <Lock className="w-3 h-3 text-zinc-600" />
                    ) : (
                      <Globe className="w-3 h-3 text-zinc-600" />
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1 group-hover:text-indigo-300 transition-colors">
                  {p.display_name}
                </h3>
                <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                  {p.description || 'No description'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.primary_domain && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-zinc-800 text-zinc-400">
                      {p.primary_domain}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-600">
                    {p.slug}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
