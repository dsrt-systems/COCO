import Link from 'next/link';
import { 
  Hexagon, 
  ShieldCheck, 
  TerminalSquare, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-fuchsia-600/10 blur-[150px] pointer-events-none" />

      <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-widest text-zinc-100">COCO</span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            DSRT AI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <button className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2">
              Launch Console <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </header>

      <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-indigo-400 mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Autonomous Intelligence Organization</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-zinc-100 leading-[1.1] mb-6">
          Verified Outcomes Over Fast Answers.
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10">
          COCO assembles world-class expert agents, executes verified work in hardware-isolated microVM sandboxes, and produces professional deliverables that beat human expert baselines.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2">
              Enter Console <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/constitution">
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all">
              Read Constitution
            </button>
          </Link>
        </div>
      </section>

      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/40 transition-all duration-300 space-y-4 group">
            <div className="p-3 w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">10-Level Verification Ladder</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every artifact is tested through 10 levels of verification — from syntax and strict typechecking to L9 paired adversarial critics and L10 human acceptance gates.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-purple-500/40 transition-all duration-300 space-y-4 group">
            <div className="p-3 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TerminalSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Hardware-Isolated MicroVMs</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Operators execute commands, write code, run browsers, and query databases inside ephemeral E2B Firecracker microVMs gated by Ed25519 capability tokens.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/40 transition-all duration-300 space-y-4 group">
            <div className="p-3 w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Ranger Autonomous Runtime</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Execute multi-hour or multi-day missions with durable hash-chained checkpoints, automatic budget enforcement, and drift-aware execution.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-zinc-800/60 bg-zinc-950/80 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              134 Capabilities Across 10 Branches
            </span>
            <h2 className="text-4xl font-extrabold text-zinc-100 leading-tight">
              An Army of World-Class Domain Specialists.
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              From Python Systems Architects and Corporate Legal Counsel to Clinical Investigators and Financial Modelers — every specialist follows explicit domain methodologies and is paired with an adversarial reviewer.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>7 Memory Scopes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Closed-Loop Evolution</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Prompt Injection Defended</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tamper-Evident Audit Chain</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-500">System State</span>
              <span className="text-emerald-400">NOMINAL (18/18 PHASES ACTIVE)</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-500">Registered Specialists</span>
              <span className="text-indigo-400 font-bold">134 Capabilities + 134 Critics</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-500">Model Router</span>
              <span className="text-zinc-300">8-Stage Pareto Utility Optimization</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-500">Realtime Observability</span>
              <span className="text-fuchsia-400">WebSocket Fan-out (17 Tables)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Security Architecture</span>
              <span className="text-emerald-400">Ed25519 Tokens + Firecracker Sandboxes</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-8 border-t border-zinc-800/60 text-center text-xs text-zinc-600 font-mono">
        &copy; 2026 DSRT AI &bull; COCO Autonomous Intelligence Organization &bull; Built to Deep Specs 1&ndash;10
      </footer>
    </div>
  );
}
