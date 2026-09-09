'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Terminal, Globe, Database, GitBranch, Rocket } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  terminal: <Terminal className="w-4 h-4 text-emerald-400" />,
  browser: <Globe className="w-4 h-4 text-blue-400" />,
  database: <Database className="w-4 h-4 text-purple-400" />,
  git: <GitBranch className="w-4 h-4 text-orange-400" />,
  deploy: <Rocket className="w-4 h-4 text-red-400" />,
};

export default function ExecutionConsolePage() {
  const [tools, setTools] = useState<any[]>([]);
  const [sandboxes, setSandboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Test invocation state
  const [selectedTool, setSelectedTool] = useState('');
  const [testArgs, setTestArgs] = useState('{"command": "echo \\"Hello from E2B Sandbox!\\""}');
  const [tokenOverride, setTokenOverride] = useState('tkn_dummy_override_for_ui');

  useEffect(() => {
    fetchTools();
    fetchSandboxes();
  }, []);

  async function fetchTools() {
    try {
      const res = await fetch('/api/tools/registry');
      const data = await res.json();
      if (res.ok) setTools(data.tools ?? []);
    } catch {}
  }

  async function fetchSandboxes() {
    setLoading(true);
    try {
      const res = await fetch('/api/sandboxes');
      const data = await res.json();
      if (res.ok) setSandboxes(data.sandboxes ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleInvoke(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTool) {
      toast.error('Select a tool to invoke');
      return;
    }

    setInvoking(true);
    setResult(null);
    try {
      const parsedArgs = JSON.parse(testArgs);
      
      const req = {
        agent_instance_id: 'ain_ui_tester',
        tool_id: selectedTool,
        arguments: parsedArgs,
        capability_token_id: tokenOverride,
      };

      const res = await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      const data = await res.json();
      setResult(data.result || data);
      
      if (res.ok && data.result?.status === 'success') {
        toast.success(`Tool executed successfully in ${data.result.wall_time_ms}ms`);
      } else {
        toast.error(`Execution failed: ${data.result?.error_message || data.error}`);
      }
      
      // Refresh sandbox list to show the ephemeral container
      fetchSandboxes();
    } catch (err) {
      toast.error('Invalid JSON arguments or network error');
    } finally {
      setInvoking(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Execution Console
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage E2B MicroVM Sandboxes and Tier 4 Operators (Terminal, Browser, Git, DB, Deploy).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Registry & Invoker */}
        <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-6">
          <h2 className="text-lg font-semibold text-zinc-100">Tier 4 Operators</h2>
          
          <div className="grid grid-cols-1 gap-2">
            {tools.map((t) => (
              <div
                key={t.tool_id}
                onClick={() => {
                  setSelectedTool(t.tool_id);
                  if (t.tool_id === 'd1_browser_automation') setTestArgs('{"url": "https://example.com"}');
                  if (t.tool_id === 'd2_terminal_exec') setTestArgs('{"command": "uname -a"}');
                  if (t.tool_id === 'd4_db_query') setTestArgs('{"query": "SELECT 1"}');
                }}
                className={`p-3 rounded border cursor-pointer transition-colors flex items-center gap-3 ${
                  selectedTool === t.tool_id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800'
                }`}
              >
                {ICON_MAP[t.category] || <Terminal className="w-4 h-4" />}
                <div>
                  <div className="text-sm font-medium text-zinc-200">{t.display_name}</div>
                  <div className="text-xs text-zinc-500 font-mono">{t.tool_id}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleInvoke} className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="space-y-1">
              <Label>Arguments (JSON)</Label>
              <textarea
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                className="w-full h-24 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm font-mono text-zinc-300"
              />
            </div>
            
            <div className="space-y-1">
              <Label>Capability Token Override (for UI testing)</Label>
              <Input
                value={tokenOverride}
                onChange={(e) => setTokenOverride(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs"
              />
              <p className="text-[10px] text-zinc-500">In production, this is issued by A6 Risk Officer.</p>
            </div>

            <Button type="submit" disabled={invoking || !selectedTool} className="w-full bg-indigo-600 hover:bg-indigo-500">
              {invoking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {invoking ? 'Allocating Sandbox & Executing...' : 'Invoke Operator'}
            </Button>
          </form>
        </Card>

        {/* Results & Sandboxes */}
        <div className="space-y-6">
          <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4 min-h-[300px]">
            <h2 className="text-lg font-semibold text-zinc-100">Execution Result</h2>
            {!result && !invoking && (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                Run an operator to see results.
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="flex gap-4 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded ${result.status === 'success' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>
                    {result.status}
                  </span>
                  <span className="text-zinc-400">Exit: {result.exit_code ?? 'N/A'}</span>
                  <span className="text-zinc-400">{result.wall_time_ms}ms</span>
                </div>
                
                {result.output && (
                  <div>
                    <Label className="text-xs text-zinc-500">Structured Output:</Label>
                    <pre className="mt-1 p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
                      {JSON.stringify(result.output, null, 2)}
                    </pre>
                  </div>
                )}

                {result.logs_excerpt && (
                  <div>
                    <Label className="text-xs text-zinc-500">Logs Excerpt:</Label>
                    <pre className="mt-1 p-3 rounded bg-black border border-zinc-800 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                      {result.logs_excerpt}
                    </pre>
                  </div>
                )}
                
                {result.error_message && (
                  <div className="p-3 rounded bg-red-950/50 border border-red-900 text-sm text-red-400">
                    {result.error_message}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6 border-zinc-800 bg-zinc-950/50 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-100">Sandbox Lifecycle Log</h2>
              <Button onClick={fetchSandboxes} variant="ghost" size="sm" className="h-8">Refresh</Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {sandboxes.map((s) => (
                <div key={s.sandbox_id} className="p-3 rounded border border-zinc-800 bg-zinc-900/40 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-mono text-zinc-300">{s.sandbox_id}</div>
                    <div className="text-[10px] text-zinc-500">{s.runtime_kind} • {s.external_sandbox_id}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded font-medium ${
                    s.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                    s.status === 'released' ? 'bg-zinc-800 text-zinc-400' :
                    s.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {s.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
