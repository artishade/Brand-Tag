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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Sliders,
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

  // Dragging & Resizing state
  const [interactionMode, setInteractionMode] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);

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

  // -------------------------------------------------------------
  // Pointer / Touch Dragging & Corner Resizing Engine (Mobile-Safe)
  // -------------------------------------------------------------

  // Start Move
  const handleStartMove = (
    e: React.PointerEvent | React.TouchEvent,
    overlay: WatermarkOverlay
  ) => {
    e.stopPropagation();
    onSelectOverlay(overlay.id);
    setActiveOverlayId(overlay.id);
    setInteractionMode('move');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

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

  // Start Corner Scale
  const handleStartScale = (
    e: React.PointerEvent | React.TouchEvent,
    overlay: WatermarkOverlay,
    overlayElem: HTMLElement
  ) => {
    e.stopPropagation();
    setActiveOverlayId(overlay.id);
    setInteractionMode('scale');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = overlayElem.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
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

  // Start Rotate
  const handleStartRotate = (
    e: React.PointerEvent | React.TouchEvent,
    overlay: WatermarkOverlay,
    overlayElem: HTMLElement
  ) => {
    e.stopPropagation();
    setActiveOverlayId(overlay.id);
    setInteractionMode('rotate');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = overlayElem.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
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

  // Global move and up listeners to ensure mobile drag never misses events
  useEffect(() => {
    if (!interactionMode || !activeOverlayId || !interactionStartRef.current) return;

    const onPointerMove = (e: PointerEvent | TouchEvent) => {
      if (!interactionStartRef.current || !activeOverlayId || !mediaRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as PointerEvent).clientY;

      if (e.cancelable && 'touches' in e) {
        e.preventDefault(); // Prevent mobile screen scrolling while dragging
      }

      if (interactionMode === 'move') {
        const mediaRect = mediaRef.current.getBoundingClientRect();
        const deltaX = clientX - interactionStartRef.current.startX;
        const deltaY = clientY - interactionStartRef.current.startY;

        const deltaPercentX = (deltaX / mediaRect.width) * 100;
        const deltaPercentY = (deltaY / mediaRect.height) * 100;

        const newX = Math.max(3, Math.min(97, interactionStartRef.current.initOverlayX + deltaPercentX));
        const newY = Math.max(3, Math.min(97, interactionStartRef.current.initOverlayY + deltaPercentY));

        onUpdateOverlay(activeOverlayId, {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        });
      } else if (interactionMode === 'scale') {
        const { centerX, centerY, initDist, initScale } = interactionStartRef.current;
        const currentDist = Math.hypot(clientX - centerX, clientY - centerY);
        const scaleFactor = currentDist / Math.max(10, initDist);
        const newScale = Math.max(0.2, Math.min(3.5, Math.round(initScale * scaleFactor * 20) / 20));

        onUpdateOverlay(activeOverlayId, {
          scale: newScale,
        });
      } else if (interactionMode === 'rotate') {
        const { centerX, centerY, initAngle, initRotation } = interactionStartRef.current;
        const currentAngle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
        let deltaAngle = currentAngle - initAngle;
        let newRot = Math.round((initRotation + deltaAngle) % 360);
        if (newRot < 0) newRot += 360;

        // Snap near 0, 90, 180, 270 degrees
        const snaps = [0, 90, 180, 270, 360];
        for (const s of snaps) {
          if (Math.abs(newRot - s) <= 4) {
            newRot = s % 360;
            break;
          }
        }

        onUpdateOverlay(activeOverlayId, {
          rotation: newRot,
        });
      }
    };

    const onPointerEnd = () => {
      setInteractionMode(null);
      setActiveOverlayId(null);
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
  }, [interactionMode, activeOverlayId, onUpdateOverlay]);

  // Nudge position (Mobile D-Pad)
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
      className="relative flex-1 bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden select-none touch-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(39, 39, 42, 0.4) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Studio Top Control Strip */}
      <div className="absolute top-2 sm:top-4 inset-x-2 sm:inset-x-6 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
        {/* Sync Mode Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-lg backdrop-blur text-[11px] sm:text-xs">
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {isCustomForItem ? (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-200 font-medium">Custom Watermark</span>
              <button
                onClick={onResetToGlobal}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={onApplyCurrentToAll}
                className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium rounded transition-colors cursor-pointer ml-1"
                title="Apply this exact layout to all uploaded media files"
              >
                Sync All
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-300 font-medium">Global Template</span>
              <span className="text-zinc-500 hidden sm:inline">· Auto-applied to all</span>
            </div>
          )}
        </div>

        {/* View Original / AI Clean status */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border backdrop-blur transition-all cursor-pointer ${
              showOriginal
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Hold button to view original unedited media without watermarks"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showOriginal ? 'Original' : 'Hold Original'}</span>
            <span className="sm:hidden">{showOriginal ? 'Orig' : 'Hold'}</span>
          </button>

          <button
            onClick={onOpenAIInspector}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 backdrop-blur transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Purified</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage Container */}
      <div className="relative w-full h-full flex items-center justify-center p-2">
        <div
          ref={mediaRef}
          className="relative max-w-[96vw] md:max-w-[85vw] max-h-[58vh] sm:max-h-[66vh] shadow-2xl rounded-sm overflow-hidden border border-zinc-800/80 bg-zinc-900 flex items-center justify-center transition-all touch-none select-none"
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
              className="max-w-full max-h-[58vh] sm:max-h-[66vh] object-contain transition-transform"
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
              className="max-w-full max-h-[58vh] sm:max-h-[66vh] object-contain transition-transform select-none"
              style={{
                filter: previewFilter,
                transform: previewTransform,
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
                  id={`overlay-${overlay.id}`}
                  onPointerDown={(e) => handleStartMove(e, overlay)}
                  onTouchStart={(e) => handleStartMove(e, overlay)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow touch-none select-none ${
                    isSelected
                      ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-950/80 shadow-2xl z-30'
                      : 'hover:ring-1 hover:ring-indigo-400/60 z-10'
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
                    <div className="relative group pointer-events-none">
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

                  {/* Corner Handles for Touch Drag-to-Resize & Rotation */}
                  {isSelected && (
                    <>
                      {/* Top Move Indicator */}
                      <div
                        className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border border-indigo-300 pointer-events-none"
                        title="Drag anywhere to move"
                      >
                        <Move className="w-3.5 h-3.5" />
                      </div>

                      {/* Top-Center Rotation Handle */}
                      <div
                        onPointerDown={(e) => {
                          const elem = document.getElementById(`overlay-${overlay.id}`);
                          if (elem) handleStartRotate(e, overlay, elem);
                        }}
                        onTouchStart={(e) => {
                          const elem = document.getElementById(`overlay-${overlay.id}`);
                          if (elem) handleStartRotate(e, overlay, elem);
                        }}
                        className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-full flex items-center justify-center shadow-lg border border-zinc-600 cursor-alias touch-none pointer-events-auto active:scale-110 transition-transform"
                        title="Drag to rotate"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </div>

                      {/* Bottom-Right Corner Scale Handle (DRAG TO RESIZE ON MOBILE) */}
                      <div
                        onPointerDown={(e) => {
                          const elem = document.getElementById(`overlay-${overlay.id}`);
                          if (elem) handleStartScale(e, overlay, elem);
                        }}
                        onTouchStart={(e) => {
                          const elem = document.getElementById(`overlay-${overlay.id}`);
                          if (elem) handleStartScale(e, overlay, elem);
                        }}
                        className="absolute -bottom-3.5 -right-3.5 w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white cursor-se-resize touch-none pointer-events-auto active:scale-125 transition-transform"
                        title="Touch & drag corner to resize"
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
          className="absolute bottom-3 sm:bottom-6 inset-x-2 sm:inset-x-auto sm:max-w-2xl mx-auto bg-zinc-900/95 border border-zinc-700/80 shadow-2xl rounded-xl p-2.5 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs backdrop-blur z-30 animate-in fade-in slide-in-from-bottom-2"
        >
          {/* Top Row: Overlay Label + Mobile Nudge D-Pad + Actions */}
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

            {/* Mobile Nudge D-Pad: Essential for thumb precision positioning on phones */}
            <div className="flex items-center gap-1 bg-zinc-950/80 px-1.5 py-0.5 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline mr-0.5">Move:</span>
              <button
                onClick={() => nudgeOverlay(-2, 0)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer"
                title="Nudge Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(0, -2)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer"
                title="Nudge Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(0, 2)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer"
                title="Nudge Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudgeOverlay(2, 0)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-indigo-600 text-zinc-300 hover:text-white cursor-pointer"
                title="Nudge Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions: Duplicate & Delete */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onDuplicateOverlay(selectedOverlay.id)}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                title="Duplicate overlay"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteOverlay(selectedOverlay.id)}
                className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-200 cursor-pointer"
                title="Delete overlay"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Row / Middle: Size Controls & Corner Snap Buttons */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-1.5 sm:pt-0 sm:pl-3">
            {/* Scale Control with +/- buttons and slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Size</span>
              <button
                onClick={() => adjustScaleStep(-0.1)}
                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
                title="Decrease Size"
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
                className="w-16 sm:w-20 accent-indigo-500 cursor-pointer"
              />
              <button
                onClick={() => adjustScaleStep(0.1)}
                className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
                title="Increase Size"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-zinc-400 font-mono text-[10px] w-6">
                {Math.round(selectedOverlay.scale * 100)}%
              </span>
            </div>

            {/* Snap Presets */}
            <div className="flex items-center gap-1">
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
                onClick={() => snapTo(selectedOverlay.id, 'br')}
                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 cursor-pointer"
                title="Snap Bottom-Right"
              >
                BR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Control Bar if video */}
      {item.type === 'video' && (
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 max-w-xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-3 backdrop-blur z-20 shadow-xl">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-indigo-500 cursor-pointer"
          />

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer transition-colors shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
