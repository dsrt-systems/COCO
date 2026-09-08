import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/shell/sign-out-button';
import { ArrowRight, Shield, BookOpen } from 'lucide-react';
import { getSession } from '@/lib/coco/security/context';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

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
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Phase 3</p>
          <h1 className="text-gradient text-4xl font-semibold tracking-tight">
            Security Fabric Core
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Ed25519 capability tokens, tamper-evident audit chain, and multi-tenant permission checker.
            Every dangerous action now passes through cryptographic gates.
          </p>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          <PhaseCard phase="0" title="Foundation" status="live" />
          <PhaseCard phase="1" title="Object Model" status="live" />
          <PhaseCard phase="2" title="Database" status="live" />
          <PhaseCard phase="3" title="Security" status="live" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/security"
            className="group card-3d p-6 transition-all hover:border-white/[0.12]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Security Fabric</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capability tokens · Audit chain · Permissions
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <Link
            href="/constitution"
            className="group card-3d p-6 transition-all hover:border-white/[0.12]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">The Constitution</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  12 laws · voice · method · cognitive depth
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}

function PhaseCard({
  phase,
  title,
  status,
}: {
  phase: string;
  title: string;
  status: 'live' | 'next' | 'pending';
}) {
  const badges = {
    live: {
      class: 'border-green-500/20 bg-green-500/[0.06] text-green-400',
      dot: 'bg-green-400 shadow-[0_0_8px_currentColor]',
      label: 'Live',
    },
    next: {
      class: 'border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-300',
      dot: 'bg-yellow-300',
      label: 'Next',
    },
    pending: {
      class: 'border-white/10 bg-white/[0.03] text-muted-foreground',
      dot: 'bg-muted-foreground',
      label: 'Pending',
    },
  };
  const b = badges[status];

  return (
    <div className="card-3d p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase {phase}</p>
      <h3 className="mt-1 text-sm font-semibold">{title}</h3>
      <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs ${b.class}`}>
        <div className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
        {b.label}
      </div>
    </div>
  );
}
