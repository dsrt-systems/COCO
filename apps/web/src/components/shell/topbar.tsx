'use client';

import { Search, Bell } from 'lucide-react';
import { CommandPalette } from './command-palette';

export function Topbar() {
  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/60 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex-1 flex items-center">
          <button 
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg text-sm text-zinc-400 transition-all duration-200 w-64 shadow-inner"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search COCO...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-800/50">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
          </button>
        </div>
      </header>
      <CommandPalette />
    </>
  );
}
