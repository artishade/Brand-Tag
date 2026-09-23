import React, { useState } from 'react';
import {
  FolderArchive,
  Download,
  X,
  CheckCircle2,
  Loader2,
  FileCheck,
  ShieldCheck,
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

      // Trigger download
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-100">Batch Export Clean ZIP</h3>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-zinc-300">
          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Total Media Files</span>
              <span className="font-semibold text-zinc-100">{items.length} items</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Watermarks Applied</span>
              <span className="text-indigo-400 font-medium">Logo & Multi-Texts Composited</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">AI Fingerprint Status</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Purged & Verified
              </span>
            </div>
          </div>

          {/* Progress or Completion State */}
          {isExporting && (
            <div className="space-y-3 text-center py-2">
              <div className="flex items-center justify-center gap-2 text-indigo-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium text-zinc-200">Rendering & Zipping Media...</span>
              </div>
              <p className="text-zinc-400 text-[11px] truncate max-w-xs mx-auto">
                {currentFilename ? `Processing: ${currentFilename}` : 'Preparing assets...'}
              </p>

              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-zinc-400 text-[11px]">{progressPercent}%</span>
            </div>
          )}

          {isCompleted && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-zinc-100">Export Complete!</div>
                <div className="text-[11px] text-zinc-400">
                  Your clean, watermarked ZIP bundle has been downloaded to your system.
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            All images are composited at maximum native resolution with your custom logos, text overlays, and color grading. An audit manifest is automatically bundled in the ZIP.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end gap-2">
          {!isExporting && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              {isCompleted ? 'Done' : 'Cancel'}
            </button>
          )}

          {!isCompleted && (
            <button
              onClick={handleStartExport}
              disabled={isExporting || items.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/25"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Packaging...' : `Download ${items.length} Files as ZIP`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
