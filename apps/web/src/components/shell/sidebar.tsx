'use client';

import Link from 'next/link';
import { usePathname , Dna } from 'next/navigation';
import { 
  Hexagon, 
  LayoutDashboard, 
  BrainCircuit, 
  ShieldCheck, 
  Cpu, 
  TerminalSquare, 
  ScrollText,
  Activity,
  FolderKanban,
  MessageSquare
, Dna } from 'lucide-react';
import { cn , Dna } from '@/lib/utils/cn';

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Missions', href: '/missions', icon: Hexagon },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Project Brain', href: '/brain', icon: BrainCircuit },
  { name: 'Verification', href: '/verification', icon: ShieldCheck },
  { name: 'Execution', href: '/execution', icon: TerminalSquare },
  { name: 'Evolution', href: '/evolution', icon: Dna },
  { name: 'Observability', href: '/security', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-white/10">
            <Hexagon className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-widest text-zinc-100 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            COCO
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {NAVIGATION.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "bg-zinc-800/50 text-indigo-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-zinc-700/50" 
                    : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                {item.name}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800/60">
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <span className="text-xs font-bold text-zinc-300">OP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">Operator</span>
              <span className="text-[10px] text-zinc-500 font-mono">Tier: RANGER</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

