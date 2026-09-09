'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CreateMissionForm() {
  const router = useRouter();
  const [objective, setObjective] = useState('');
  const [tier, setTier] = useState<'default' | 'pro' | 'ranger'>('default');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (objective.trim().length < 3) {
      toast.error('Objective must be at least 3 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: objective.trim(),
          tier,
          cognitive_depth: depth,
          run_bootstrap: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? 'Failed to create mission');
        setLoading(false);
        return;
      }
      toast.success('Mission created');
      router.push(`/missions/${json.mission.mission_id}`);
    } catch (err) {
      toast.error(String(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Mission</CardTitle>
        <CardDescription>
          State the objective. COCO will understand, plan, execute, verify, and deliver.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <textarea
              id="objective"
              required
              rows={5}
              placeholder="e.g. Build a FastAPI auth service with JWT, refresh tokens, rate limiting, and full test coverage"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={loading}
              className="flex w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as typeof tier)}
                disabled={loading}
                className="flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="default">Default</option>
                <option value="pro">Pro</option>
                <option value="ranger">Ranger</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="depth">Cognitive Depth (D{depth})</Label>
              <input
                id="depth"
                type="range"
                min={0}
                max={6}
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                disabled={loading}
                className="w-full accent-white"
              />
              <p className="text-xs text-muted-foreground">
                {['Reflex', 'Direct', 'Reasoned', 'Investigative', 'Constructive', 'Organizational', 'Ranger'][depth]}
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full btn-glow" disabled={loading || objective.trim().length < 3}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Creating mission…
              </>
            ) : (
              <>
                <Rocket /> Launch mission
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
