import React, { useState } from 'react';
import {
  FolderArchive,
  Download,
  X,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Package,
  FileCheck,
} from 'lucide-react';
import { MediaItem, WatermarkOverlay } from '../types';
import { createBatchExportZip } from '../utils/zipHandler';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  globalOverlays: WatermarkOverlay[];
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  items,
  globalOverlays,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentFilename, setCurrentFilename] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setIsCompleted(false);
    setProgressPercent(0);

    try {
      const zipBlob = await createBatchExportZip(items, globalOverlays, (percent, filename) => {
        setProgressPercent(percent);
        setCurrentFilename(filename);
      });

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `brandstudio_purified_media_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setIsCompleted(true);
    } catch (err) {
      console.error('Batch export failed:', err);
      alert('Error during batch export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setIsCompleted(false);
      setProgressPercent(0);
      setCurrentFilename('');
      onClose();
    }
  };

  const totalSizeMB = items.reduce((sum, i) => sum + i.size, 0) / (1024 * 1024);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 modal-backdrop flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (!isExporting && e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Batch Export</h3>
              <p className="text-[11px] text-zinc-500">Clean watermarked ZIP bundle</p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
              aria-label="Close export dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-zinc-300">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
            <SummaryRow
              icon={<FolderArchive className="w-3.5 h-3.5 text-zinc-400" />}
              label="Media Files"
              value={
                <span className="font-semibold text-zinc-100">
                  {items.length} <span className="text-zinc-500 font-normal">items</span>
                </span>
              }
            />
            <SummaryRow
              icon={<FileCheck className="w-3.5 h-3.5 text-zinc-400" />}
              label="Total Size"
              value={
                <span className="font-semibold text-zinc-100">
                  {totalSizeMB.toFixed(1)} <span className="text-zinc-500 font-normal">MB</span>
                </span>
              }
            />
            <SummaryRow
              icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              label="AI Status"
              value={
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Purged
                </span>
              }
            />
          </div>

          {/* Progress or Completion */}
          {isExporting && (
            <div className="space-y-3 text-center py-2">
              <div className="flex items-center justify-center gap-2 text-indigo-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium text-zinc-200">Packaging Media...</span>
              </div>
              <p className="text-zinc-400 text-[11px] truncate max-w-xs mx-auto font-mono">
                {currentFilename ? `→ ${currentFilename}` : 'Preparing assets...'}
              </p>

              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-zinc-400 text-[11px]">{progressPercent}%</span>
            </div>
          )}

          {isCompleted && !isExporting && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-fade-in-up">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-zinc-100">Export Complete!</div>
                <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Your clean, watermarked ZIP bundle has been downloaded.
                </div>
              </div>
            </div>
          )}

          {!isExporting && !isCompleted && (
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              All images are composited at native resolution with your custom logos, text overlays,
              and color grading. An audit manifest is bundled inside the ZIP.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          {!isExporting && (
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              {isCompleted ? 'Done' : 'Cancel'}
            </button>
          )}

          {!isCompleted && (
            <button
              onClick={handleStartExport}
              disabled={isExporting || items.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/25 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isExporting ? 'Packaging...' : `Download ${items.length} Files as ZIP`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-zinc-400 flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </span>
    {value}
  </div>
);
