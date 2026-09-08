import { getConstitution } from '@/lib/coco/constitution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/shell/sign-out-button';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ConstitutionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const constitution = getConstitution();

  return (
    <main className="shell-bg noise min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <section className="container py-12">
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Governance</p>
          <h1 className="text-gradient text-4xl font-semibold tracking-tight">The Constitution</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {constitution.identity.one_sentence}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>{constitution.identity.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                COCO is
              </h4>
              <ul className="space-y-2">
                {constitution.identity.what_coco_is.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-green-400 shadow-[0_0_8px_currentColor]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
                COCO is not
              </h4>
              <ul className="space-y-2">
                {constitution.identity.what_coco_is_not.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-red-400/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">The 12 Laws</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {constitution.laws.laws.map((law) => (
              <Card key={law.number}>
                <CardHeader className="pb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-mono text-muted-foreground/60">
                      {law.number.toString().padStart(2, '0')}
                    </span>
                    <CardTitle className="text-lg">{law.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{law.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{constitution.method.name}</CardTitle>
            <CardDescription>Every mission — from a single question to a multi-day build — follows this shape.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {constitution.method.steps.map((step) => (
                <li key={step.number} className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] font-mono text-xs">
                    {step.number.toString().padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-medium">{step.name}</div>
                    <div className="text-sm text-muted-foreground">{step.description}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cognitive Depth</CardTitle>
            <CardDescription>How deeply COCO thinks, scaled to the mission.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {constitution.depth.levels.map((level) => (
                <div
                  key={level.level}
                  className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-mono text-sm">
                    D{level.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{level.name}</span>
                      <span className="text-xs text-muted-foreground">
                        · ~{formatMs(level.typical_latency_ms)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{level.typical_use}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Constitution v{constitution.identity.version} — immutable governance layer of COCO.
        </p>
      </section>
    </main>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}
