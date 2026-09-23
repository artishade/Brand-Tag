import React, { useRef } from 'react';
import {
  Upload,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldAlert,
  Palette,
  LayoutGrid,
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

        // Update logo overlay in overlays list
        const logoOverlay = config.overlays.find((ov) => ov.type === 'logo');
        if (logoOverlay) {
          onUpdateOverlay(logoOverlay.id, { content: dataUrl });
        } else {
          // Create new logo overlay
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
    const svgUrl = generateSampleLogoSVG(type === 'badge' ? 'Apex Studio' : type === 'monogram' ? 'Nexus' : 'Studio X', type);
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
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-100">Auto-Apply to All Media</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
              ACTIVE
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Default logo & texts automatically stamp all current and newly uploaded files
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.applyToAll}
          onChange={(e) => onUpdateConfig({ applyToAll: e.target.checked })}
          className="w-4 h-4 accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Brand Watermark Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preset Layout Templates</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => onApplyPresetLayout('modern-corner')}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left cursor-pointer transition-colors"
          >
            <div className="font-medium text-zinc-200">Modern Studio</div>
            <div className="text-[10px] text-zinc-500">Logo Top-L · Text Bottom-C</div>
          </button>
          <button
            onClick={() => onApplyPresetLayout('minimal-bottom')}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left cursor-pointer transition-colors"
          >
            <div className="font-medium text-zinc-200">Bottom Signature</div>
            <div className="text-[10px] text-zinc-500">Subtle stamp on Bottom-R</div>
          </button>
          <button
            onClick={() => onApplyPresetLayout('center-protect')}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left cursor-pointer transition-colors"
          >
            <div className="font-medium text-zinc-200">Center Watermark</div>
            <div className="text-[10px] text-zinc-500">Ghost watermark centered</div>
          </button>
          <button
            onClick={() => onApplyPresetLayout('social-bundle')}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left cursor-pointer transition-colors"
          >
            <div className="font-medium text-zinc-200">Social Creator</div>
            <div className="text-[10px] text-zinc-500">@handle + Logo Top-R</div>
          </button>
        </div>
      </div>

      {/* Default Logo Section */}
      <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Default Brand Logo</span>
          </label>
          <span className="text-[10px] text-zinc-500 font-mono">PNG / SVG / JPG</span>
        </div>

        {/* Logo Preview box */}
        <div className="h-20 bg-zinc-950/80 border border-zinc-800 rounded-lg p-2 flex items-center justify-center relative overflow-hidden group">
          {config.defaultLogo?.url ? (
            <img
              src={config.defaultLogo.url}
              alt="Default logo"
              className="max-h-16 max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-500">No logo uploaded yet</span>
          )}

          {/* Overlay hover change button */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium cursor-pointer"
            >
              Upload Custom Logo
            </button>
          </div>
        </div>

        {/* Action / Sample choices */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
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

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-zinc-500">Samples:</span>
            <button
              onClick={() => setSampleLogo('badge')}
              className="hover:text-white underline cursor-pointer"
            >
              Badge
            </button>
            <span>·</span>
            <button
              onClick={() => setSampleLogo('monogram')}
              className="hover:text-white underline cursor-pointer"
            >
              Monogram
            </button>
            <span>·</span>
            <button
              onClick={() => setSampleLogo('crest')}
              className="hover:text-white underline cursor-pointer"
            >
              Crest
            </button>
          </div>
        </div>
      </div>

      {/* Multiple Default Texts Section */}
      <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>Default Text Watermarks ({textOverlays.length})</span>
          </label>
          <button
            onClick={onAddTextOverlay}
            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded border border-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Text</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {textOverlays.map((textOv, idx) => (
            <div
              key={textOv.id}
              className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-500">Text Layer #{idx + 1}</span>
                <button
                  onClick={() => onDeleteOverlay(textOv.id)}
                  className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                  title="Remove text"
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
                className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 text-xs focus:border-indigo-500 focus:outline-none"
              />

              {/* Quick Styling Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Font Family */}
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-0.5">Font</label>
                  <select
                    value={textOv.fontFamily || "'Plus Jakarta Sans', sans-serif"}
                    onChange={(e) => onUpdateOverlay(textOv.id, { fontFamily: e.target.value })}
                    className="w-full px-1.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-300 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="'Plus Jakarta Sans', sans-serif">Modern Sans</option>
                    <option value="'JetBrains Mono', monospace">Monospace Tech</option>
                    <option value="Georgia, serif">Editorial Serif</option>
                    <option value="Impact, sans-serif">Bold Stamp</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-0.5">Text Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={textOv.color || '#ffffff'}
                      onChange={(e) => onUpdateOverlay(textOv.id, { color: e.target.value })}
                      className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-zinc-400 uppercase">
                      {textOv.color || '#FFFFFF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Background badge toggle & Shadow */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
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

                <label className="flex items-center gap-1.5 cursor-pointer">
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
      </div>
    </div>
  );
};
