import React from 'react';
import {
  ShieldCheck,
  FolderArchive,
  Plus,
} from 'lucide-react';
import { MediaItem } from '../types';

interface HeaderProps {
  mediaCount: number;
  activeItem?: MediaItem;
  onAddMedia: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mediaCount,
  activeItem,
  onAddMedia,
  onOpenExport,
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-zinc-800/80 bg-[#0a0a0c]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 z-30 shrink-0 select-none">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-[15px] font-bold text-zinc-100 tracking-tight truncate">
            BrandStudio
          </h1>
          <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
            Watermark &amp; AI Media Purifier
          </p>
        </div>
      </div>

      {/* Center: file count + active file (desktop only) */}
      {mediaCount > 0 && (
        <div className="hidden lg:flex items-center gap-2 text-zinc-500 font-mono text-[11px] px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
          <span className="text-zinc-300 font-semibold">{mediaCount}</span>
          <span>{mediaCount === 1 ? 'file' : 'files'}</span>
          {activeItem && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400 truncate max-w-[160px]" title={activeItem.name}>
                {activeItem.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onAddMedia}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer active:scale-[0.98] shadow-md shadow-indigo-600/25"
          title="Add photos, videos, or a ZIP archive"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Media</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={mediaCount === 0}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
          title="Export all media as a clean ZIP archive"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
