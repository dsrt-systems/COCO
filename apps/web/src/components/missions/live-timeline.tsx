'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle2, ShieldAlert, Wrench, 
  Database, Cpu, MessageSquare, AlertTriangle, FileText
} from 'lucide-react';
import { RealtimeEvent } from '@coco/realtime';

interface LiveTimelineProps {
  events: RealtimeEvent[];
  className?: string;
}

const EVENT_ICONS: Record<string, React.FC<any>> = {
  'mission.updated': Play,
  'mission.phase_changed': Play,
  'task.created': FileText,
  'task.completed': CheckCircle2,
  'agent.spawned': Cpu,
  'agent.run_completed': CheckCircle2,
  'tool.call_completed': Wrench,
  'model.call_completed': Database,
  'verification.level_passed': ShieldAlert,
  'verification.level_failed': AlertTriangle,
  'repair.order_issued': Wrench,
  'memory.written': Database,
  'decision.recorded': MessageSquare,
  'approval.requested': AlertTriangle,
};

const EVENT_COLORS: Record<string, string> = {
  'mission.updated': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'task.completed': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'agent.spawned': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'tool.call_completed': 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  'verification.level_failed': 'text-red-400 bg-red-500/10 border-red-500/20',
  'repair.order_issued': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

export function LiveTimeline({ events, className }: LiveTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  if (events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/50 text-sm text-zinc-500 italic">
        Waiting for mission events...
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className={`relative h-[500px] overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 custom-scrollbar ${className || ''}`}
    >
      <div className="absolute left-[39px] top-6 bottom-6 w-px bg-zinc-800/60 pointer-events-none" />
      
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {events.map((event, i) => {
            const Icon = EVENT_ICONS[event.kind] || Play;
            const colorClass = EVENT_COLORS[event.kind] || 'text-zinc-400 bg-zinc-800/50 border-zinc-700';
            
            // Format timestamp (e.g. 14:02:45)
            const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
            
            // Extract a summary string based on event kind
            let summary = event.kind.replace(/_/g, ' ');
            let detail = '';
            
            if (event.kind === 'tool.call_completed') {
              summary = `Tool: ${(event.payload as any).tool_id}`;
              detail = `${(event.payload as any).wall_time_ms}ms · Exit ${(event.payload as any).exit_code}`;
            } else if (event.kind === 'agent.spawned') {
              summary = `Spawned: ${(event.payload as any).agent_definition_id}`;
            } else if (event.kind === 'verification.level_passed') {
              summary = `Passed L${(event.payload as any).level}: ${(event.payload as any).level_name}`;
            }

            return (
              <motion.div
                key={`${event.kind}-${event.timestamp}-${i}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className="relative z-10 flex items-start gap-4"
              >
                <div className="w-16 flex-shrink-0 text-right pt-1">
                  <span className="text-[10px] font-mono text-zinc-500">{time}</span>
                </div>
                
                <div className={`p-1.5 rounded-full border shadow-sm mt-0.5 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                
                <div className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800/40 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                      {summary}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(event.payload as any).mission_id?.slice(0,8)}
                    </span>
                  </div>
                  {detail && (
                    <p className="text-xs text-zinc-400 font-mono">{detail}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {!autoScroll && (
        <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <button 
            onClick={() => {
              setAutoScroll(true);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }}
            className="pointer-events-auto px-3 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
          >
            ↓ Scroll to newest
          </button>
        </div>
      )}
    </div>
  );
}
