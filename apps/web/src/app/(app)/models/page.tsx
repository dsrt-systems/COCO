'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cpu, Play, Sparkles, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/shell/sign-out-button';

export default function ModelsDashboardPage() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedCapability, setSelectedCapability] = useState('reason.fast');
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('Explain how COCO outperforms traditional chatbots using verified verification ladder checks in 3 concise points.');
  const [output, setOutput] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    fetch('/api/models/registry')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setModels(d.models);
      });
  }, []);

  async function runInference() {
    setStreaming(true);
    setOutput('');
    setUsage(null);

    try {
      const res = await fetch('/api/models/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          capability: selectedCapability,
          model_id: selectedModel || undefined,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6));
            if (event.kind === 'content_delta') {
              setOutput((prev) => prev + event.text_delta);
            }
            if (event.kind === 'stream_end') {
              setUsage(event.usage_snapshot);
            }
          }
        }
      }
    } catch (e) {
      setOutput(`Error: ${String(e)}`);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="shell-bg noise min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
            Dashboard
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <section className="container py-12">
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Fabric 5</p>
          <h1 className="text-gradient text-4xl font-semibold tracking-tight">Model Fabric</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Capabilities over models. Route across Anthropic, Groq, DeepSeek, OpenAI, Google, and OpenRouter seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Route Selector</CardTitle>
                <CardDescription>Select capability or target model directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Capability</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm"
                    value={selectedCapability}
                    onChange={(e) => setSelectedCapability(e.target.value)}
                  >
                    <option value="reason.fast">reason.fast (Groq / Llama / Gemini)</option>
                    <option value="reason.deep">reason.deep (Claude 3.5 / DeepSeek-R1)</option>
                    <option value="code.gen.repo">code.gen.repo (Claude 3.5 / GPT-OSS 120B)</option>
                    <option value="vision.understand">vision.understand (Gemini / GPT-4o)</option>
                    <option value="reason.tool_augmented">reason.tool_augmented (Groq Compound)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Override Specific Model (Optional)</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="">Auto Router Selection</option>
                    {models.map((m) => (
                      <option key={m.model_id} value={m.model_id}>
                        {m.display_name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Test Prompt</label>
                  <textarea
                    rows={4}
                    className="flex w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm focus:outline-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                <Button onClick={runInference} disabled={streaming} className="w-full btn-glow">
                  {streaming ? <Sparkles className="animate-spin" /> : <Play />} Execute Stream
                </Button>
              </CardContent>
            </Card>

            {/* Model Registry List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registered Models ({models.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {models.map((m) => (
                  <div key={m.model_id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span>{m.display_name}</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase">{m.provider}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground font-mono">
                      In: ${m.cost.input_per_million_usd}/M · Out: ${m.cost.output_per_million_usd}/M
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Stream Output */}
          <div className="lg:col-span-2">
            <Card className="h-full min-h-[500px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Live Inference Output</CardTitle>
                  <CardDescription>Streaming output from selected model substrate</CardDescription>
                </div>
                {usage && (
                  <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {usage.input_tokens}in / {usage.output_tokens}out</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${usage.cost_usd.toFixed(6)}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 font-mono text-sm whitespace-pre-wrap leading-relaxed border-t border-white/[0.06] pt-4">
                {output || <span className="text-muted-foreground opacity-50">Stream output will render here...</span>}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
