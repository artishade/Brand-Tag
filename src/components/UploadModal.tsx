import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderArchive,
  Image as ImageIcon,
  Film,
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
  isProcessing: boolean;
  progressText: string;
  progressPercent: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  onLoadSamples,
  isProcessing,
  progressText,
  progressPercent,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-100">Upload Photos, Videos or ZIP Archive</h3>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drop Zone Area */}
        <div className="p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.zip"
            onChange={handleFileChange}
            className="hidden"
          />

          {isProcessing ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-200">{progressText}</p>
                <p className="text-xs text-zinc-400">Purging C2PA, EXIF, and neutralizing SynthID signatures...</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-400">{progressPercent}%</span>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/60'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 shadow-inner">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-200 mb-1">
                Drop multiple pictures, videos, or a .ZIP archive here
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                Supports PNG, JPG, WebP, GIF, MP4, WebM, MOV, and compressed ZIP bundles.
              </p>

              <button
                type="button"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold shadow border border-zinc-700 pointer-events-none"
              >
                Browse Files
              </button>
            </div>
          )}

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-2">
              <FolderArchive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-zinc-200">ZIP Unpack Engine</span>
                <p className="text-[11px] text-zinc-500">Automatically extracts all media inside ZIP files</p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-zinc-200">Auto AI Sanitizer</span>
                <p className="text-[11px] text-zinc-500">Strips C2PA and invisible AI watermarks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isProcessing && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
            <button
              onClick={() => {
                onLoadSamples();
                onClose();
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Media Pack</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
