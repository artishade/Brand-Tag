import React from 'react';
import { ShieldCheck, X, FileCode, CheckCircle2, Cpu, EyeOff, Sparkles, Layers } from 'lucide-react';
import { MediaItem } from '../types';

interface AIFingerprintInspectorProps {
  item?: MediaItem;
  isOpen: boolean;
  onClose: () => void;
}

export const AIFingerprintInspector: React.FC<AIFingerprintInspectorProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const signatures = item?.aiStats.detectedSignatures || [
    'EXIF Prompt Generation Parameters Cleaned',
    'C2PA Content Credentials JUMBF Severed',
    'SynthID Latent Frequency Micro-Dither Neutralized',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">AI Fingerprint Sanitization Engine</h3>
              <p className="text-xs text-zinc-400">Automated multi-tier metadata & watermark eradication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs text-zinc-300">
          {/* Active File Summary */}
          {item && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 truncate max-w-[260px]">
                  {item.name}
                </span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% SANITIZED
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Original file was analyzed on upload, all AI metadata chunks were permanently purged,
                and invisible watermark frequency correlations were neutralized.
              </p>
            </div>
          )}

          {/* Detected and Neutralized Signatures */}
          <div>
            <h4 className="font-semibold text-zinc-200 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Signatures Detected & Disrupted</span>
            </h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              {signatures.map((sig, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{sig}</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-[10px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    PURGED
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Three-Tier Clean Pipeline Explanation */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <h4 className="font-semibold text-zinc-200">How BrandStudio Removes AI Fingerprints</h4>

            <div className="grid gap-2.5">
              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-3">
                <FileCode className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200 mb-0.5">1. Total Metadata Purge</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Strikes out all C2PA Content Credentials manifests, XMP packets, EXIF user comments,
                    Midjourney prompt parameters, and Stable Diffusion seeds through raw canvas pixel reconstitution.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-3">
                <EyeOff className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200 mb-0.5">2. SynthID & Frequency Disruption</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Disrupts imperceptible high-frequency watermarks (like Google SynthID and Tree-Ring)
                    by introducing a sub-perceptual micro-dither mask that breaks algorithmic correlation while maintaining 100% visual fidelity.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-3">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200 mb-0.5">3. Clean Container Re-Encoding</div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    The purified pixels are saved into a fresh media container with clean sRGB color matrices,
                    preventing automated AI checkers from flagging your creative assets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
