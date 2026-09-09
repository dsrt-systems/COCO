import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Shield, BookOpen, Rocket, Plus } from 'lucide-react';
import { SignOutButton } from '@/components/shell/sign-out-button';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/coco/security/context';
import { createMissionEngine } from '@/lib/coco/kernel/factory';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const engine = createMissionEngine();
  const missions = await engine.list(session.organization_id, 10);

  return (
    <main className="shell-bg noise min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session.display_name} · {session.organization_display_name}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <section className="container py-12">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Phase 6</p>
            <h1 className="text-gradient text-4xl font-semibold tracking-tight">
              The Intelligent Substrate
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Models streaming at 500tps. The Project Brain persisting semantic graphs. Complete intelligence.
            </p>
          </div>
          <Button asChild className="btn-glow shrink-0">
            <Link href="/missions/new">
              <Plus /> New mission
            </Link>
          </Button>
        </div>

        {/* Phase pills */}
        <div className="mb-10 flex flex-wrap gap-2">
          {['0 Foundation', '1 Types', '2 Database', '3 Security', '4 Kernel'].map((p, i) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/[0.06] px-3 py-1 text-xs text-green-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_currentColor]" />
              {p}
            </span>
          ))}
        </div>

        {/* Missions list */}
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Recent Missions
          </h2>
          {missions.length === 0 ? (
            <div className="card-3d flex flex-col items-center gap-4 p-12 text-center">
              <Rocket className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No missions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Launch your first mission to see the kernel in action.
                </p>
              </div>
              <Button asChild>
                <Link href="/missions/new">Create mission</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((m) => (
                <Link
                  key={m.mission_id}
                  href={`/missions/${m.mission_id}`}
                  className="group flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.objective}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{m.phase}</span>
                      <span>{Math.round(m.progress_percent)}%</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/models" className="group card-3d p-6 hover:border-white/[0.12]"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Model Fabric</h3><p className="text-sm text-muted-foreground">7 Providers · 500tps · Streaming</p></div></div></Link><Link href="/brain" className="group card-3d p-6 hover:border-white/[0.12]"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Project Brain</h3><p className="text-sm text-muted-foreground">Knowledge Graph · Semantic Memory</p></div></div></Link><Link href="/security" className="group card-3d p-6 hover:border-white/[0.12]">
            <Shield className="mb-3 h-5 w-5 text-muted-foreground" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Security Fabric</h3>
                <p className="text-sm text-muted-foreground">Tokens · Audit · Permissions</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5" />
            </div>
          </Link>
          <Link href="/constitution" className="group card-3d p-6 hover:border-white/[0.12]">
            <BookOpen className="mb-3 h-5 w-5 text-muted-foreground" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">The Constitution</h3>
                <p className="text-sm text-muted-foreground">12 laws · Method · Depth</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}

