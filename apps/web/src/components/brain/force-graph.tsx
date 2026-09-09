'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface GraphNode {
  node_id: string;
  node_type: string;
  label: string;
  description?: string | null;
  confidence?: number;
  // simulation state
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  edge_id: string;
  from_node_id: string;
  to_node_id: string;
  relation: string;
  confidence?: number;
}

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  requirement: '#818cf8',
  service: '#34d399',
  decision: '#fbbf24',
  component: '#60a5fa',
  entity: '#a78bfa',
  concept: '#f472b6',
  risk: '#f87171',
  person: '#2dd4bf',
  vendor: '#fb923c',
  default: '#a1a1aa',
};

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default!;
}

/**
 * Pure-SVG force-directed graph.
 * No external d3 dependency — implements a simple charge + spring + centering simulation.
 */
export function ForceGraph({
  nodes: inputNodes,
  edges,
  width = 800,
  height = 520,
  onNodeClick,
  selectedNodeId,
}: ForceGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);

  // Initialize node positions when input changes
  useEffect(() => {
    const initialized = inputNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(inputNodes.length, 1);
      const radius = Math.min(width, height) * 0.28;
      return {
        ...n,
        x: n.x ?? width / 2 + radius * Math.cos(angle),
        y: n.y ?? height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
    nodesRef.current = initialized;
    setNodes(initialized);
  }, [inputNodes, width, height]);

  // Force simulation loop
  useEffect(() => {
    if (nodesRef.current.length === 0) return;

    const ALPHA_DECAY = 0.02;
    let alpha = 1;

    const tick = () => {
      const ns = nodesRef.current;
      if (ns.length === 0) return;

      alpha = Math.max(0.001, alpha - ALPHA_DECAY);

      // 1. Charge repulsion (O(n²) — fine for <500 nodes)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i]!;
          const b = ns[j]!;
          const dx = (b.x ?? 0) - (a.x ?? 0);
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (800 / (dist * dist)) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx = (a.vx ?? 0) - fx;
          a.vy = (a.vy ?? 0) - fy;
          b.vx = (b.vx ?? 0) + fx;
          b.vy = (b.vy ?? 0) + fy;
        }
      }

      // 2. Spring attraction along edges
      const nodeMap = new Map(ns.map((n) => [n.node_id, n]));
      for (const edge of edges) {
        const a = nodeMap.get(edge.from_node_id);
        const b = nodeMap.get(edge.to_node_id);
        if (!a || !b) continue;
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = 120;
        const force = ((dist - ideal) * 0.05) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx = (a.vx ?? 0) + fx;
        a.vy = (a.vy ?? 0) + fy;
        b.vx = (b.vx ?? 0) - fx;
        b.vy = (b.vy ?? 0) - fy;
      }

      // 3. Center gravity
      for (const n of ns) {
        n.vx = (n.vx ?? 0) + (width / 2 - (n.x ?? 0)) * 0.01 * alpha;
        n.vy = (n.vy ?? 0) + (height / 2 - (n.y ?? 0)) * 0.01 * alpha;
      }

      // 4. Integrate + damp
      for (const n of ns) {
        if (n.fx != null) {
          n.x = n.fx;
          n.vx = 0;
        } else {
          n.vx = (n.vx ?? 0) * 0.85;
          n.x = Math.max(30, Math.min(width - 30, (n.x ?? 0) + (n.vx ?? 0)));
        }
        if (n.fy != null) {
          n.y = n.fy;
          n.vy = 0;
        } else {
          n.vy = (n.vy ?? 0) * 0.85;
          n.y = Math.max(30, Math.min(height - 30, (n.y ?? 0) + (n.vy ?? 0)));
        }
      }

      setNodes([...ns]);
      if (alpha > 0.01) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [edges, width, height, inputNodes.length]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent, node: GraphNode) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: node.node_id, ox: e.clientX - (node.x ?? 0), oy: e.clientY - (node.y ?? 0) };
    const ns = nodesRef.current;
    const n = ns.find((x) => x.node_id === node.node_id);
    if (n) {
      n.fx = n.x;
      n.fy = n.y;
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const ns = nodesRef.current;
    const n = ns.find((x) => x.node_id === dragRef.current!.id);
    if (!n) return;
    n.fx = e.clientX - dragRef.current.ox;
    n.fy = e.clientY - dragRef.current.oy;
    n.x = n.fx;
    n.y = n.fy;
    setNodes([...ns]);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const ns = nodesRef.current;
    const n = ns.find((x) => x.node_id === dragRef.current!.id);
    if (n) {
      n.fx = null;
      n.fy = null;
    }
    dragRef.current = null;
  }, []);

  const nodeMap = new Map(nodes.map((n) => [n.node_id, n]));

  if (inputNodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-sm text-zinc-500"
        style={{ width, height }}
      >
        No knowledge nodes yet. Add concepts, decisions, and requirements to build the Project Brain.
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className="rounded-xl border border-zinc-800 bg-zinc-950/60 select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Edges */}
      <g>
        {edges.map((e) => {
          const a = nodeMap.get(e.from_node_id);
          const b = nodeMap.get(e.to_node_id);
          if (!a || !b) return null;
          const highlighted =
            hoveredId === e.from_node_id ||
            hoveredId === e.to_node_id ||
            selectedNodeId === e.from_node_id ||
            selectedNodeId === e.to_node_id;
          return (
            <g key={e.edge_id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={highlighted ? '#6366f1' : '#3f3f46'}
                strokeWidth={highlighted ? 2 : 1}
                strokeOpacity={highlighted ? 0.9 : 0.5}
              />
              {/* Relation label at midpoint */}
              {highlighted && (
                <text
                  x={((a.x ?? 0) + (b.x ?? 0)) / 2}
                  y={((a.y ?? 0) + (b.y ?? 0)) / 2 - 6}
                  textAnchor="middle"
                  className="fill-indigo-300"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                >
                  {e.relation}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map((n) => {
          const selected = selectedNodeId === n.node_id;
          const hovered = hoveredId === n.node_id;
          const r = selected || hovered ? 14 : 10;
          const color = colorFor(n.node_type);
          return (
            <g
              key={n.node_id}
              transform={`translate(${n.x}, ${n.y})`}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => onPointerDown(e, n)}
              onClick={() => onNodeClick?.(n)}
              onPointerEnter={() => setHoveredId(n.node_id)}
              onPointerLeave={() => setHoveredId(null)}
            >
              {/* Glow */}
              {(selected || hovered) && (
                <circle r={r + 6} fill={color} opacity={0.15} />
              )}
              <circle
                r={r}
                fill={color}
                fillOpacity={0.85}
                stroke={selected ? '#fff' : color}
                strokeWidth={selected ? 2.5 : 1}
              />
              <text
                y={r + 14}
                textAnchor="middle"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                className="fill-zinc-300"
                style={{ pointerEvents: 'none' }}
              >
                {n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform={`translate(16, ${height - 28})`}>
        {Object.entries(TYPE_COLORS)
          .filter(([k]) => k !== 'default')
          .slice(0, 6)
          .map(([type, color], i) => (
            <g key={type} transform={`translate(${i * 90}, 0)`}>
              <circle r={5} fill={color} />
              <text x={10} y={4} fontSize={10} className="fill-zinc-500" fontFamily="ui-monospace, monospace">
                {type}
              </text>
            </g>
          ))}
      </g>
    </svg>
  );
}
