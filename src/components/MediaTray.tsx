import React, { useRef, useEffect } from 'react';
import {
  Upload,
  Film,
  Image as ImageIcon,
  ShieldCheck,
  Layers,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaTrayProps {
  items: MediaItem[];
  activeId: string | null;
  onSelectItem: (id: string) => void;
  onDeleteItem: (id: string, e: React.MouseEvent) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  selectedTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  allTags: string[];
}

export const MediaTray: React.FC<MediaTrayProps> = ({
  items,
  activeId,
  onSelectItem,
  onDeleteItem,
  onUploadFiles,
  selectedTagFilter,
  onSelectTagFilter,
  allTags,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const filteredItems = selectedTagFilter
    ? items.filter((item) => item.tags.includes(selectedTagFilter))
    : items;

  // Auto-scroll active item into view
  useEffect(() => {
    if (activeId && scrollContainerRef.current) {
      const activeElem = scrollContainerRef.current.querySelector(`[data-media-id="${activeId}"]`);
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeId]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  return (
    <div className="border-t border-zinc-800/80 bg-[#0a0a0c]/95 backdrop-blur-md px-3 sm:px-4 pt-2 pb-2.5 flex flex-col shrink-0 select-none z-20">
      {/* Top: Filter chips + scroll arrows */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden text-xs min-w-0">
          <span className="text-zinc-500 font-medium text-[11px] mr-1 shrink-0 flex items-center gap-1">
            <span>Queue</span>
            <span className="text-indigo-400 font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              {items.length}
            </span>
          </span>

          <button
            onClick={() => onSelectTagFilter(null)}
            className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedTagFilter === null
                ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
            aria-pressed={selectedTagFilter === null}
          >
            All
            {selectedTagFilter === null && <Check className="w-3 h-3" />}
          </button>

          {allTags.map((tag) => {
            const count = items.filter((i) => i.tags.includes(tag)).length;
            const isSelected = selectedTagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTagFilter(isSelected ? null : tag)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <span>{tag}</span>
                <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-zinc-500'}`}>
                  {count}
                </span>
                {isSelected && <X className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Scroll arrows */}
        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer active:scale-95 transition-all"
            aria-label="Scroll media queue left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer active:scale-95 transition-all"
            aria-label="Scroll media queue right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Media thumbnails carousel */}
      <div
        ref={scrollContainerRef}
        className="w-full min-w-0 flex items-center gap-2.5 overflow-x-auto py-1 touch-pan-x scrollbar-hidden scroll-smooth"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload trigger tile */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-[88px] h-[68px] sm:w-24 sm:h-20 rounded-xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/60 hover:bg-indigo-500/[0.04] bg-zinc-900/40 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-indigo-300 transition-all shrink-0 cursor-pointer group active:scale-95"
          title="Upload multiple images, videos, or a .zip archive"
          aria-label="Upload media files"
        >
          <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-[10px] font-semibold">Upload</span>
        </button>

        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center text-xs text-zinc-500 pl-3 italic">
            No media matches the selected tag.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                data-media-id={item.id}
                onClick={() => onSelectItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(item.id);
                  }
                }}
                className={`group relative w-[120px] h-[68px] sm:w-32 sm:h-20 rounded-xl overflow-hidden shrink-0 border cursor-pointer transition-all active:scale-95 ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-[#0a0a0c] shadow-lg shadow-indigo-500/10'
                    : 'border-zinc-800 hover:border-zinc-600 hover:ring-1 hover:ring-zinc-700'
                }`}
              >
                {/* Media thumbnail */}
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative">
                    <video
                      src={item.cleanedUrl || item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <Film className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.cleanedUrl || item.url}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Top badges */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                  <span className="bg-black/70 backdrop-blur-sm text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                    {idx + 1}
                  </span>
                </div>

                {/* AI cleaned indicator (top-right) */}
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center shadow-sm ring-1 ring-emerald-300/30"
                  title="AI metadata stripped & SynthID disrupted"
                >
                  <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                </div>

                {/* Custom overlay indicator */}
                {item.hasCustomOverlays && (
                  <div
                    className="absolute top-7 right-1.5 w-4 h-4 rounded-full bg-indigo-500/90 backdrop-blur-sm flex items-center justify-center shadow-sm ring-1 ring-indigo-300/30"
                    title="Custom watermark active on this media"
                  >
                    <Layers className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => onDeleteItem(item.id, e)}
                  className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md bg-black/70 backdrop-blur-sm hover:bg-red-600 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 active:scale-90"
                  title="Remove from queue"
                  aria-label={`Remove ${item.name} from queue`}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>

                {/* Filename bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pt-3 pb-1">
                  <p className="text-[9px] text-zinc-200 truncate font-mono leading-tight">
                    {item.name}
                  </p>
                </div>

                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
