'use client';

import { FileText, Code, Image as ImageIcon, Box, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function ArtifactViewer({ artifacts }: { artifacts: any[] }) {
  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-transparent text-sm text-zinc-500">
        No artifacts produced yet.
      </div>
    );
  }

  const getIcon = (kind: string) => {
    switch (kind) {
      case 'code': return <Code className="w-4 h-4 text-emerald-400" />;
      case 'doc':
      case 'report': return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-amber-400" />;
      default: return <Box className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {artifacts.map((art) => (
        <Card key={art.artifact_id} className="p-4 bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/60 transition-colors group cursor-pointer flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700">
              {getIcon(art.artifact_kind)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {art.file_name || `${art.artifact_kind}_${art.artifact_id.slice(0, 6)}`}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {(art.size_bytes / 1024).toFixed(1)} KB • {art.content_type}
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100" />
        </Card>
      ))}
    </div>
  );
}
