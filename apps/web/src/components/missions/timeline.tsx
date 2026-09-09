'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Ban } from 'lucide-react';

interface TimelineEvent {
  event_id: string;
  event_type: string;
  sequence_number: number;
  occurred_at_unix_ms: number;
  data: Record<string, unknown>;
  actor_kind: string;
  actor_id: string;
}

interface TimelineState {
  phase: string;
  progress_percent: number;
  status_summary: string;
  events: TimelineEvent[];
}

export function MissionTimeline({ missionId }: { missionId: string }) {
  const [state, setState] = useState<TimelineState>({
    phase: 'created',
    progress_percent: 0,
    status_summary: 'Loading…',
    events: [],
  });
  const afterRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled || doneRef.current) return;
      try {
        const res = await fetch(
          `/api/missions/${missionId}/timeline?after=${afterRef.current}`,
        );
        const json = await res.json();
        if (!json.ok || cancelled) return;

        setState((prev) => {
          const newEvents = json.events as TimelineEvent[];
          if (newEvents.length > 0) {
            afterRef.current = Math.max(
              afterRef.current,
              ...newEvents.map((e) => e.sequence_number),
            );
          }
          return {
            phase: json.phase,
            progress_percent: json.progress_percent,
            status_summary: json.status_summary ?? prev.status_summary,
            events: newEvents.length
              ? [...prev.events, ...newEvents]
              : prev.events,
          };
        });

        if (['completed', 'failed', 'cancelled'].includes(json.phase)) {
          doneRef.current = true;
        }
      } catch (err) {
        console.error('timeline poll failed', err);
      }
    }

    poll();
    const id = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [missionId]);

  const isRunning = !['completed', 'failed', 'cancelled'].includes(state.phase);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="card-3d p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : state.phase === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : state.phase === 'cancelled' ? (
              <Ban className="h-5 w-5 text-yellow-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <div className="font-medium">{state.status_summary}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                phase · {state.phase}
              </div>
            </div>
          </div>
          <div className="font-mono text-2xl text-gradient">
            {Math.round(state.progress_percent)}%
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white/80 to-white/40 transition-all duration-500"
            style={{ width: `${state.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {state.events.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Waiting for events…
          </div>
        )}
        {state.events.map((ev) => (
          <EventRow key={ev.event_id} event={ev} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: TimelineEvent }) {
  const label = event.event_type.replace(/^mission\./, '').replace(/_/g, ' ');
  const time = new Date(event.occurred_at_unix_ms).toLocaleTimeString();
  const from = event.data?.from_phase as string | undefined;
  const to = event.data?.to_phase as string | undefined;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mt-0.5">
        <Circle className="h-3 w-3 text-muted-foreground" fill="currentColor" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium capitalize">{label}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{time}</span>
        </div>
        {from && to && (
          <div className="mt-1 text-xs text-muted-foreground">
            {from} → {to}
          </div>
        )}
        <div className="mt-1 font-mono text-[10px] text-muted-foreground/50">
          seq {event.sequence_number} · {event.actor_kind}:{event.actor_id.slice(0, 16)}
        </div>
      </div>
    </div>
  );
}
