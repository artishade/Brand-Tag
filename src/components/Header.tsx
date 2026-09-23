import React from 'react';
import { ShieldCheck, Download, FolderArchive, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
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
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-5 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 tracking-tight">BrandStudio</h1>
            <span className="text-zinc-600 font-mono text-xs">v2.6</span>
          </div>
          <p className="text-[11px] text-zinc-400">Batch Watermark & AI Fingerprint Neutralizer</p>
        </div>
      </div>

      {/* Center Status: AI Purifier engine info */}
      <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400">
        <button
          onClick={onOpenAIInspector}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-colors text-emerald-400 group cursor-pointer"
          title="Click to inspect AI fingerprint purging details"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">AI Fingerprints Auto-Purified</span>
          <span className="text-zinc-500 group-hover:text-zinc-300">· C2PA / SynthID Neutralized</span>
        </button>

        <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
          <span>{mediaCount} {mediaCount === 1 ? 'file' : 'files'} in queue</span>
          {activeItem && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-300 truncate max-w-[140px]">{activeItem.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onLoadSamples}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Demo Media</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Media / ZIP</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={mediaCount === 0}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Export Clean ZIP</span>
        </button>
      </div>
    </header>
  );
};
