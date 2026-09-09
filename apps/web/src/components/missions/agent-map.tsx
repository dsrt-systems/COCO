'use client';

import { Cpu, Terminal, ShieldCheck, Database, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const AGENT_ICONS: Record<string, any> = {
  'A1_coco_director': LayoutDashboard,
  'A2_mission_planner': Cpu,
  'A3_universal_critic': ShieldCheck,
  'D1_browser_operator': Terminal,
  'D4_database_operator': Database,
};

export function AgentMap({ instances }: { instances: any[] }) {
  if (!instances || instances.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-500">
        No agents spawned yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {instances.map((inst) => {
        const Icon = AGENT_ICONS[inst.agent_definition_id] || Cpu;
        const isRunning = inst.status === 'running';

        return (
          <div
            key={inst.agent_instance_id}
            className={cn(
              "relative flex flex-col p-4 rounded-xl border transition-all duration-300 overflow-hidden",
              isRunning 
                ? "bg-zinc-900/80 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                : "bg-zinc-900/40 border-zinc-800"
            )}
          >
            {/* Background glow for running agents */}
            {isRunning && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            )}

            <div className="flex justify-between items-start mb-3 z-10">
              <div className={cn(
                "p-2 rounded-lg",
                isRunning ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-mono px-2 py-1 rounded-full uppercase tracking-wider",
                isRunning ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-zinc-800 text-zinc-500"
              )}>
                {inst.status}
              </span>
            </div>

            <div className="z-10">
              <h4 className="text-sm font-semibold text-zinc-200 truncate">
                {inst.agent_definition_id.replace(/_/g, ' ')}
              </h4>
              <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                {inst.agent_instance_id}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
