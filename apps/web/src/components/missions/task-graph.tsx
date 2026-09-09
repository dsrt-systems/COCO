'use client';

import { CheckCircle2, Circle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function TaskGraphViewer({ tasks }: { tasks: any[] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-500">
        Task graph not yet generated.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case 'failed': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-zinc-600" />;
      default: return <Circle className="w-5 h-5 text-zinc-700" />;
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, idx) => (
        <div 
          key={task.task_id} 
          className="relative flex items-start gap-4 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 group hover:bg-zinc-900/80 transition-colors"
        >
          {/* Timeline connector line */}
          {idx !== tasks.length - 1 && (
            <div className="absolute left-6 top-10 bottom-[-24px] w-px bg-zinc-800" />
          )}

          <div className="relative z-10 bg-zinc-950 p-1 rounded-full border border-zinc-800 group-hover:border-zinc-700 transition-colors">
            {getStatusIcon(task.status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-medium text-zinc-200">{task.objective}</h4>
              <span className="text-xs font-mono text-zinc-500">{task.task_id.slice(0, 12)}...</span>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-zinc-800 text-zinc-400">
                {task.kind}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-zinc-800 text-zinc-400">
                L{task.verification_level} VERIFY
              </span>
              {task.assigned_agent_instance && (
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-indigo-950 text-indigo-400 border border-indigo-900/50">
                  {task.assigned_agent_instance.slice(0, 12)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
