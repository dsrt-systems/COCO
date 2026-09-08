import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Zap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="shell-bg noise min-h-screen">
      {/* Nav */}
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">
              Get started <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="container flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Autonomous Intelligence Organization
        </div>

        <h1 className="text-gradient max-w-4xl text-balance text-6xl font-semibold tracking-tight sm:text-7xl">
          The intelligence operating system for real work.
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          COCO accepts human missions, assembles world-class expert agents, executes verified work,
          and produces professional deliverables that meet or exceed the standard of elite human
          experts in each domain.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Button size="lg" className="btn-glow" asChild>
            <Link href="/sign-up">
              Start a mission <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container grid grid-cols-1 gap-6 pb-32 md:grid-cols-3">
        <FeatureCard
          icon={<Zap />}
          title="Verified outcomes"
          description="Every artifact passes a 10-level verification ladder before delivery. Not fast answers. Correct ones."
        />
        <FeatureCard
          icon={<Layers />}
          title="Expert-grade specialists"
          description="Domain experts trained to beat median human professionals — with citations, evidence, and independent critics."
        />
        <FeatureCard
          icon={<Shield />}
          title="Safety by construction"
          description="Capability tokens, isolated sandboxes, tamper-evident audit logs. Autonomy earned per action, not granted globally."
        />
      </section>

      <footer className="container border-t border-white/[0.06] py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DSRT AI. All rights reserved.
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card-3d p-8">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
