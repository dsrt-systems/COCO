'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const LEVEL_LABELS: Record<number, string> = {
  0: 'Well-Formed',
  1: 'Structural',
  2: 'Type-Correct',
  3: 'Lint Clean',
  4: 'Unit Verified',
  5: 'Integration',
  6: 'Requirements',
  7: 'Security',
  8: 'Performance',
  9: 'Critic',
  10: 'Acceptance',
};

export type LevelStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface LiveVerificationLadderProps {
  levels: Record<number, LevelStatus>;
  targetLevel?: number;
}

export function LiveVerificationLadder({ levels, targetLevel = 10 }: LiveVerificationLadderProps) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: targetLevel + 1 }, (_, i) => i).map((lvl) => {
        const status: LevelStatus = levels[lvl] ?? 'pending';
        const label = LEVEL_LABELS[lvl] ?? `Level ${lvl}`;

        return (
          <motion.div
            key={lvl}
            layout
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300',
              status === 'passed' && 'bg-emerald-500/5 border-emerald-500/20',
              status === 'failed' && 'bg-red-500/5 border-red-500/20',
              status === 'running' && 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]',
              status === 'pending' && 'bg-zinc-950/40 border-zinc-800/60',
              status === 'skipped' && 'bg-zinc-950/20 border-zinc-800/40 opacity-50'
            )}
          >
            {/* Level number */}
            <div className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold border',
              status === 'passed' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
              status === 'failed' && 'bg-red-500/10 border-red-500/30 text-red-400',
              status === 'running' && 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
              status === 'pending' && 'bg-zinc-900 border-zinc-800 text-zinc-600',
              status === 'skipped' && 'bg-zinc-900 border-zinc-800 text-zinc-700'
            )}>
              L{lvl}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm font-medium truncate',
                status === 'passed' && 'text-emerald-300',
                status === 'failed' && 'text-red-300',
                status === 'running' && 'text-indigo-300',
                status === 'pending' && 'text-zinc-500',
                status === 'skipped' && 'text-zinc-600'
              )}>
                {label}
              </div>
            </div>

            {/* Status icon */}
            <div>
              {status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
              {status === 'running' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
              {status === 'pending' && <Circle className="w-4 h-4 text-zinc-700" />}
              {status === 'skipped' && <Circle className="w-4 h-4 text-zinc-800" />}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
