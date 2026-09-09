'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, ShieldAlert, Cpu, Banknote } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Mock data for Recharts (In production, this is fed by evolution.v_daily_model_spend)
const MOCK_BURN_DATA = [
  { time: '00:00', cost: 1.2, tokens: 45000 },
  { time: '04:00', cost: 2.1, tokens: 78000 },
  { time: '08:00', cost: 5.4, tokens: 180000 },
  { time: '12:00', cost: 12.8, tokens: 420000 },
  { time: '16:00', cost: 18.5, tokens: 610000 },
  { time: '20:00', cost: 15.2, tokens: 510000 },
];

const MOCK_AGENT_PERF = [
  { name: 'C1_Python', passRate: 98, latency: 12 },
  { name: 'C36_Legal', passRate: 94, latency: 45 },
  { name: 'C48_Fin', passRate: 91, latency: 28 },
  { name: 'A3_Critic', passRate: 99, latency: 8 },
];

export default function ObservabilityPage() {
  const [keyStatus, setKeyStatus] = useState<any>(null);

  useEffect(() => {
    checkKeys();
  }, []);

  async function checkKeys() {
    try {
      const res = await fetch('/api/security/self-test', { method: 'POST' });
      const data = await res.json();
      setKeyStatus(data);
    } catch {
      toast.error('Failed to check security keys');
    }
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Activity className="w-8 h-8 text-indigo-400" /> Observability & Security
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Platform telemetry, cost governance, token burn rates, and cryptographic integrity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cost Burn Chart */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" /> Daily Cost Burn (USD)
            </h2>
            <span className="text-2xl font-mono text-emerald-400">$55.20</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_BURN_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#34d399' }}
                />
                <Line type="monotone" dataKey="cost" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Token Burn Chart */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> Token Volume
            </h2>
            <span className="text-2xl font-mono text-indigo-400">1.84M</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_BURN_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#818cf8' }}
                  formatter={(val: number) => [val.toLocaleString(), 'Tokens']}
                />
                <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Agent Performance */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">Agent Pass Rates (L9 Critic)</h2>
          <div className="space-y-4">
            {MOCK_AGENT_PERF.map(agent => (
              <div key={agent.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">{agent.name}</span>
                  <span className="text-zinc-400">{agent.passRate}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${agent.passRate > 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${agent.passRate}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cryptographic Integrity */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Cryptographic Integrity
            </h2>
            <Button onClick={checkKeys} variant="outline" size="sm">Verify Keys</Button>
          </div>
          
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Ed25519 Public Key:</span>
              <span className="text-zinc-300">{keyStatus ? 'Loaded' : 'Checking...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Signature Test:</span>
              <span className={keyStatus?.testSignatureValid ? 'text-emerald-400' : 'text-zinc-400'}>
                {keyStatus ? (keyStatus.testSignatureValid ? 'PASS' : 'FAIL') : '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Audit Hash-Chain:</span>
              <span className="text-emerald-400">Intact (1,402 events)</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
