'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Network } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ForceGraph, type GraphNode, type GraphEdge } from './force-graph';

interface BrainPanelProps {
  projectId: string;
}

const NODE_TYPES = [
  'requirement', 'service', 'decision', 'component',
  'entity', 'concept', 'risk', 'person', 'vendor',
];

export function BrainPanel({ projectId }: BrainPanelProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [label, setLabel] = useState('');
  const [nodeType, setNodeType] = useState('concept');
  const [description, setDescription] = useState('');
  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [edgeRelation, setEdgeRelation] = useState('relates_to');

  const fetchBrain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/brain`);
      const data = await res.json();
      if (res.ok) {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      } else {
        toast.error(data.error || 'Failed to load brain');
      }
    } catch {
      toast.error('Network error loading brain');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBrain();
  }, [fetchBrain]);

  async function handleAddNode(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/brain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'node',
          node_type: nodeType,
          label: label.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Node "${label}" added`);
        setLabel('');
        setDescription('');
        setShowAdd(false);
        fetchBrain();
      } else {
        toast.error(data.error || 'Failed to add node');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAdding(false);
    }
  }

  async function handleAddEdge(e: React.FormEvent) {
    e.preventDefault();
    if (!edgeFrom || !edgeTo || !edgeRelation) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/brain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'edge',
          from_node_id: edgeFrom,
          to_node_id: edgeTo,
          relation: edgeRelation,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Edge created');
        setEdgeFrom('');
        setEdgeTo('');
        fetchBrain();
      } else {
        toast.error(data.error || 'Failed to add edge');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Project Brain
            <span className="ml-2 text-xs font-mono text-zinc-500">
              {nodes.length} nodes &middot; {edges.length} edges
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBrain} variant="ghost" size="sm" className="h-8 text-xs">
            Refresh
          </Button>
          <Button
            onClick={() => setShowAdd(!showAdd)}
            size="sm"
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="p-4 border-indigo-500/30 bg-indigo-500/5 space-y-4">
          <form onSubmit={handleAddNode} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Auth Service"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 h-9 text-sm text-zinc-100"
              >
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 text-sm h-9"
              />
            </div>
            <Button type="submit" disabled={adding} className="h-9 bg-indigo-600 hover:bg-indigo-500">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Node'}
            </Button>
          </form>

          {nodes.length >= 2 && (
            <form onSubmit={handleAddEdge} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border-t border-zinc-800 pt-4">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <select
                  value={edgeFrom}
                  onChange={(e) => setEdgeFrom(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 h-9 text-sm text-zinc-100"
                >
                  <option value="">Select node&hellip;</option>
                  {nodes.map((n) => (
                    <option key={n.node_id} value={n.node_id}>{n.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Relation</Label>
                <Input
                  value={edgeRelation}
                  onChange={(e) => setEdgeRelation(e.target.value)}
                  placeholder="depends_on"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 text-sm h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <select
                  value={edgeTo}
                  onChange={(e) => setEdgeTo(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 h-9 text-sm text-zinc-100"
                >
                  <option value="">Select node&hellip;</option>
                  {nodes.map((n) => (
                    <option key={n.node_id} value={n.node_id}>{n.label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={adding} variant="outline" className="h-9 border-zinc-700">
                Add Edge
              </Button>
            </form>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex h-[520px] items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 overflow-hidden">
            <ForceGraph
              nodes={nodes}
              edges={edges}
              width={720}
              height={520}
              selectedNodeId={selected?.node_id}
              onNodeClick={setSelected}
            />
          </div>
          <Card className="p-4 border-zinc-800 bg-zinc-950/50 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">
              {selected ? 'Selected Node' : 'Node Inspector'}
            </h3>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider">Label</div>
                  <div className="text-zinc-100 font-medium">{selected.label}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider">Type</div>
                  <div className="text-indigo-300 font-mono text-xs">{selected.node_type}</div>
                </div>
                {selected.description && (
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500 tracking-wider">Description</div>
                    <div className="text-zinc-400 text-xs leading-relaxed">{selected.description}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider">Confidence</div>
                  <div className="text-zinc-300 font-mono text-xs">
                    {((selected.confidence ?? 0.8) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider">ID</div>
                  <div className="text-zinc-600 font-mono text-[10px] break-all">{selected.node_id}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1">Connections</div>
                  <div className="space-y-1">
                    {edges
                      .filter((e) => e.from_node_id === selected.node_id || e.to_node_id === selected.node_id)
                      .map((e) => {
                        const otherId = e.from_node_id === selected.node_id ? e.to_node_id : e.from_node_id;
                        const other = nodes.find((n) => n.node_id === otherId);
                        const dir = e.from_node_id === selected.node_id ? '&rarr;' : '&larr;';
                        return (
                          <div key={e.edge_id} className="text-[11px] text-zinc-400 font-mono">
                            {dir} <span className="text-indigo-400">{e.relation}</span> {other?.label ?? otherId.slice(0, 8)}
                          </div>
                        );
                      })}
                    {edges.filter((e) => e.from_node_id === selected.node_id || e.to_node_id === selected.node_id).length === 0 && (
                      <div className="text-[11px] text-zinc-600 italic">No connections</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Click a node on the graph to inspect it.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
