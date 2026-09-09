import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Hexagon, 
  Plus, 
  ArrowRight, 
  FolderKanban, 
  Cpu, 
  ShieldCheck, 
  TerminalSquare, 
  Dna, 
  BrainCircuit,
  Activity,
  Zap
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { client, user, organizationId } = await createServerSupabase();

  if (!user) {
    redirect('/sign-in');
  }

  // Safe data fetching with fallback for fresh accounts
  let missions: any[] = [];
  let projects: any[] = [];
  let activeAgentsCount = 0;

  try {
    const [missionsRes, projectsRes, agentsRes] = await Promise.all([
      client
        .schema('missions')
        .from('missions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .schema('projects')
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .limit(4),
      client
        .schema('agents')
        .from('agent_instances')
        .select('agent_instance_id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'running'),
    ]);

    missions = missionsRes.data ?? [];
    projects = projectsRes.data ?? [];
    activeAgentsCount = agentsRes.count ?? 0;
  } catch {
    // Graceful fallback for new orgs or DB initialization
  }

  const displayName = user.email?.split('@')[0] ?? 'Operator';

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto pb-24">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              System Online
            </span>
            <span className="text-xs text-zinc-500 font-mono">Org: {organizationId}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Welcome back, <span className="text-indigo-400">{displayName}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            COCO Autonomous Intelligence Operating System &bull; 13 Fabrics Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Link href="/missions/new">
              <Plus className="w-4 h-4 mr-2" /> New Mission
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-zinc-800 bg-zinc-950/50 space-y-1">
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>ACTIVE MISSIONS</span>
            <Hexagon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{missions.length}</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-950/50 space-y-1">
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>RUNNING AGENTS</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{activeAgentsCount}</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-950/50 space-y-1">
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>ACTIVE PROJECTS</span>
            <FolderKanban className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{projects.length}</div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-950/50 space-y-1">
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>SPECIALIST ROSTER</span>
            <Zap className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-fuchsia-400">134</div>
        </Card>
      </div>

      {/* Recent Missions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-indigo-400" /> Recent Missions
          </h2>
          <Link href="/missions" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            View all missions <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {missions.length === 0 ? (
          <Card className="p-12 border-zinc-800 bg-zinc-950/40 text-center space-y-3">
            <Hexagon className="w-12 h-12 text-zinc-700 mx-auto" />
            <h3 className="text-base font-medium text-zinc-300">No active missions</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Launch your first mission to assemble expert agents and execute verified work.
            </p>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Link href="/missions/new">Create First Mission</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <Link
                key={m.mission_id}
                href={`/missions/${m.mission_id}`}
                className="group flex items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="text-sm font-medium text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
                    {m.objective}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 font-mono">
                    <span className="uppercase text-indigo-400 font-semibold">{m.phase}</span>
                    <span>{Math.round(m.progress_percent ?? 0)}% complete</span>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Fabric Launchpad Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-800/80 pb-2">
          System Fabrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/ranger">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <Zap className="w-5 h-5 text-amber-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-300">Ranger Runtime</h3>
              <p className="text-xs text-zinc-500">Autonomous multi-hour missions with charters &amp; checkpoints.</p>
            </Card>
          </Link>

          <Link href="/brain">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300">Project Brain</h3>
              <p className="text-xs text-zinc-500">Force-directed knowledge graph &amp; 7 memory scopes.</p>
            </Card>
          </Link>

          <Link href="/verification">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-fuchsia-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-fuchsia-300">Verification Ladder</h3>
              <p className="text-xs text-zinc-500">L0–L10 quality gates &amp; paired adversarial critics.</p>
            </Card>
          </Link>

          <Link href="/execution">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <TerminalSquare className="w-5 h-5 text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-300">Execution Sandbox</h3>
              <p className="text-xs text-zinc-500">E2B Firecracker microVMs &amp; Tier 4 Operators (D1–D5).</p>
            </Card>
          </Link>

          <Link href="/evolution">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <Dna className="w-5 h-5 text-purple-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-purple-300">Evolution Fabric</h3>
              <p className="text-xs text-zinc-500">6 closed-loop learners, Thompson sampling &amp; policy bundles.</p>
            </Card>
          </Link>

          <Link href="/security">
            <Card className="p-5 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all group cursor-pointer h-full space-y-2">
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-blue-300">Observability</h3>
              <p className="text-xs text-zinc-500">Real-time WebSocket event bus &amp; Ed25519 audit chains.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
