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
  Check,
  Crop,
  Sun,
  Sparkles,
  Layers,
  Info,
  ArrowLeft,
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
  activeTab?: 'brand' | 'edits' | 'tags';
  onTabChange?: (tab: 'brand' | 'edits' | 'tags') => void;
  onCloseMobile?: () => void;
}

const TABS = [
  { id: 'brand' as const, label: 'Brand', icon: Layers, color: 'text-indigo-400' },
  { id: 'edits' as const, label: 'Adjust', icon: Sliders, color: 'text-sky-400' },
  { id: 'tags' as const, label: 'Tags', icon: TagIcon, color: 'text-amber-400' },
];

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
  activeTab: propActiveTab,
  onTabChange,
  onCloseMobile,
}) => {
  const [internalTab, setInternalTab] = useState<'brand' | 'edits' | 'tags'>('brand');
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = (tab: 'brand' | 'edits' | 'tags') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
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

  // Has any edit been applied (non-default)?
  const hasEdits =
    edits.brightness !== 0 ||
    edits.contrast !== 0 ||
    edits.saturation !== 0 ||
    edits.warmth !== 0 ||
    edits.vignette !== 0 ||
    edits.rotation !== 0 ||
    edits.flipH ||
    edits.flipV ||
    edits.aspectRatio !== 'original';

  return (
    <aside className="w-full md:w-[380px] border-l border-zinc-800/80 bg-[#0c0c0f] flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* Mobile top bar */}
      {onCloseMobile && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800 backdrop-blur">
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md hover:bg-zinc-800 cursor-pointer"
              aria-label="Back to canvas"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            {activeTab === 'brand' ? 'Brand & Watermarks' : activeTab === 'edits' ? 'Adjustments' : 'Tags & Info'}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30">
        <div className="grid grid-cols-3 gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
          <div className="space-y-5 text-xs text-zinc-300">
            {/* Aspect Ratio */}
            <section className="space-y-2.5">
              <SectionHeader icon={Crop} title="Aspect Ratio" />
              <div className="grid grid-cols-3 gap-1.5">
                {(['original', '1:1', '16:9', '9:16', '4:5', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => onUpdateItemEdits({ aspectRatio: ratio })}
                    className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                      edits.aspectRatio === ratio
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {ratio === 'original' ? 'Original' : ratio}
                  </button>
                ))}
              </div>
            </section>

            {/* Transform */}
            <section className="space-y-2.5">
              <SectionHeader icon={RotateCw} title="Orientation" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateItemEdits({
                      rotation: ((edits.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                    })
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                  <span className="text-zinc-500 font-mono text-[10px] ml-auto">{edits.rotation}°</span>
                </button>

                <button
                  onClick={() => onUpdateItemEdits({ flipH: !edits.flipH })}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    edits.flipH
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title="Flip Horizontal"
                  aria-label="Flip horizontal"
                  aria-pressed={edits.flipH}
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onUpdateItemEdits({ flipV: !edits.flipV })}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    edits.flipV
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title="Flip Vertical"
                  aria-label="Flip vertical"
                  aria-pressed={edits.flipV}
                >
                  <FlipVertical className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* Tone & Color Sliders */}
            <section className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Sun} title="Tone & Color" />
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
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                >
                  Reset
                </button>
              </div>

              <SliderRow
                label="Brightness"
                value={edits.brightness}
                min={-50}
                max={50}
                onChange={(v) => onUpdateItemEdits({ brightness: v })}
              />
              <SliderRow
                label="Contrast"
                value={edits.contrast}
                min={-50}
                max={50}
                onChange={(v) => onUpdateItemEdits({ contrast: v })}
              />
              <SliderRow
                label="Saturation"
                value={edits.saturation}
                min={-60}
                max={60}
                onChange={(v) => onUpdateItemEdits({ saturation: v })}
              />
              <SliderRow
                label="Warmth"
                value={edits.warmth}
                min={-30}
                max={30}
                onChange={(v) => onUpdateItemEdits({ warmth: v })}
              />
              <SliderRow
                label="Vignette"
                value={edits.vignette}
                min={0}
                max={80}
                unit="%"
                onChange={(v) => onUpdateItemEdits({ vignette: v })}
              />
            </section>

            {/* Batch copy edits */}
            <section className="pt-2 border-t border-zinc-800/80">
              <button
                onClick={handleApplyEditsToAll}
                disabled={!hasEdits}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-zinc-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copiedEditsNotice ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Applied to All Files!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    <span>Apply Edits to All Media</span>
                  </>
                )}
              </button>
            </section>
          </div>
        )}

        {/* TAB 3: TAGS & FILE INFO */}
        {activeTab === 'tags' && (
          <div className="space-y-5 text-xs text-zinc-300">
            {/* Tag manager */}
            <section className="space-y-2.5">
              <SectionHeader icon={TagIcon} title="Custom Tags" />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="e.g. Social, Client, 2026..."
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tag badges */}
              <div className="flex flex-wrap gap-1.5 pt-1 min-h-[2rem]">
                {item.tags.length === 0 ? (
                  <span className="text-zinc-500 italic text-[11px]">No tags assigned yet</span>
                ) : (
                  item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:border-zinc-700 transition-colors"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="w-4 h-4 rounded-full hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Quick Add */}
              <div className="pt-1">
                <span className="text-[10px] text-zinc-500 block mb-1.5">Quick add:</span>
                <div className="flex flex-wrap gap-1">
                  {['Instagram', 'Watermarked', 'High-Res', 'Client-Proof', 'Cleaned'].map(
                    (suggested) => {
                      const alreadyHas = item.tags.includes(suggested);
                      return (
                        <button
                          key={suggested}
                          onClick={() => {
                            if (!alreadyHas) {
                              onUpdateItemTags([...item.tags, suggested]);
                            }
                          }}
                          disabled={alreadyHas}
                          className={`px-2 py-1 rounded-full border text-[10px] transition-colors ${
                            alreadyHas
                              ? 'bg-zinc-900 border-zinc-800/60 text-zinc-600 cursor-not-allowed'
                              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 cursor-pointer'
                          }`}
                        >
                          {alreadyHas ? '✓ ' : '+ '}
                          {suggested}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </section>

            {/* File Specifications */}
            <section className="space-y-2 pt-2 border-t border-zinc-800/80">
              <SectionHeader icon={Info} title="File Information" />
              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden">
                <InfoRow label="Dimensions" value={`${item.width} × ${item.height} px`} />
                <InfoRow label="File Type" value={item.type.toUpperCase()} mono />
                <InfoRow label="File Size" value={`${(item.size / (1024 * 1024)).toFixed(2)} MB`} mono />
                <InfoRow
                  label="AI Metadata"
                  value={
                    <span className="text-emerald-400 font-medium flex items-center gap-1 justify-end">
                      <Sparkles className="w-3 h-3" /> PURGED
                    </span>
                  }
                />
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer: Export Single Media */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/30">
        <button
          onClick={onExportSingleMedia}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Export This File</span>
          <span className="text-indigo-200/70 text-[10px]">· High-Res Clean</span>
        </button>
      </div>
    </aside>
  );
};

/* ============================================================
   Helper UI components
   ============================================================ */

const SectionHeader: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string }> = ({
  icon: Icon,
  title,
}) => (
  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
    <Icon className="w-3.5 h-3.5 text-zinc-400" />
    <span>{title}</span>
  </h3>
);

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, unit = '', onChange }) => {
  const isDefault = value === 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <button
          onClick={() => onChange(0)}
          className={`font-mono ${isDefault ? 'text-zinc-500' : 'text-indigo-300 hover:text-indigo-200 cursor-pointer'} transition-colors`}
          title={`Reset ${label}`}
        >
          {value > 0 ? `+${value}` : value}{unit}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex justify-between items-center py-2 px-3 border-b border-zinc-800/50 last:border-b-0">
    <span className="text-zinc-500 text-[11px]">{label}</span>
    <span className={`text-zinc-200 text-[11px] ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);
