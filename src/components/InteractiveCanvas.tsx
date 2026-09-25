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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  CornerUpLeft,
  CornerUpRight,
  CornerDownRight,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const overlayElementsRef = useRef<Record<string, HTMLElement | null>>({});

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Interaction state — using a ref-based pointer model for fluid, multi-mode drag
  const [interactionMode, setInteractionMode] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const activeOverlayRef = useRef<string | null>(null);

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

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // Pointer Drag Engine — Mobile-Safe & Unified
  // -------------------------------------------------------------

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

  // Global pointer listeners
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

        const newX = Math.max(3, Math.min(97, interactionStartRef.current.initOverlayX + deltaPercentX));
        const newY = Math.max(3, Math.min(97, interactionStartRef.current.initOverlayY + deltaPercentY));

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

        // Snap near 0, 90, 180, 270
        for (const s of [0, 90, 180, 270, 360]) {
          if (Math.abs(newRot - s) <= 4) {
            newRot = s % 360;
            break;
          }
        }

        onUpdateOverlay(overlayId, { rotation: newRot });
      }
    };

    const onPointerEnd = () => {
      setInteractionMode(null);
      activeOverlayRef.current = null;
      interactionStartRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerEnd);
    window.addEventListener('touchcancel', onPointerEnd);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerEnd);
      window.removeEventListener('touchcancel', onPointerEnd);
    };
  }, [interactionMode, onUpdateOverlay]);

  // Nudge position (D-Pad)
  const nudgeOverlay = (dx: number, dy: number) => {
    if (!selectedOverlayId) return;
    const target = overlays.find((ov) => ov.id === selectedOverlayId);
    if (!target) return;
    const newX = Math.max(3, Math.min(97, Math.round((target.x + dx) * 10) / 10));
    const newY = Math.max(3, Math.min(97, Math.round((target.y + dy) * 10) / 10));
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

  // Compute CSS filter for live preview
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
      className="relative flex-1 bg-[#0a0a0c] flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden select-none touch-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.06) 0%, transparent 70%),
          radial-gradient(circle at 50% 50%, rgba(63, 63, 70, 0.5) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px',
      }}
    >
      {/* Top Studio Control Strip */}
      <div className="absolute top-2 sm:top-4 inset-x-2 sm:inset-x-6 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
        {/* Sync Mode Status Pill */}
        <div className="pointer-events-auto glass-panel rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs flex items-center gap-2 shadow-xl">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {isCustomForItem ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-200 font-medium">Custom Layout</span>
              <span className="text-[10px] text-amber-400/80 hidden sm:inline">·</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetToGlobal();
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyCurrentToAll();
                }}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium rounded-md transition-colors cursor-pointer"
                title="Apply this exact layout to all uploaded media files"
              >
                Sync All
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-200 font-medium">Global Template</span>
              <span className="text-zinc-600 hidden sm:inline">·</span>
              <span className="text-zinc-500 hidden sm:inline text-[11px]">auto-applied to all</span>
            </div>
          )}
        </div>

        {/* View Original / AI Clean status */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onMouseDown={(e) => { e.stopPropagation(); setShowOriginal(true); }}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={(e) => { e.stopPropagation(); setShowOriginal(true); }}
            onTouchEnd={() => setShowOriginal(false)}
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-medium rounded-xl border backdrop-blur transition-all cursor-pointer active:scale-95 ${
              showOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
            title="Hold to compare with the original unedited media"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showOriginal ? 'Viewing Original' : 'Hold Original'}</span>
            <span className="sm:hidden">{showOriginal ? 'Orig' : 'Hold'}</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onOpenAIInspector(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-medium rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 backdrop-blur transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Purified</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative w-full h-full flex items-center justify-center p-2">
        <div
          ref={mediaRef}
          className="relative max-w-[96vw] md:max-w-[80vw] max-h-[58vh] sm:max-h-[68vh] shadow-2xl rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900 flex items-center justify-center transition-all touch-none select-none"
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
          {/* Base Media: Video or Image */}
          {item.type === 'video' ? (
            <video
              ref={videoElementRef}
              src={item.cleanedUrl || item.url}
              loop
              playsInline
              muted={isMuted}
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
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="max-w-full max-h-[58vh] sm:max-h-[68vh] object-contain transition-transform"
              style={{
                filter: previewFilter,
                transform: previewTransform,
              }}
            />
          ) : (
            <img
              src={item.cleanedUrl || item.url}
              alt={item.name}
              draggable={false}
              className="max-w-full max-h-[58vh] sm:max-h-[68vh] object-contain transition-transform select-none"
              style={{
                filter: previewFilter,
                transform: previewTransform,
              }}
            />
          )}

          {/* Vignette overlay */}
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
                  ref={(el) => {
                    overlayElementsRef.current[overlay.id] = el;
                  }}
                  onPointerDown={(e) => handleStartMove(e, overlay)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none select-none ${
                    isSelected
                      ? 'active-overlay-glow z-30'
                      : 'hover:ring-2 hover:ring-indigo-400/40 hover:ring-offset-1 hover:ring-offset-transparent z-10'
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
                    <div className="relative pointer-events-none">
                      <img
                        src={overlay.content}
                        alt="Logo watermark"
                        draggable={false}
                        className="max-w-[140px] sm:max-w-[200px] h-auto drop-shadow-md select-none pointer-events-none"
                        style={{
                          mixBlendMode: overlay.blendMode || 'normal',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="px-2.5 py-1 rounded select-none font-medium whitespace-nowrap pointer-events-none"
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

                  {/* Selection handles */}
                  {isSelected && (
                    <>
                      {/* Move indicator */}
                      <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg ring-2 ring-white/30 pointer-events-none">
                        <Move className="w-3.5 h-3.5" />
                      </div>

                      {/* Rotation handle (top-center) */}
                      <div
                        onPointerDown={(e) => handleStartRotate(e, overlay)}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/20 cursor-alias touch-none pointer-events-auto active:scale-110 transition-transform"
                        title="Drag to rotate"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </div>

                      {/* Scale handle (bottom-right corner) */}
                      <div
                        onPointerDown={(e) => handleStartScale(e, overlay)}
                        className="absolute -bottom-3.5 -right-3.5 w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-xl ring-2 ring-white/30 cursor-se-resize touch-none pointer-events-auto active:scale-110 transition-transform"
                        title="Drag to resize"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Selected Overlay Quick Adjuster & Mobile D-Pad Control Dock */}
      {selectedOverlay && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 sm:bottom-6 inset-x-2 sm:inset-x-auto sm:max-w-2xl mx-auto glass-panel rounded-2xl p-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-2xl z-30 animate-fade-in-up"
        >
          {/* Top Row: Overlay Label + D-Pad + Actions */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div className="flex items-center gap-1.5 font-medium shrink-0">
              {selectedOverlay.type === 'logo' ? (
                <span className="text-indigo-400 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Logo
                </span>
              ) : (
                <span className="text-sky-400 flex items-center gap-1 truncate max-w-[90px] sm:max-w-[120px]">
                  <Type className="w-3.5 h-3.5 shrink-0" /> {selectedOverlay.content}
                </span>
              )}
            </div>

            {/* Mobile D-Pad */}
            <div className="flex items-center gap-0.5 bg-zinc-950/60 px-1.5 py-1 rounded-lg border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline mr-1">Move</span>
              <button
                onClick={() => nudgeOverlay(-2, 0)}
                className="p-1.5 rounded-md hover:bg-zinc-800 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Nudge Left (←)"
                aria-label="Move left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(0, -2)}
                className="p-1.5 rounded-md hover:bg-zinc-800 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Nudge Up (↑)"
                aria-label="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(0, 2)}
                className="p-1.5 rounded-md hover:bg-zinc-800 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Nudge Down (↓)"
                aria-label="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(2, 0)}
                className="p-1.5 rounded-md hover:bg-zinc-800 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Nudge Right (→)"
                aria-label="Move right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions: Duplicate & Delete */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onDuplicateOverlay(selectedOverlay.id)}
                className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                title="Duplicate overlay (D)"
                aria-label="Duplicate overlay"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteOverlay(selectedOverlay.id)}
                className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 cursor-pointer transition-colors"
                title="Delete overlay (Del)"
                aria-label="Delete overlay"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Row / Middle: Size Controls & Snap Buttons */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-3">
            {/* Scale Control */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Size</span>
              <button
                onClick={() => adjustScaleStep(-0.1)}
                className="w-5 h-5 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors"
                title="Decrease Size"
                aria-label="Decrease size"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.05"
                value={selectedOverlay.scale}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, { scale: parseFloat(e.target.value) })
                }
                className="w-16 sm:w-20"
              />
              <button
                onClick={() => adjustScaleStep(0.1)}
                className="w-5 h-5 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer transition-colors"
                title="Increase Size"
                aria-label="Increase size"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-zinc-400 font-mono text-[10px] w-8">
                {Math.round(selectedOverlay.scale * 100)}%
              </span>
            </div>

            {/* Snap Presets */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => snapTo(selectedOverlay.id, 'tl')}
                className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                title="Snap Top-Left"
                aria-label="Snap top-left"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => snapTo(selectedOverlay.id, 'tr')}
                className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                title="Snap Top-Right"
                aria-label="Snap top-right"
              >
                <CornerUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => snapTo(selectedOverlay.id, 'center')}
                className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                title="Snap Center"
                aria-label="Snap center"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => snapTo(selectedOverlay.id, 'br')}
                className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                title="Snap Bottom-Right"
                aria-label="Snap bottom-right"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Control Bar */}
      {item.type === 'video' && (
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 max-w-xl mx-auto glass-panel rounded-xl px-3 py-2 sm:px-4 flex items-center gap-2 sm:gap-3 z-20 shadow-2xl">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shrink-0 active:scale-90"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <span className="font-mono text-[10px] text-zinc-400 tabular-nums shrink-0">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1"
            aria-label="Seek video"
          />

          <span className="font-mono text-[10px] text-zinc-400 tabular-nums shrink-0">
            {formatTime(duration)}
          </span>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer transition-colors shrink-0 active:scale-90"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
