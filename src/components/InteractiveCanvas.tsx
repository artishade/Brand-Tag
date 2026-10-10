import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Eye,
  Sparkles,
  Move,
  Type,
  Layers,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  Minus,
  Plus,
  Square,
  X,
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
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const overlayElementsRef = useRef<Record<string, HTMLElement | null>>({});

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Interaction state
  const [interactionMode, setInteractionMode] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const activeOverlayRef = useRef<string | null>(null);
  const lastInteractEndRef = useRef(0);
  const hasMovedRef = useRef(false);

  const interactionStartRef = useRef<{
    startX: number;
    startY: number;
    initOverlayX: number;
    initOverlayY: number;
    initScale: number;
    initRotation: number;
    centerX: number;
    centerY: number;
    initDist: number;
    initAngle: number;
  } | null>(null);

  // Before/After comparison toggle (hold to view original)
  const [showOriginal, setShowOriginal] = useState(false);

  // Reset video state when item changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
    }
  }, [item.id]);

  // Video control handlers
  const togglePlay = () => {
    if (!videoElementRef.current) return;
    if (isPlaying) {
      videoElementRef.current.pause();
      setIsPlaying(false);
    } else {
      videoElementRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };


  const formatTime = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Touch-friendly pointer event coordinate extraction
  const getPointerCoords = (e: React.PointerEvent | React.TouchEvent | PointerEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
  };

  const handleStartMove = (e: React.PointerEvent, overlay: WatermarkOverlay) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectOverlay(overlay.id);
    activeOverlayRef.current = overlay.id;
    setInteractionMode('move');
    lastInteractEndRef.current = 0;
    hasMovedRef.current = false;

    const { x: clientX, y: clientY } = getPointerCoords(e);
    interactionStartRef.current = {
      startX: clientX,
      startY: clientY,
      initOverlayX: overlay.x,
      initOverlayY: overlay.y,
      initScale: overlay.scale,
      initRotation: overlay.rotation,
      centerX: clientX,
      centerY: clientY,
      initDist: 0,
      initAngle: 0,
    };
  };

  const handleStartScale = (e: React.PointerEvent, overlay: WatermarkOverlay) => {
    e.stopPropagation();
    e.preventDefault();
    activeOverlayRef.current = overlay.id;
    setInteractionMode('scale');
    lastInteractEndRef.current = 0;

    const { x: clientX, y: clientY } = getPointerCoords(e);
    const elem = overlayElementsRef.current[overlay.id];
    const rect = elem?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : clientX;
    const centerY = rect ? rect.top + rect.height / 2 : clientY;
    const initDist = Math.hypot(clientX - centerX, clientY - centerY) || 1;

    interactionStartRef.current = {
      startX: clientX,
      startY: clientY,
      initOverlayX: overlay.x,
      initOverlayY: overlay.y,
      initScale: overlay.scale,
      initRotation: overlay.rotation,
      centerX,
      centerY,
      initDist,
      initAngle: 0,
    };
  };

  const handleStartRotate = (e: React.PointerEvent, overlay: WatermarkOverlay) => {
    e.stopPropagation();
    e.preventDefault();
    activeOverlayRef.current = overlay.id;
    setInteractionMode('rotate');
    lastInteractEndRef.current = 0;

    const { x: clientX, y: clientY } = getPointerCoords(e);
    const elem = overlayElementsRef.current[overlay.id];
    const rect = elem?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : clientX;
    const centerY = rect ? rect.top + rect.height / 2 : clientY;
    const initAngle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;

    interactionStartRef.current = {
      startX: clientX,
      startY: clientY,
      initOverlayX: overlay.x,
      initOverlayY: overlay.y,
      initScale: overlay.scale,
      initRotation: overlay.rotation,
      centerX,
      centerY,
      initDist: 0,
      initAngle,
    };
  };

  // Global pointer listeners for drag interactions
  useEffect(() => {
    if (!interactionMode || !activeOverlayRef.current || !interactionStartRef.current) return;

    const overlayId = activeOverlayRef.current;

    const onPointerMove = (e: PointerEvent | TouchEvent) => {
      if (!interactionStartRef.current || !mediaRef.current) return;
      const { x: clientX, y: clientY } = getPointerCoords(e);

      if (e.cancelable && 'touches' in e) {
        e.preventDefault();
      }

      if (interactionMode === 'move') {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const deltaX = clientX - interactionStartRef.current.startX;
        const deltaY = clientY - interactionStartRef.current.startY;

        const deltaPercentX = (deltaX / mediaRect.width) * 100;
        const deltaPercentY = (deltaY / mediaRect.height) * 100;

        // Only treat as move after a small threshold to allow tap-to-select
        const dist = Math.hypot(deltaX, deltaY);
        if (dist > 5 && !hasMovedRef.current) {
          hasMovedRef.current = true;
        }

        if (!hasMovedRef.current) return;

        // Full 0–100% range: overlays can be placed anywhere, edge to edge
        const newX = Math.max(0, Math.min(100, interactionStartRef.current.initOverlayX + deltaPercentX));
        const newY = Math.max(0, Math.min(100, interactionStartRef.current.initOverlayY + deltaPercentY));

        onUpdateOverlay(overlayId, {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        });
      } else if (interactionMode === 'scale') {
        const { centerX, centerY, initDist, initScale } = interactionStartRef.current;
        const currentDist = Math.hypot(clientX - centerX, clientY - centerY);
        const scaleFactor = currentDist / Math.max(10, initDist);
        const newScale = Math.max(0.2, Math.min(3.5, Math.round(initScale * scaleFactor * 20) / 20));

        onUpdateOverlay(overlayId, { scale: newScale });
      } else if (interactionMode === 'rotate') {
        const { centerX, centerY, initAngle, initRotation } = interactionStartRef.current;
        const currentAngle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
        const deltaAngle = currentAngle - initAngle;
        let newRot = Math.round(initRotation + deltaAngle);
        newRot = ((newRot % 360) + 360) % 360;

        // Snap to cardinal angles
        for (const s of [0, 90, 180, 270, 360]) {
          if (Math.abs(newRot - s) <= 4) {
            newRot = s % 360;
            break;
          }
        }

        onUpdateOverlay(overlayId, { rotation: newRot });
      }
    };

    const onPointerUp = () => {
      lastInteractEndRef.current = Date.now();
      setInteractionMode(null);
      activeOverlayRef.current = null;
      interactionStartRef.current = null;
      hasMovedRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
    };
  }, [interactionMode, onUpdateOverlay]);

  // Nudge position (D-Pad)
  const nudgeOverlay = (dx: number, dy: number) => {
    if (!selectedOverlayId) return;
    const target = overlays.find((ov) => ov.id === selectedOverlayId);
    if (!target) return;
    const newX = Math.max(0, Math.min(100, Math.round((target.x + dx) * 10) / 10));
    const newY = Math.max(0, Math.min(100, Math.round((target.y + dy) * 10) / 10));
    onUpdateOverlay(selectedOverlayId, { x: newX, y: newY });
  };

  // Adjust scale step
  const adjustScaleStep = (delta: number) => {
    if (!selectedOverlayId) return;
    const target = overlays.find((ov) => ov.id === selectedOverlayId);
    if (!target) return;
    const newScale = Math.max(0.2, Math.min(3.5, Math.round((target.scale + delta) * 20) / 20));
    onUpdateOverlay(selectedOverlayId, { scale: newScale });
  };

  // Quick snap positions
  const snapTo = (overlayId: string, position: 'tl' | 'tr' | 'center' | 'bl' | 'br') => {
    const coords: Record<string, { x: number; y: number }> = {
      tl: { x: 8, y: 8 },
      tr: { x: 92, y: 8 },
      center: { x: 50, y: 50 },
      bl: { x: 8, y: 92 },
      br: { x: 92, y: 92 },
    };
    if (coords[position]) {
      onUpdateOverlay(overlayId, coords[position]);
    }
  };

  const selectedOverlay = overlays.find((ov) => ov.id === selectedOverlayId);
  const edits = item.edits;

  // Compute CSS filter for live preview
  const previewFilter = showOriginal
    ? 'none'
    : `brightness(${100 + edits.brightness}%) contrast(${100 + edits.contrast}%) saturate(${
        100 + edits.saturation
      }%) hue-rotate(${edits.warmth * 0.5}deg)`;

  const previewTransform = showOriginal
    ? 'none'
    : `rotate(${edits.rotation}deg) scaleX(${edits.flipH ? -1 : 1}) scaleY(${edits.flipV ? -1 : 1})`;

  // Clicking empty canvas space deselects
  const handleStageClick = (e: React.MouseEvent) => {
    if (Date.now() - lastInteractEndRef.current < 250) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-overlay-id]')) return;
    onSelectOverlay(null);
  };

  return (
    <div
      onClick={handleStageClick}
      className="relative flex-1 bg-[#0a0a0c] flex items-center justify-center p-2 sm:p-6 overflow-hidden select-none touch-none"
    >
      {/* Minimal Top Bar */}
      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-6 flex items-center justify-between gap-2 z-20 pointer-events-none">
        {/* Sync Status Pill */}
        <div className="pointer-events-auto glass-panel rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs flex items-center gap-2 shadow-xl">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {isCustomForItem ? (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-200 font-medium">Custom</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetToGlobal();
                }}
                className="text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer"
                title="Reset to global template"
              >
                Reset
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyCurrentToAll();
                }}
                className="text-[10px] px-1.5 py-0.25 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium cursor-pointer"
                title="Apply this layout to all media"
              >
                Sync
              </button>
            </div>
          ) : (
            <span className="text-zinc-200 font-medium">Global Template</span>
          )}
        </div>

        {/* View Original + AI Clean */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onMouseDown={(e) => { e.stopPropagation(); setShowOriginal(true); }}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={(e) => { e.stopPropagation(); setShowOriginal(true); }}
            onTouchEnd={() => setShowOriginal(false)}
            onClick={(e) => e.stopPropagation()}
            className={`p-1.5 sm:p-2 rounded-lg border text-xs transition-all cursor-pointer active:scale-90 ${
              showOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Hold to compare original"
            aria-label="Compare original"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onOpenAIInspector(); }}
            className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer active:scale-90"
            title="AI metadata details"
            aria-label="AI metadata"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Interactive Stage */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          ref={mediaRef}
          className="relative max-w-[96vw] md:max-w-[80vw] max-h-[58vh] sm:max-h-[68vh] shadow-xl rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900 flex items-center justify-center transition-all touch-none select-none"
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
          onClick={(e) => e.stopPropagation()}
        >
          {/* Base Media */}
          {item.type === 'video' ? (
            <video
              ref={videoElementRef}
              src={item.cleanedUrl || item.url}
              loop
              playsInline
              muted={isMuted}
              onTimeUpdate={() => {
                if (videoElementRef.current) setCurrentTime(videoElementRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoElementRef.current) setDuration(videoElementRef.current.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="max-w-full max-h-[58vh] sm:max-h-[68vh] object-contain transition-transform"
              style={{ filter: previewFilter, transform: previewTransform }}
            />
          ) : (
            <img
              src={item.cleanedUrl || item.url}
              alt={item.name}
              draggable={false}
              className="max-w-full max-h-[58vh] sm:max-h-[68vh] object-contain transition-transform select-none"
              style={{ filter: previewFilter, transform: previewTransform }}
            />
          )}

          {/* Vignette */}
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

          {/* Interactive Overlays */}
          {!showOriginal &&
            overlays.map((overlay) => {
              const isSelected = selectedOverlayId === overlay.id;
              return (
                <div
                  key={overlay.id}
                  data-overlay-id={overlay.id}
                  ref={(el) => { overlayElementsRef.current[overlay.id] = el; }}
                  onPointerDown={(e) => handleStartMove(e, overlay)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none select-none ${
                    isSelected
                      ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/30 z-30'
                      : 'hover:ring-1 hover:ring-indigo-400/40 z-10'
                  }`}
                  style={{
                    left: `${overlay.x}%`,
                    top: `${overlay.y}%`,
                    opacity: overlay.opacity,
                    transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {overlay.type === 'logo' ? (
                    <img
                      src={overlay.content}
                      alt="Logo watermark"
                      draggable={false}
                      className="max-w-[120px] sm:max-w-[180px] h-auto drop-shadow select-none pointer-events-none"
                      style={{ mixBlendMode: overlay.blendMode || 'normal' }}
                    />
                  ) : (
                    <div
                      className="px-2 py-0.5 rounded text-xs sm:text-sm font-medium whitespace-nowrap pointer-events-none"
                      style={{
                        color: overlay.color || '#ffffff',
                        fontSize: `${overlay.fontSize || 22}px`,
                        fontFamily: overlay.fontFamily || "'Plus Jakarta Sans', sans-serif",
                        fontWeight: overlay.fontWeight || 'bold',
                        backgroundColor:
                          overlay.backgroundColor && (overlay.backgroundOpacity ?? 0.8) > 0
                            ? overlay.backgroundColor
                            : 'transparent',
                        textShadow: overlay.shadow
                          ? '0 1px 6px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)'
                          : 'none',
                      }}
                    >
                      {overlay.content}
                    </div>
                  )}

                  {/* Minimal selection handles */}
                  {isSelected && (
                    <>
                      {/* Move indicator */}
                      <div className="absolute -top-3 -left-3 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md ring-1 ring-white/30 pointer-events-none">
                        <Move className="w-2.5 h-2.5" />
                      </div>

                      {/* Rotate handle */}
                      <div
                        onPointerDown={(e) => handleStartRotate(e, overlay)}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-full flex items-center justify-center shadow-md ring-1 ring-white/20 cursor-alias touch-none pointer-events-auto active:scale-110 transition-transform"
                        title="Rotate"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                      </div>

                      {/* Scale handle */}
                      <div
                        onPointerDown={(e) => handleStartScale(e, overlay)}
                        className="absolute -bottom-3 -right-3 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md ring-1 ring-white/30 cursor-se-resize touch-none pointer-events-auto active:scale-110 transition-transform"
                        title="Resize"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Minimal Floating Controls - only when selected */}
      {selectedOverlay && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-2 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs shadow-2xl z-30"
        >
          {/* Type indicator */}
          <div className="flex items-center gap-1 font-medium shrink-0">
            {selectedOverlay.type === 'logo' ? (
              <span className="text-indigo-400 flex items-center gap-1">
                <img
                  src={selectedOverlay.content}
                  alt=""
                  className="w-4 h-4 object-contain"
                /> Logo
              </span>
            ) : (
              <span className="text-sky-400 flex items-center gap-1">
                <Type className="w-3.5 h-3.5" /> Text
              </span>
            )}
          </div>

          {/* D-Pad for position */}
          <div className="flex items-center gap-0.25 bg-zinc-950/60 px-1 py-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => nudgeOverlay(-2, 0)}
              className="p-0.75 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Left" aria-label="Move left"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => nudgeOverlay(0, -2)}
              className="p-0.75 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Up" aria-label="Move up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => nudgeOverlay(0, 2)}
              className="p-0.75 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Down" aria-label="Move down"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => nudgeOverlay(2, 0)}
              className="p-0.75 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Right" aria-label="Move right"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => adjustScaleStep(-0.1)}
              className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
              title="Decrease size" aria-label="Decrease size"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="font-mono text-zinc-400 w-8 text-center">
              {Math.round(selectedOverlay.scale * 100)}%
            </span>
            <button
              onClick={() => adjustScaleStep(0.1)}
              className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
              title="Increase size" aria-label="Increase size"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Snap shortcuts */}
          <div className="flex items-center gap-0.25">
            <button onClick={() => snapTo(selectedOverlay.id, 'tl')} className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Top-left" aria-label="Snap top-left">
              <Square className="w-3 h-3" />
            </button>
            <button onClick={() => snapTo(selectedOverlay.id, 'tr')} className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Top-right" aria-label="Snap top-right">
              <Square className="w-3 h-3" />
            </button>
            <button onClick={() => snapTo(selectedOverlay.id, 'bl')} className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Bottom-left" aria-label="Snap bottom-left">
              <Square className="w-3 h-3" />
            </button>
            <button onClick={() => snapTo(selectedOverlay.id, 'br')} className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Bottom-right" aria-label="Snap bottom-right">
              <Square className="w-3 h-3" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.25">
            <button
              onClick={() => onDuplicateOverlay(selectedOverlay.id)}
              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Duplicate" aria-label="Duplicate overlay"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteOverlay(selectedOverlay.id)}
              className="p-0.5 rounded hover:bg-red-950/60 text-red-300 hover:text-red-100 cursor-pointer"
              title="Delete" aria-label="Delete overlay"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onSelectOverlay(null)}
              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title="Close" aria-label="Close controls"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Video Control Bar - minimal */}
      {item.type === 'video' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-0 max-w-md mx-auto glass-panel rounded-xl px-2.5 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-3 z-20 shadow-xl"
        >
          <button
            onClick={togglePlay}
            className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-90"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
          </button>

          <span className="text-[10px] text-zinc-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 1}
            value={currentTime || 0}
            onChange={(e) => {
              if (videoElementRef.current) {
                videoElementRef.current.currentTime = parseFloat(e.target.value);
                setCurrentTime(parseFloat(e.target.value));
              }
            }}
            className="flex-1 h-1"
          />
        </div>
      )}
    </div>
  );
};