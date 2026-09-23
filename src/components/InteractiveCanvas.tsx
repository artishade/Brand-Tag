import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCw,
  Trash2,
  Copy,
  Eye,
  Layers,
  Sparkles,
  Maximize2,
  Move,
  Type,
  Image as ImageIcon,
  Check,
  Undo,
} from 'lucide-react';
import { MediaItem, WatermarkOverlay } from '../types';

interface InteractiveCanvasProps {
  item: MediaItem;
  overlays: WatermarkOverlay[];
  isCustomForItem: boolean;
  onUpdateOverlay: (overlayId: string, updates: Partial<WatermarkOverlay>) => void;
  onDeleteOverlay: (overlayId: string) => void;
  onDuplicateOverlay: (overlayId: string) => void;
  onSelectOverlay: (overlayId: string | null) => void;
  selectedOverlayId: string | null;
  onResetToGlobal: () => void;
  onApplyCurrentToAll: () => void;
  onOpenAIInspector: () => void;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  item,
  overlays,
  isCustomForItem,
  onUpdateOverlay,
  onDeleteOverlay,
  onDuplicateOverlay,
  onSelectOverlay,
  selectedOverlayId,
  onResetToGlobal,
  onApplyCurrentToAll,
  onOpenAIInspector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverlayId, setDragOverlayId] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initOverlayX: number; initOverlayY: number } | null>(null);

  // Before / After comparison toggle (hold to view original)
  const [showOriginal, setShowOriginal] = useState(false);

  // Video controls
  const togglePlay = () => {
    if (!videoElementRef.current) return;
    if (isPlaying) {
      videoElementRef.current.pause();
      setIsPlaying(false);
    } else {
      videoElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoElementRef.current) return;
    videoElementRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Dragging Overlay Logic
  const handleOverlayPointerDown = (
    e: React.PointerEvent,
    overlay: WatermarkOverlay
  ) => {
    e.stopPropagation();
    onSelectOverlay(overlay.id);
    setIsDragging(true);
    setDragOverlayId(overlay.id);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOverlayX: overlay.x,
      initOverlayY: overlay.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragOverlayId || !dragStartRef.current || !mediaRef.current) return;

      const rect = mediaRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      // Convert delta pixels to percentage of media width/height
      const deltaPercentX = (deltaX / rect.width) * 100;
      const deltaPercentY = (deltaY / rect.height) * 100;

      const newX = Math.max(3, Math.min(97, dragStartRef.current.initOverlayX + deltaPercentX));
      const newY = Math.max(3, Math.min(97, dragStartRef.current.initOverlayY + deltaPercentY));

      onUpdateOverlay(dragOverlayId, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
      });
    },
    [isDragging, dragOverlayId, onUpdateOverlay]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragOverlayId(null);
      dragStartRef.current = null;
    }
  }, [isDragging]);

  // Quick snap positions
  const snapTo = (overlayId: string, position: 'tl' | 'tr' | 'center' | 'bl' | 'br' | 'bc') => {
    const coords: Record<string, { x: number; y: number }> = {
      tl: { x: 15, y: 12 },
      tr: { x: 85, y: 12 },
      center: { x: 50, y: 50 },
      bl: { x: 15, y: 88 },
      br: { x: 85, y: 88 },
      bc: { x: 50, y: 90 },
    };
    if (coords[position]) {
      onUpdateOverlay(overlayId, coords[position]);
    }
  };

  const selectedOverlay = overlays.find((ov) => ov.id === selectedOverlayId);
  const edits = item.edits;

  // Compute CSS filter style for non-destructive live preview
  const previewFilter = showOriginal
    ? 'none'
    : `brightness(${100 + edits.brightness}%) contrast(${100 + edits.contrast}%) saturate(${
        100 + edits.saturation
      }%) hue-rotate(${edits.warmth * 0.5}deg)`;

  const previewTransform = showOriginal
    ? 'none'
    : `rotate(${edits.rotation}deg) scaleX(${edits.flipH ? -1 : 1}) scaleY(${edits.flipV ? -1 : 1})`;

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectOverlay(null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative flex-1 bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-hidden select-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(39, 39, 42, 0.4) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Studio Top Control Strip */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Sync Mode Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur text-xs">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          {isCustomForItem ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-200 font-medium">Custom Watermark Placement</span>
              <button
                onClick={onResetToGlobal}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline ml-1 cursor-pointer"
              >
                Reset to Global
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-zinc-300">Global Watermark Template</span>
              <span className="text-zinc-500">· Applied to all media</span>
            </div>
          )}
          {isCustomForItem && (
            <button
              onClick={onApplyCurrentToAll}
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded transition-colors cursor-pointer ml-1"
              title="Apply this exact logo & text layout to all uploaded media files"
            >
              Apply to All
            </button>
          )}
        </div>

        {/* View Original / AI Clean status */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border backdrop-blur transition-all cursor-pointer ${
              showOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Hold button to view original unedited media without watermarks"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showOriginal ? 'Showing Original' : 'Hold for Original'}</span>
          </button>

          <button
            onClick={onOpenAIInspector}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 backdrop-blur transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Fingerprints Cleared</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage Container */}
      <div className="relative max-w-full max-h-[calc(100vh-250px)] flex items-center justify-center">
        <div
          ref={mediaRef}
          className="relative max-w-[85vw] max-h-[66vh] shadow-2xl rounded-sm overflow-hidden border border-zinc-800/80 bg-zinc-900 flex items-center justify-center transition-all"
          style={{
            aspectRatio:
              edits.aspectRatio === '1:1'
                ? '1 / 1'
                : edits.aspectRatio === '16:9'
                ? '16 / 9'
                : edits.aspectRatio === '9:16'
                ? '9 / 16'
                : edits.aspectRatio === '4:5'
                ? '4 / 5'
                : edits.aspectRatio === '4:3'
                ? '4 / 3'
                : undefined,
          }}
        >
          {/* Base Media: Video or Image */}
          {item.type === 'video' ? (
            <video
              ref={videoElementRef}
              src={showOriginal ? item.url : item.cleanedUrl || item.url}
              muted={isMuted}
              loop
              playsInline
              onTimeUpdate={() => {
                if (videoElementRef.current) {
                  setCurrentTime(videoElementRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoElementRef.current) {
                  setDuration(videoElementRef.current.duration);
                }
              }}
              className="w-full h-full object-contain pointer-events-none select-none max-h-[66vh]"
              style={{
                filter: previewFilter,
                transform: previewTransform,
                transition: 'filter 0.1s ease-out',
              }}
            />
          ) : (
            <img
              src={showOriginal ? item.url : item.cleanedUrl || item.url}
              alt={item.name}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none max-h-[66vh]"
              style={{
                filter: previewFilter,
                transform: previewTransform,
                transition: 'filter 0.1s ease-out',
              }}
            />
          )}

          {/* Vignette Overlay if active */}
          {!showOriginal && edits.vignette > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle, transparent ${
                  100 - edits.vignette
                }%, rgba(0,0,0,${(edits.vignette / 100) * 0.8}) 100%)`,
              }}
            />
          )}

          {/* Interactive Overlays Layer */}
          {!showOriginal &&
            overlays.map((overlay) => {
              const isSelected = selectedOverlayId === overlay.id;

              return (
                <div
                  key={overlay.id}
                  onPointerDown={(e) => handleOverlayPointerDown(e, overlay)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950/80'
                      : 'hover:ring-1 hover:ring-indigo-400/60'
                  }`}
                  style={{
                    left: `${overlay.x}%`,
                    top: `${overlay.y}%`,
                    opacity: overlay.opacity,
                    transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
                    transformOrigin: 'center center',
                    zIndex: isSelected ? 30 : 10,
                  }}
                >
                  {overlay.type === 'logo' ? (
                    <div className="relative group">
                      <img
                        src={overlay.content}
                        alt="Logo watermark"
                        draggable={false}
                        className="max-w-[200px] h-auto drop-shadow-md select-none pointer-events-none"
                        style={{
                          mixBlendMode: overlay.blendMode || 'normal',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="px-3 py-1 rounded select-none font-medium whitespace-nowrap"
                      style={{
                        color: overlay.color || '#ffffff',
                        fontSize: `${overlay.fontSize || 22}px`,
                        fontFamily: overlay.fontFamily || "'Plus Jakarta Sans', sans-serif",
                        fontWeight: overlay.fontWeight || 'bold',
                        backgroundColor:
                          overlay.backgroundColor && (overlay.backgroundOpacity ?? 0.8) > 0
                            ? overlay.backgroundColor
                            : 'transparent',
                        opacity: 1,
                        textShadow: overlay.shadow
                          ? '0 2px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)'
                          : 'none',
                      }}
                    >
                      {overlay.content}
                    </div>
                  )}

                  {/* Drag Handle Indicator */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-500/50">
                      <Move className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Selected Overlay Quick Adjuster */}
      {selectedOverlay && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-16 bg-zinc-900/95 border border-zinc-700/80 shadow-2xl rounded-xl px-4 py-2.5 flex items-center gap-4 text-xs backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3">
            {selectedOverlay.type === 'logo' ? (
              <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Logo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                <Type className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{selectedOverlay.content}</span>
              </div>
            )}
          </div>

          {/* Scale Control */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Size</span>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={selectedOverlay.scale}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, { scale: parseFloat(e.target.value) })
              }
              className="w-18 accent-indigo-500"
            />
            <span className="text-zinc-500 font-mono text-[10px] w-7">
              {Math.round(selectedOverlay.scale * 100)}%
            </span>
          </div>

          {/* Opacity Control */}
          <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
            <span className="text-zinc-400 text-[11px]">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={selectedOverlay.opacity}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, { opacity: parseFloat(e.target.value) })
              }
              className="w-18 accent-indigo-500"
            />
            <span className="text-zinc-500 font-mono text-[10px] w-7">
              {Math.round(selectedOverlay.opacity * 100)}%
            </span>
          </div>

          {/* Snap Presets */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
            <span className="text-zinc-500 text-[11px] mr-1">Snap:</span>
            <button
              onClick={() => snapTo(selectedOverlay.id, 'tl')}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
              title="Snap Top-Left"
            >
              TL
            </button>
            <button
              onClick={() => snapTo(selectedOverlay.id, 'tr')}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
              title="Snap Top-Right"
            >
              TR
            </button>
            <button
              onClick={() => snapTo(selectedOverlay.id, 'center')}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
              title="Snap Center"
            >
              MID
            </button>
            <button
              onClick={() => snapTo(selectedOverlay.id, 'bl')}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
              title="Snap Bottom-Left"
            >
              BL
            </button>
            <button
              onClick={() => snapTo(selectedOverlay.id, 'br')}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
              title="Snap Bottom-Right"
            >
              BR
            </button>
          </div>

          {/* Actions: Duplicate & Delete */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
            <button
              onClick={() => onDuplicateOverlay(selectedOverlay.id)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Duplicate overlay"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteOverlay(selectedOverlay.id)}
              className="p-1 rounded hover:bg-red-950/60 text-zinc-400 hover:text-red-400 cursor-pointer"
              title="Delete overlay"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Video Control Bar if video */}
      {item.type === 'video' && (
        <div className="absolute bottom-4 inset-x-8 max-w-xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 backdrop-blur z-20 shadow-xl">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-indigo-500 cursor-pointer"
          />

          <span className="text-[11px] text-zinc-400 font-mono">
            {Math.floor(currentTime)}s / {Math.floor(duration)}s
          </span>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
