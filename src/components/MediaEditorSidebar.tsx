import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Tag as TagIcon,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Layers,
  Crop,
  Sun,
  Palette,
  Check,
} from 'lucide-react';
import { MediaItem, WatermarkOverlay, MediaEdits } from '../types';
import { GlobalBrandSettings } from './GlobalBrandSettings';
import { GlobalBrandConfig } from '../types';

interface MediaEditorSidebarProps {
  item: MediaItem;
  globalConfig: GlobalBrandConfig;
  onUpdateGlobalConfig: (updates: Partial<GlobalBrandConfig>) => void;
  onUpdateItemEdits: (edits: Partial<MediaEdits>) => void;
  onUpdateItemTags: (tags: string[]) => void;
  onBatchApplyTagsToAll: (tag: string) => void;
  onBatchApplyEditsToAll: () => void;
  onExportSingleMedia: () => void;
  onAddTextOverlay: () => void;
  onUpdateOverlay: (id: string, updates: Partial<WatermarkOverlay>) => void;
  onDeleteOverlay: (id: string) => void;
  onApplyPresetLayout: (preset: 'modern-corner' | 'minimal-bottom' | 'center-protect' | 'social-bundle') => void;
  activeOverlays: WatermarkOverlay[];
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
}

export const MediaEditorSidebar: React.FC<MediaEditorSidebarProps> = ({
  item,
  globalConfig,
  onUpdateGlobalConfig,
  onUpdateItemEdits,
  onUpdateItemTags,
  onBatchApplyTagsToAll,
  onBatchApplyEditsToAll,
  onExportSingleMedia,
  onAddTextOverlay,
  onUpdateOverlay,
  onDeleteOverlay,
  onApplyPresetLayout,
  activeOverlays,
  selectedOverlayId,
  onSelectOverlay,
}) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'edits' | 'tags'>('brand');
  const [newTagInput, setNewTagInput] = useState('');
  const [copiedEditsNotice, setCopiedEditsNotice] = useState(false);

  const edits = item.edits;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !item.tags.includes(trimmed)) {
      onUpdateItemTags([...item.tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateItemTags(item.tags.filter((t) => t !== tagToRemove));
  };

  const handleApplyEditsToAll = () => {
    onBatchApplyEditsToAll();
    setCopiedEditsNotice(true);
    setTimeout(() => setCopiedEditsNotice(false), 2000);
  };

  return (
    <aside className="w-80 md:w-96 border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* Tab Navigation */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'brand'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Watermarks</span>
          </button>

          <button
            onClick={() => setActiveTab('edits')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'edits'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Edits</span>
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TagIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Tags & Meta</span>
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: BRAND WATERMARKS */}
        {activeTab === 'brand' && (
          <GlobalBrandSettings
            config={globalConfig}
            onUpdateConfig={onUpdateGlobalConfig}
            onAddTextOverlay={onAddTextOverlay}
            onUpdateOverlay={onUpdateOverlay}
            onDeleteOverlay={onDeleteOverlay}
            onApplyPresetLayout={onApplyPresetLayout}
          />
        )}

        {/* TAB 2: EDITS & COLOR ADJUSTMENTS */}
        {activeTab === 'edits' && (
          <div className="space-y-6 text-xs text-zinc-300">
            {/* Aspect Ratio Framing */}
            <div className="space-y-2">
              <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-indigo-400" />
                <span>Aspect Ratio Presets</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['original', '1:1', '16:9', '9:16', '4:5', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => onUpdateItemEdits({ aspectRatio: ratio })}
                    className={`py-1.5 px-2 rounded border text-center transition-all cursor-pointer ${
                      edits.aspectRatio === ratio
                        ? 'bg-indigo-600/90 text-white border-indigo-500 font-semibold shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {ratio === 'original' ? 'Original' : ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform: Rotate & Flip */}
            <div className="space-y-2">
              <label className="font-semibold text-zinc-200">Orientation & Transform</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateItemEdits({
                      rotation: ((edits.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                    })
                  }
                  className="flex-1 py-1.5 px-3 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90° ({edits.rotation}°)</span>
                </button>

                <button
                  onClick={() => onUpdateItemEdits({ flipH: !edits.flipH })}
                  className={`p-2 rounded border cursor-pointer ${
                    edits.flipH
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onUpdateItemEdits({ flipV: !edits.flipV })}
                  className={`p-2 rounded border cursor-pointer ${
                    edits.flipV
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sliders: Tone Adjustments */}
            <div className="space-y-4 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tone & Color Balance</span>
                </label>
                <button
                  onClick={() =>
                    onUpdateItemEdits({
                      brightness: 0,
                      contrast: 0,
                      saturation: 0,
                      warmth: 0,
                      vignette: 0,
                    })
                  }
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                >
                  Reset Tone
                </button>
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Brightness</span>
                  <span className="font-mono text-zinc-500">{edits.brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={edits.brightness}
                  onChange={(e) => onUpdateItemEdits({ brightness: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Contrast</span>
                  <span className="font-mono text-zinc-500">{edits.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={edits.contrast}
                  onChange={(e) => onUpdateItemEdits({ contrast: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Saturation</span>
                  <span className="font-mono text-zinc-500">{edits.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={edits.saturation}
                  onChange={(e) => onUpdateItemEdits({ saturation: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Warmth */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Warmth</span>
                  <span className="font-mono text-zinc-500">{edits.warmth}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={edits.warmth}
                  onChange={(e) => onUpdateItemEdits({ warmth: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Vignette */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Vignette</span>
                  <span className="font-mono text-zinc-500">{edits.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={edits.vignette}
                  onChange={(e) => onUpdateItemEdits({ vignette: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Batch copy edits */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={handleApplyEditsToAll}
                className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copiedEditsNotice ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Edits Applied to All Files!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    <span>Apply These Edits to All Media</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: TAGS & FILE INFO */}
        {activeTab === 'tags' && (
          <div className="space-y-5 text-xs text-zinc-300">
            {/* Tag manager */}
            <div className="space-y-2">
              <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Media Tags</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="e.g. Social, Client, 2026..."
                  className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.length === 0 ? (
                  <span className="text-zinc-500 italic text-[11px]">No tags assigned yet</span>
                ) : (
                  item.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs group"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Suggested quick tags */}
              <div className="pt-2">
                <span className="text-[10px] text-zinc-500 block mb-1">Quick Add:</span>
                <div className="flex flex-wrap gap-1">
                  {['Instagram', 'Watermarked', 'High-Res', 'Client-Proof', 'Cleaned'].map(
                    (suggested) => (
                      <button
                        key={suggested}
                        onClick={() => {
                          if (!item.tags.includes(suggested)) {
                            onUpdateItemTags([...item.tags, suggested]);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        + {suggested}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* File Specifications */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 font-mono text-[11px]">
              <div className="text-zinc-400 font-semibold font-sans mb-1 text-xs">
                File Information
              </div>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                <span className="text-zinc-500">Dimensions</span>
                <span className="text-zinc-200">
                  {item.width} × {item.height} px
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                <span className="text-zinc-500">File Type</span>
                <span className="text-zinc-200 uppercase">{item.type}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/50">
                <span className="text-zinc-500">File Size</span>
                <span className="text-zinc-200">
                  {(item.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-500">AI Metadata</span>
                <span className="text-emerald-400 font-medium">PURGED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Export Single Media */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/80">
        <button
          onClick={onExportSingleMedia}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export This File (High-Res Clean)</span>
        </button>
      </div>
    </aside>
  );
};
