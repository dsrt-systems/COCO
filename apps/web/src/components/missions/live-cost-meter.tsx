'use client';

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { DollarSign, Zap, Activity } from 'lucide-react';
import type { LiveMissionMetrics } from '@coco/realtime';

interface LiveCostMeterProps {
  metrics: LiveMissionMetrics;
  budgetLimitUsd?: number;
}

export function LiveCostMeter({ metrics, budgetLimitUsd = 50 }: LiveCostMeterProps) {
  const [displayCost, setDisplayCost] = useState(0);
  const [displayTokens, setDisplayTokens] = useState(0);

  // Animate cost number up smoothly when metrics change
  useEffect(() => {
    const controls = animate(displayCost, metrics.total_cost_usd, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayCost(v),
    });
    return () => controls.stop();
  }, [metrics.total_cost_usd]);

  useEffect(() => {
    const total = metrics.total_tokens_input + metrics.total_tokens_output;
    const controls = animate(displayTokens, total, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayTokens(v),
    });
    return () => controls.stop();
  }, [metrics.total_tokens_input, metrics.total_tokens_output]);

  const costPct = Math.min(100, (metrics.total_cost_usd / budgetLimitUsd) * 100);
  const isWarning = costPct >= 75;
  const isCritical = costPct >= 90;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Cost Card */}
      <div className={`p-4 rounded-xl border ${
        isCritical ? 'border-red-500/40 bg-red-500/5' :
        isWarning ? 'border-amber-500/40 bg-amber-500/5' :
        'border-zinc-800 bg-zinc-950/50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className={`w-4 h-4 ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cost Accrued</span>
        </div>
        <div className={`text-2xl font-mono font-bold ${
          isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          ${displayCost.toFixed(4)}
        </div>
        <div className="mt-2 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${costPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-1 text-[10px] text-zinc-500 font-mono text-right">
          ${budgetLimitUsd.toFixed(2)} limit · {costPct.toFixed(0)}%
        </div>
      </div>

      {/* Tokens Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tokens</span>
        </div>
        <div className="text-2xl font-mono font-bold text-indigo-400">
          {(displayTokens / 1000).toFixed(1)}k
        </div>
        <div className="mt-2 flex gap-3 text-[10px] font-mono text-zinc-500">
          <span>In: {(metrics.total_tokens_input / 1000).toFixed(1)}k</span>
          <span>Out: {(metrics.total_tokens_output / 1000).toFixed(1)}k</span>
        </div>
        <div className="mt-1 text-[10px] text-zinc-600 font-mono">
          {metrics.total_model_calls} model calls
        </div>
      </div>

      {/* Activity Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Activity</span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 mt-1">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Agents</div>
            <div className="text-lg font-mono font-bold text-zinc-200">{metrics.active_agents}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Runs</div>
            <div className="text-lg font-mono font-bold text-zinc-200">{metrics.completed_runs}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Tools</div>
            <div className="text-lg font-mono font-bold text-zinc-200">{metrics.total_tool_calls}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Verify</div>
            <div className="text-lg font-mono font-bold">
              <span className="text-emerald-400">{metrics.verification_passes}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-red-400">{metrics.verification_failures}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
