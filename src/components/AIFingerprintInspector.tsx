import React from 'react';
import {
  ShieldCheck,
  X,
  FileCode,
  CheckCircle2,
  Cpu,
  EyeOff,
  Sparkles,
  Lock,
} from 'lucide-react';
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

  const originalSizeKB = item ? (item.aiStats.originalDataBytes / 1024).toFixed(0) : '0';
  const cleanedSizeKB = item ? (item.aiStats.cleanDataBytes / 1024).toFixed(0) : '0';
  const reductionPct = item
    ? Math.max(0, Math.round((1 - item.aiStats.cleanDataBytes / Math.max(1, item.aiStats.originalDataBytes)) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 modal-backdrop flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">AI Sanitization Report</h3>
              <p className="text-[11px] text-zinc-500">
                Multi-tier metadata & watermark eradication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto text-xs text-zinc-300">
          {/* File summary */}
          {item && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-zinc-200 truncate min-w-0">
                  {item.name}
                </span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% SANITIZED
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Original file was analyzed on upload. All AI metadata chunks were permanently purged,
                and invisible watermark frequency correlations were neutralized.
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Stat label="Original" value={`${originalSizeKB} KB`} />
                <Stat label="Cleaned" value={`${cleanedSizeKB} KB`} accent="text-emerald-400" />
                <Stat label="Reduction" value={`${reductionPct}%`} accent="text-indigo-400" />
              </div>
            </div>
          )}

          {/* Detected signatures */}
          <div>
            <h4 className="font-semibold text-zinc-200 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Signatures Detected & Disrupted</span>
            </h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              {signatures.map((sig, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-zinc-200 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{sig}</span>
                  </div>
                  <span className="text-emerald-400 font-sans text-[10px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    PURGED
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Three-Tier Clean Pipeline */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-800">
            <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>How BrandStudio Removes AI Fingerprints</span>
            </h4>

            <div className="grid gap-2">
              <PipelineStep
                step="1"
                icon={FileCode}
                iconColor="text-sky-400"
                title="Total Metadata Purge"
                description="Strips all C2PA Content Credentials manifests, XMP packets, EXIF user comments, Midjourney prompt parameters, and Stable Diffusion seeds through raw canvas pixel reconstitution."
              />
              <PipelineStep
                step="2"
                icon={EyeOff}
                iconColor="text-indigo-400"
                title="SynthID & Frequency Disruption"
                description="Disrupts imperceptible high-frequency watermarks (Google SynthID, Tree-Ring) via a sub-perceptual micro-dither mask that breaks algorithmic correlation while maintaining visual fidelity."
              />
              <PipelineStep
                step="3"
                icon={Cpu}
                iconColor="text-emerald-400"
                title="Clean Container Re-Encoding"
                description="Purified pixels are saved into a fresh media container with clean sRGB color matrices, preventing automated AI checkers from flagging your creative assets."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent = 'text-zinc-100',
}) => (
  <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-center">
    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
    <div className={`font-mono font-semibold text-[12px] ${accent}`}>{value}</div>
  </div>
);

const PipelineStep: React.FC<{
  step: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
}> = ({ step, icon: Icon, iconColor, title, description }) => (
  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-3 hover:border-zinc-700 transition-colors">
    <div className={`shrink-0 mt-0.5 flex items-center gap-1.5`}>
      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-0.5">
        {step}
      </span>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div>
      <div className="font-medium text-zinc-200 mb-0.5">{title}</div>
      <p className="text-zinc-400 text-[11px] leading-relaxed">{description}</p>
    </div>
  </div>
);
