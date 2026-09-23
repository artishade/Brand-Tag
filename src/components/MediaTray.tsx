import React, { useRef, useEffect } from 'react';
import { Upload, Film, Image as ImageIcon, ShieldCheck, Layers, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
      scrollContainerRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-32 sm:h-34 border-t border-zinc-800 bg-zinc-950/95 px-3 sm:px-4 py-2 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Top Filter and Info Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-zinc-400 font-medium text-[11px] mr-1 flex items-center gap-1">
            <span>Queue:</span>
            <span className="text-indigo-400 font-bold font-mono">({items.length})</span>
          </span>

          <button
            onClick={() => onSelectTagFilter(null)}
            className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors cursor-pointer ${
              selectedTagFilter === null
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            All ({items.length})
          </button>

          {allTags.map((tag) => {
            const count = items.filter((i) => i.tags.includes(tag)).length;
            const isSelected = selectedTagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTagFilter(isSelected ? null : tag)}
                className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600/90 text-white shadow-sm border border-indigo-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80'
                }`}
              >
                {tag} <span className="text-zinc-500 ml-0.5 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Carousel Scroll Arrows */}
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={scrollLeft}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            title="Scroll Left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            title="Scroll Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline ml-1">
            Tap thumbnail to switch
          </span>
        </div>
      </div>

      {/* Media Thumbnails Carousel */}
      <div
        ref={scrollContainerRef}
        className="w-full min-w-0 flex items-center gap-2.5 overflow-x-auto py-1 touch-pan-x scrollbar-thin scroll-smooth"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Trigger Tile */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-16 sm:h-18 rounded-lg border-2 border-dashed border-zinc-800 hover:border-indigo-500/70 bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-indigo-400 transition-all shrink-0 cursor-pointer group"
          title="Upload multiple images, videos, or a .zip archive"
        >
          <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-[10px] font-semibold text-center leading-tight">+ Upload</span>
        </button>

        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center text-xs text-zinc-500 pl-3">
            No media matching current filter.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                data-media-id={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group relative w-24 h-16 sm:h-18 rounded-lg overflow-hidden shrink-0 border cursor-pointer transition-all ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-zinc-900 scale-[1.02]'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                }`}
              >
                {/* Media Image / Video Thumbnail */}
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative">
                    <video
                      src={item.cleanedUrl || item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Film className="w-4 h-4 text-zinc-200" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.cleanedUrl || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Index & AI Clean Badge */}
                <div className="absolute top-1 left-1 flex items-center gap-0.5">
                  <span className="bg-zinc-950/80 text-zinc-300 text-[9px] font-mono font-bold px-1 rounded">
                    {idx + 1}
                  </span>
                  <div
                    className="bg-zinc-950/80 rounded p-0.5 text-emerald-400"
                    title="AI metadata stripped & SynthID disrupted"
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Custom Overlay Indicator */}
                {item.hasCustomOverlays && (
                  <div
                    className="absolute top-1 right-6 bg-indigo-950/80 rounded p-0.5 text-indigo-300"
                    title="Custom watermark active on this media"
                  >
                    <Layers className="w-2.5 h-2.5" />
                  </div>
                )}

                {/* Delete button (accessible on mobile and desktop) */}
                <button
                  onClick={(e) => onDeleteItem(item.id, e)}
                  className="absolute top-1 right-1 w-4.5 h-4.5 rounded bg-zinc-950/80 hover:bg-red-700 text-zinc-400 hover:text-white flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  title="Remove from queue"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>

                {/* File Name Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950/95 to-transparent px-1.5 py-0.5">
                  <p className="text-[9px] text-zinc-200 truncate font-mono">{item.name}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
