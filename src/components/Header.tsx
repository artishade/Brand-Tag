import React from 'react';
import {
  ShieldCheck,
  Download,
  FolderArchive,
  Sparkles,
  Plus,
  Image as ImageIcon,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { MediaItem } from '../types';

interface HeaderProps {
  mediaCount: number;
  activeItem?: MediaItem;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenAIInspector: () => void;
  onLoadSamples: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mediaCount,
  activeItem,
  onOpenUpload,
  onOpenExport,
  onOpenAIInspector,
  onLoadSamples,
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-zinc-800/80 bg-[#0a0a0c]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 z-30 shrink-0 select-none">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-[15px] font-bold text-zinc-100 tracking-tight truncate">
              BrandStudio
            </h1>
            <span className="hidden sm:inline-block text-zinc-600 font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              v2.6
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
            AI Purifier & Batch Watermark Studio
          </p>
        </div>
      </div>

      {/* Center Status Pills (desktop only) */}
      <div className="hidden lg:flex items-center gap-3">
        <button
          onClick={onOpenAIInspector}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/[0.07] hover:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-500/40 transition-colors cursor-pointer"
          title="View AI fingerprint sanitization details"
          aria-label="Open AI fingerprint inspector"
        >
          <span className="relative flex">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
          </span>
          <span className="text-[11px] font-semibold text-emerald-300">AI-Purified</span>
          <ChevronRight className="w-3 h-3 text-emerald-500/60 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px] px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
          <span className="text-zinc-300 font-semibold">{mediaCount}</span>
          <span>{mediaCount === 1 ? 'file' : 'files'}</span>
          {activeItem && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400 truncate max-w-[120px]" title={activeItem.name}>
                {activeItem.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onLoadSamples}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
          title="Load sample media to explore the studio"
        >
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Demo</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer active:scale-[0.98] shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Media</span>
          <kbd className="hidden md:inline ml-1 px-1 py-0.5 rounded bg-zinc-950/50 text-[9px] font-mono text-zinc-400">⌘U</kbd>
          <span className="sm:hidden">Add</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={mediaCount === 0}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none rounded-lg transition-all cursor-pointer shadow-md shadow-indigo-600/25 active:scale-[0.98]"
          title="Export all media as a clean ZIP archive"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export ZIP</span>
          <kbd className="hidden md:inline ml-1 px-1 py-0.5 rounded bg-indigo-950/40 text-[9px] font-mono text-indigo-200">⌘E</kbd>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
};
