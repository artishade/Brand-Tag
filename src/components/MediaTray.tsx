import React, { useRef } from 'react';
import {
  Film,
  Image as ImageIcon,
  ShieldCheck,
  Trash2,
  Plus,
  Tag as TagIcon,
  Layers,
  Upload,
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

  const filteredItems = selectedTagFilter
    ? items.filter((item) => item.tags.includes(selectedTagFilter))
    : items;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="h-32 border-t border-zinc-800 bg-zinc-950 px-4 py-2.5 flex flex-col justify-between shrink-0 select-none">
      {/* Top bar: Tags Filter & Quick stats */}
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[70vw]">
          <span className="text-zinc-500 text-[11px] font-medium mr-1 flex items-center gap-1">
            <TagIcon className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => onSelectTagFilter(null)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
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

        <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
          Click thumbnail to edit · Drag logo/text on preview
        </div>
      </div>

      {/* Media Thumbnails Carousel */}
      <div className="flex items-center gap-2.5 overflow-x-auto py-1">
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
          className="w-20 h-18 rounded-lg border-2 border-dashed border-zinc-800 hover:border-indigo-500/70 bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-indigo-400 transition-all shrink-0 cursor-pointer group"
          title="Upload images, videos, or a .zip archive"
        >
          <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-[10px] font-medium">+ Add / ZIP</span>
        </button>

        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center text-xs text-zinc-500 pl-4">
            No media matching tag filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group relative w-24 h-18 rounded-lg overflow-hidden shrink-0 border cursor-pointer transition-all ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-zinc-900'
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
                      <Film className="w-5 h-5 text-zinc-200" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.cleanedUrl || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* AI Clean Badge */}
                <div
                  className="absolute top-1 left-1 bg-zinc-950/80 rounded p-0.5 text-emerald-400"
                  title="AI metadata stripped & SynthID disrupted"
                >
                  <ShieldCheck className="w-3 h-3" />
                </div>

                {/* Custom Overlay Indicator */}
                {item.hasCustomOverlays && (
                  <div
                    className="absolute top-1 right-6 bg-indigo-950/80 rounded p-0.5 text-indigo-300"
                    title="Custom placement active on this media"
                  >
                    <Layers className="w-3 h-3" />
                  </div>
                )}

                {/* Delete button on hover */}
                <button
                  onClick={(e) => onDeleteItem(item.id, e)}
                  className="absolute top-1 right-1 w-5 h-5 rounded bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remove from batch"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* File Name & Format Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950/95 to-transparent px-1.5 py-0.5">
                  <p className="text-[9px] text-zinc-300 truncate font-mono">{item.name}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
