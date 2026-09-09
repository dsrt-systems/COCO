'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Plus, Terminal, BrainCircuit, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl border-zinc-800 bg-zinc-950 sm:max-w-[600px] rounded-xl">
        <Command className="flex flex-col w-full h-full bg-transparent text-zinc-100">
          <div className="flex items-center px-4 border-b border-zinc-800/60">
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <Command.Input 
              placeholder="Type a command or search..." 
              className="flex-1 h-12 bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-zinc-500 font-mono"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-center text-zinc-500">No results found.</Command.Empty>
            
            <Command.Group heading="Missions" className="px-2 py-1.5 text-xs font-semibold text-zinc-500">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/missions/new'))}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" /> New Ranger Mission
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Fabrics" className="px-2 py-1.5 text-xs font-semibold text-zinc-500 mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/brain'))}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <BrainCircuit className="w-4 h-4" /> Search Project Brain
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/execution'))}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <Terminal className="w-4 h-4" /> Open Execution Console
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/verification'))}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" /> Run Verification Ladder
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
