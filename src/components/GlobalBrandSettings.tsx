import React, { useRef } from 'react';
import {
  Upload,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  ShieldAlert,
  LayoutGrid,
  Square,
  AlignJustify,
  CircleDot,
  Share2,
} from 'lucide-react';
import { GlobalBrandConfig, WatermarkOverlay } from '../types';
import { generateSampleLogoSVG } from '../utils/sampleData';

interface GlobalBrandSettingsProps {
  config: GlobalBrandConfig;
  onUpdateConfig: (updates: Partial<GlobalBrandConfig>) => void;
  onAddTextOverlay: () => void;
  onUpdateOverlay: (id: string, updates: Partial<WatermarkOverlay>) => void;
  onDeleteOverlay: (id: string) => void;
  onApplyPresetLayout: (preset: 'modern-corner' | 'minimal-bottom' | 'center-protect' | 'social-bundle') => void;
}

const PRESETS = [
  {
    id: 'modern-corner' as const,
    name: 'Modern Studio',
    description: 'Logo top-left · Text bottom-center',
    icon: LayoutGrid,
    accent: 'from-indigo-500/20 to-blue-500/20',
    border: 'hover:border-indigo-500/50',
  },
  {
    id: 'minimal-bottom' as const,
    name: 'Bottom Signature',
    description: 'Subtle stamp on bottom-right',
    icon: AlignJustify,
    accent: 'from-zinc-500/20 to-zinc-600/20',
    border: 'hover:border-zinc-500/50',
  },
  {
    id: 'center-protect' as const,
    name: 'Center Protect',
    description: 'Ghost watermark centered',
    icon: CircleDot,
    accent: 'from-rose-500/20 to-red-500/20',
    border: 'hover:border-rose-500/50',
  },
  {
    id: 'social-bundle' as const,
    name: 'Social Creator',
    description: '@handle + Logo top-right',
    icon: Share2,
    accent: 'from-fuchsia-500/20 to-purple-500/20',
    border: 'hover:border-fuchsia-500/50',
  },
];

const FONT_OPTIONS = [
  { label: 'Modern Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Monospace Tech', value: "'JetBrains Mono', monospace" },
  { label: 'Editorial Serif', value: 'Georgia, serif' },
  { label: 'Bold Stamp', value: 'Impact, sans-serif' },
];

const COLOR_SWATCHES = ['#ffffff', '#0a0a0c', '#6366f1', '#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#a855f7'];

export const GlobalBrandSettings: React.FC<GlobalBrandSettingsProps> = ({
  config,
  onUpdateConfig,
  onAddTextOverlay,
  onUpdateOverlay,
  onDeleteOverlay,
  onApplyPresetLayout,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onUpdateConfig({
          defaultLogo: {
            url: dataUrl,
            name: file.name,
            width: img.naturalWidth || 300,
            height: img.naturalHeight || 100,
          },
        });

        const logoOverlay = config.overlays.find((ov) => ov.type === 'logo');
        if (logoOverlay) {
          onUpdateOverlay(logoOverlay.id, { content: dataUrl });
        } else {
          const newOverlay: WatermarkOverlay = {
            id: `ov-logo-${Date.now()}`,
            type: 'logo',
            content: dataUrl,
            x: 18,
            y: 16,
            scale: 1.0,
            opacity: 0.9,
            rotation: 0,
            blendMode: 'normal',
          };
          onUpdateConfig({
            overlays: [...config.overlays, newOverlay],
          });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const setSampleLogo = (type: 'badge' | 'monogram' | 'crest') => {
    const svgUrl = generateSampleLogoSVG(
      type === 'badge' ? 'Apex Studio' : type === 'monogram' ? 'Nexus' : 'Studio X',
      type
    );
    onUpdateConfig({
      defaultLogo: {
        url: svgUrl,
        name: `Sample_${type}.svg`,
        width: 320,
        height: 90,
      },
    });
    const logoOverlay = config.overlays.find((ov) => ov.type === 'logo');
    if (logoOverlay) {
      onUpdateOverlay(logoOverlay.id, { content: svgUrl });
    }
  };

  const textOverlays = config.overlays.filter((ov) => ov.type === 'text');

  return (
    <div className="space-y-5 text-zinc-300">
      {/* Auto-Apply Toggle */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-100">Auto-Apply to All Media</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-medium">
              {config.applyToAll ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
            Default logo & texts automatically stamp current and newly uploaded files
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.applyToAll}
          onChange={(e) => onUpdateConfig({ applyToAll: e.target.checked })}
          className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
        />
      </div>

      {/* Brand Watermark Presets */}
      <section className="space-y-2.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
          <span>Preset Layout Templates</span>
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => onApplyPresetLayout(preset.id)}
                className={`group p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 text-left cursor-pointer transition-all active:scale-95`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.accent} border border-zinc-800 flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4 text-zinc-100" />
                </div>
                <div className="font-medium text-zinc-200">{preset.name}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Default Logo Section */}
      <section className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Default Brand Logo</span>
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">PNG / SVG / JPG</span>
        </div>

        {/* Logo preview */}
        <div className="h-24 bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 flex items-center justify-center relative overflow-hidden group">
          {/* Checker pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)',
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
            }}
          />
          {config.defaultLogo?.url ? (
            <img
              src={config.defaultLogo.url}
              alt="Default logo"
              className="max-h-16 max-w-full object-contain relative z-10"
            />
          ) : (
            <div className="relative z-10 text-center">
              <ImageIcon className="w-5 h-5 text-zinc-700 mx-auto mb-1" />
              <span className="text-[11px] text-zinc-500">No logo uploaded yet</span>
            </div>
          )}

          {/* Hover change button */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium cursor-pointer transition-colors active:scale-95"
            >
              <Upload className="w-3 h-3 inline mr-1" />
              Replace Logo
            </button>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors"
          >
            <Upload className="w-3 h-3" />
            <span>Upload My Logo</span>
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-zinc-500">Samples:</span>
            <button
              onClick={() => setSampleLogo('badge')}
              className="hover:text-white hover:underline cursor-pointer transition-colors"
            >
              Badge
            </button>
            <button
              onClick={() => setSampleLogo('monogram')}
              className="hover:text-white hover:underline cursor-pointer transition-colors"
            >
              Monogram
            </button>
            <button
              onClick={() => setSampleLogo('crest')}
              className="hover:text-white hover:underline cursor-pointer transition-colors"
            >
              Crest
            </button>
          </div>
        </div>
      </section>

      {/* Multiple Default Texts Section */}
      <section className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>Text Watermarks</span>
            <span className="text-[10px] text-zinc-500 font-mono">({textOverlays.length})</span>
          </h3>
          <button
            onClick={onAddTextOverlay}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-3 h-3" />
            <span>Add Text</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {textOverlays.length === 0 && (
            <div className="py-6 text-center">
              <Type className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
              <p className="text-[11px] text-zinc-500 mb-2">No text watermarks yet</p>
              <button
                onClick={onAddTextOverlay}
                className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
              >
                + Add your first text watermark
              </button>
            </div>
          )}

          {textOverlays.map((textOv, idx) => (
            <div
              key={textOv.id}
              className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 text-xs hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Text Layer #{idx + 1}
                </span>
                <button
                  onClick={() => onDeleteOverlay(textOv.id)}
                  className="p-1 rounded hover:bg-red-950/60 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                  title="Remove text"
                  aria-label={`Remove text layer ${idx + 1}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Text Input */}
              <input
                type="text"
                value={textOv.content}
                onChange={(e) => onUpdateOverlay(textOv.id, { content: e.target.value })}
                placeholder="Enter watermark text..."
                className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600"
              />

              {/* Font + Color */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Font</label>
                  <select
                    value={textOv.fontFamily || "'Plus Jakarta Sans', sans-serif"}
                    onChange={(e) => onUpdateOverlay(textOv.id, { fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {FONT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Color</label>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <input
                      type="color"
                      value={textOv.color || '#ffffff'}
                      onChange={(e) => onUpdateOverlay(textOv.id, { color: e.target.value })}
                      className="w-5 h-5 rounded border-none cursor-pointer"
                      aria-label="Text color"
                    />
                    <div className="flex items-center gap-0.5">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => onUpdateOverlay(textOv.id, { color: c })}
                          className={`w-3 h-3 rounded-full border transition-transform hover:scale-125 cursor-pointer ${
                            textOv.color === c ? 'ring-1 ring-white/60' : 'border-zinc-700'
                          }`}
                          style={{ background: c }}
                          aria-label={`Set color to ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggles: bg pill + shadow */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!textOv.backgroundColor}
                    onChange={(e) =>
                      onUpdateOverlay(textOv.id, {
                        backgroundColor: e.target.checked ? '#09090b' : undefined,
                        backgroundOpacity: e.target.checked ? 0.75 : 0,
                      })
                    }
                    className="w-3.5 h-3.5 accent-indigo-500"
                  />
                  <span>Dark Badge Pill</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!textOv.shadow}
                    onChange={(e) => onUpdateOverlay(textOv.id, { shadow: e.target.checked })}
                    className="w-3.5 h-3.5 accent-indigo-500"
                  />
                  <span>Drop Shadow</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
