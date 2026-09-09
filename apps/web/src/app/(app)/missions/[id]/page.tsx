'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Play, Square, Loader2, ArrowRight, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AgentMap } from '@/components/missions/agent-map';
import { TaskGraphViewer } from '@/components/missions/task-graph';
import { ArtifactViewer } from '@/components/missions/artifact-viewer';
import { LiveTimeline } from '@/components/missions/live-timeline';
import { LiveCostMeter } from '@/components/missions/live-cost-meter';
import { LiveVerificationLadder, type LevelStatus } from '@/components/missions/live-verification-ladder';
import { useMissionChannel } from '@/hooks/useMissionChannel';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import type { RealtimeEvent } from '@coco/realtime';

export default function MissionControlPage() {
  const params = useParams();
  const missionId = params.id as string;
  const organizationId = 'org_default';

  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [liveEvents, setLiveEvents] = useState<RealtimeEvent[]>([]);
  const [levelStatuses, setLevelStatuses] = useState<Record<number, LevelStatus>>({});

  const { isConnected, onAny } = useMissionChannel(missionId, organizationId);
  const { metrics, feedEvent } = useLiveMetrics(missionId);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    setLiveEvents((prev) => [...prev, event].slice(-100));
    feedEvent(event);

    // Update verification ladder from level result events
    if (event.kind === 'verification.level_passed') {
      const lvl = Number((event.payload as any).level);
      if (!isNaN(lvl)) {
        setLevelStatuses((prev) => ({ ...prev, [lvl]: 'passed' }));
      }
    } else if (event.kind === 'verification.level_failed') {
      const lvl = Number((event.payload as any).level);
      if (!isNaN(lvl)) {
        setLevelStatuses((prev) => ({ ...prev, [lvl]: 'failed' }));
      }
    } else if (event.kind === 'verification.started') {
      // Mark all pending levels as pending, L0 as running
      setLevelStatuses({ 0: 'running' });
    }

    // Critical toasts
    if (event.kind === 'repair.order_issued') {
      toast.warning('Repair order issued — verification failed a level.');
    } else if (event.kind === 'approval.requested') {
      toast.error('Human approval required — mission is blocked.');
    } else if (event.kind === 'mission.completed') {
      const phase = (event.payload as any).phase;
      if (phase === 'completed') toast.success('Mission completed successfully!');
      else toast.error('Mission failed.');
    } else if (event.kind === 'agent.spawned') {
      // Soft toast for agent spawn
      toast.message(`Agent spawned: ${(event.payload as any).agent_definition_id}`, {
        duration: 2000,
      });
    }
  }, [feedEvent]);

  useEffect(() => {
    onAny(handleEvent);
  }, [onAny, handleEvent]);

  // Initial data fetch
  useEffect(() => {
    fetchMissionState();
  }, [missionId]);

  async function fetchMissionState() {
    try {
      const res = await fetch(`/api/missions/${missionId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setMission(data.mission);
        setTasks(data.tasks ?? []);
        setAgents(data.agents ?? []);
        setArtifacts(data.artifacts ?? []);
      }
    } catch {
      toast.error('Failed to load initial mission state');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !mission) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const phaseColors: Record<string, string> = {
    planning: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    organizing: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
    executing: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
    verifying: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-500/20',
    completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    failed: 'text-red-400 bg-red-400/10 border-red-500/20',
  };

  const phase = mission?.phase || 'planning';
  const colorClass = phaseColors[phase] || 'text-zinc-400 bg-zinc-800 border-zinc-700';

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${colorClass}`}>
              {phase}
            </span>
            <span className="text-xs text-zinc-500 font-mono">{missionId}</span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE WEBSOCKET
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                <Loader2 className="w-3 h-3 animate-spin" /> CONNECTING
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {mission?.objective || 'Loading mission objective...'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300">
            <Square className="w-4 h-4 mr-2" /> Stop
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Play className="w-4 h-4 mr-2" /> Resume
          </Button>
        </div>
      </div>

      {/* Live Cost Meter — full width */}
      <LiveCostMeter metrics={metrics} budgetLimitUsd={50} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Timeline + Artifacts */}
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                Live Timeline <ArrowRight className="w-4 h-4 text-zinc-500" />
              </h2>
              <span className="text-xs text-zinc-500 font-mono">{liveEvents.length} events</span>
            </div>
            <LiveTimeline events={liveEvents} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2">
              Deliverables & Artifacts
            </h2>
            <ArtifactViewer artifacts={artifacts} />
          </section>
        </div>

        {/* Right: Agents + Verification + Tasks */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2">
              Active Organization
            </h2>
            <AgentMap instances={agents} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2">
              Verification Ladder
            </h2>
            <LiveVerificationLadder levels={levelStatuses} targetLevel={10} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2">
              Task Graph
            </h2>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              <TaskGraphViewer tasks={tasks} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
