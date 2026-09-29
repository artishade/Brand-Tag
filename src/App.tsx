/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Eye,
  Layers,
  Sliders,
  Tag as TagIcon,
  Upload,
  ImagePlus,
  CloudUpload,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Header } from './components/Header';
import { MediaTray } from './components/MediaTray';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { MediaEditorSidebar } from './components/MediaEditorSidebar';
import { AIFingerprintInspector } from './components/AIFingerprintInspector';
import { BatchExportModal } from './components/BatchExportModal';
import {
  MediaItem,
  WatermarkOverlay,
  GlobalBrandConfig,
  MediaEdits,
} from './types';
import {
  INITIAL_BRAND_CONFIG,
  SAMPLE_MEDIA_LIST,
  generateSampleLogoSVG,
} from './utils/sampleData';
import { cleanMediaFile } from './utils/aiCleaner';
import { unpackZipArchive } from './utils/zipHandler';
import { renderCompositedCanvas } from './utils/canvasRenderer';

export default function App() {
  // Media items list — starts empty; user brings their own files (or loads samples)
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Mobile navigation tab: 'canvas' | 'brand' | 'edits' | 'tags'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'brand' | 'edits' | 'tags'>('canvas');

  // Global Brand and Watermark Configuration
  const [globalConfig, setGlobalConfig] = useState<GlobalBrandConfig>(INITIAL_BRAND_CONFIG);

  // Selected Overlay ID in the canvas
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Filter by tag in media tray
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAIInspectorOpen, setIsAIInspectorOpen] = useState(false);

  // Upload processing state (shown as a slim toast, not a blocking modal)
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);

  // Full-screen drag & drop state
  const [isDragActive, setIsDragActive] = useState(false);

  // One-click file picker (no modal needed)
  const filePickerRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isProcessingRef.current = isProcessingUpload;
  }, [isProcessingUpload]);

  // Active item
  const activeItem = useMemo(() => {
    return items.find((i) => i.id === activeId) || items[0] || null;
  }, [items, activeId]);

  // Ensure activeId is set if items change
  useEffect(() => {
    if ((!activeId || !items.find((i) => i.id === activeId)) && items.length > 0) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  // Determine active overlays for current item:
  // If item has custom overlays detached from global, use those; otherwise use globalConfig.overlays
  const activeOverlays = useMemo(() => {
    if (!activeItem) return globalConfig.overlays;
    if (activeItem.hasCustomOverlays && activeItem.customOverlays) {
      return activeItem.customOverlays;
    }
    return globalConfig.overlays;
  }, [activeItem, globalConfig.overlays]);

  // All unique tags collected across all media items
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [items]);

  // Update an overlay (position, scale, opacity, content, etc.)
  const handleUpdateOverlay = (overlayId: string, updates: Partial<WatermarkOverlay>) => {
    if (!activeItem) return;

    if (activeItem.hasCustomOverlays && activeItem.customOverlays) {
      // Update item's specific overlays
      const updated = activeItem.customOverlays.map((ov) =>
        ov.id === overlayId ? { ...ov, ...updates } : ov
      );
      setItems((prev) =>
        prev.map((i) => (i.id === activeItem.id ? { ...i, customOverlays: updated } : i))
      );
    } else {
      // Update global config overlays (applies to all items automatically!)
      const updated = globalConfig.overlays.map((ov) =>
        ov.id === overlayId ? { ...ov, ...updates } : ov
      );
      setGlobalConfig((prev) => ({ ...prev, overlays: updated }));
    }
  };

  // Delete an overlay
  const handleDeleteOverlay = (overlayId: string) => {
    if (!activeItem) return;

    if (activeItem.hasCustomOverlays && activeItem.customOverlays) {
      const updated = activeItem.customOverlays.filter((ov) => ov.id !== overlayId);
      setItems((prev) =>
        prev.map((i) => (i.id === activeItem.id ? { ...i, customOverlays: updated } : i))
      );
    } else {
      const updated = globalConfig.overlays.filter((ov) => ov.id !== overlayId);
      setGlobalConfig((prev) => ({ ...prev, overlays: updated }));
    }

    if (selectedOverlayId === overlayId) {
      setSelectedOverlayId(null);
    }
  };

  // Duplicate an overlay
  const handleDuplicateOverlay = (overlayId: string) => {
    const target = activeOverlays.find((ov) => ov.id === overlayId);
    if (!target) return;

    const duplicated: WatermarkOverlay = {
      ...target,
      id: `ov-dup-${Date.now()}`,
      x: Math.min(95, target.x + 5),
      y: Math.min(95, target.y + 5),
    };

    if (activeItem?.hasCustomOverlays && activeItem.customOverlays) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === activeItem.id
            ? { ...i, customOverlays: [...(i.customOverlays || []), duplicated] }
            : i
        )
      );
    } else {
      setGlobalConfig((prev) => ({
        ...prev,
        overlays: [...prev.overlays, duplicated],
      }));
    }
    setSelectedOverlayId(duplicated.id);
  };

  // One-click add: opens the OS file picker directly, no modal step
  const openFilePicker = useCallback(() => {
    filePickerRef.current?.click();
  }, []);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    e.target.value = '';
  };

  // Global keyboard shortcuts for power users:
  //   - Esc         : deselect current overlay (or close modals)
  //   - Arrow keys  : nudge selected overlay by 1%
  //   - Shift+Arrow : nudge by 5%
  //   - [ / ]       : cycle prev/next media item
  //   - Delete/Bksp : delete selected overlay
  //   - D           : duplicate selected overlay
  //   - Cmd/Ctrl+E  : open export modal
  //   - Cmd/Ctrl+U  : open file picker
  //   - Cmd/Ctrl+I  : open AI inspector
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't interfere with form inputs
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

      // Modifier-based shortcuts
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          setIsExportModalOpen(true);
          return;
        }
        if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          openFilePicker();
          return;
        }
        if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          setIsAIInspectorOpen(true);
          return;
        }
        return;
      }

      // Plain key shortcuts
      if (e.key === 'Escape') {
        if (selectedOverlayId) {
          setSelectedOverlayId(null);
        } else {
          setIsExportModalOpen(false);
          setIsAIInspectorOpen(false);
        }
        return;
      }

      // Cycle media items
      if (e.key === '[' || e.key === ']') {
        if (items.length === 0) return;
        const currentIndex = items.findIndex((i) => i.id === activeId);
        if (currentIndex === -1) return;
        const nextIndex =
          e.key === '['
            ? (currentIndex - 1 + items.length) % items.length
            : (currentIndex + 1) % items.length;
        setActiveId(items[nextIndex].id);
        setSelectedOverlayId(null);
        e.preventDefault();
        return;
      }

      // Overlay-specific shortcuts
      if (!selectedOverlayId) return;
      const targetOverlay = activeOverlays.find((ov) => ov.id === selectedOverlayId);
      if (!targetOverlay) return;

      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { x: Math.max(0, targetOverlay.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { x: Math.min(100, targetOverlay.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { y: Math.max(0, targetOverlay.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { y: Math.min(100, targetOverlay.y + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteOverlay(selectedOverlayId);
      } else if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleDuplicateOverlay(selectedOverlayId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedOverlayId, activeOverlays, items, activeId, openFilePicker]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Add a new text watermark overlay
  const handleAddTextOverlay = () => {
    const newText: WatermarkOverlay = {
      id: `ov-text-${Date.now()}`,
      type: 'text',
      content: '@brandstudio.official',
      x: 50,
      y: 50,
      scale: 1.0,
      opacity: 0.9,
      rotation: 0,
      color: '#ffffff',
      fontSize: 24,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 'bold',
      shadow: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      backgroundColor: '#09090b',
      backgroundOpacity: 0.6,
    };

    if (activeItem?.hasCustomOverlays && activeItem.customOverlays) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === activeItem.id
            ? { ...i, customOverlays: [...(i.customOverlays || []), newText] }
            : i
        )
      );
    } else {
      setGlobalConfig((prev) => ({
        ...prev,
        overlays: [...prev.overlays, newText],
      }));
    }
    setSelectedOverlayId(newText.id);
  };

  // Apply a layout preset template
  const handleApplyPresetLayout = (
    preset: 'modern-corner' | 'minimal-bottom' | 'center-protect' | 'social-bundle'
  ) => {
    const logoUrl = globalConfig.defaultLogo?.url || generateSampleLogoSVG('BrandStudio', 'badge');

    let newOverlays: WatermarkOverlay[] = [];

    if (preset === 'modern-corner') {
      newOverlays = [
        {
          id: `ov-logo-${Date.now()}`,
          type: 'logo',
          content: logoUrl,
          x: 18,
          y: 15,
          scale: 1.0,
          opacity: 0.95,
          rotation: 0,
          blendMode: 'normal',
        },
        {
          id: `ov-text-1-${Date.now()}`,
          type: 'text',
          content: '© 2026 OFFICIAL ARCHIVE',
          x: 50,
          y: 92,
          scale: 1.0,
          opacity: 0.85,
          rotation: 0,
          color: '#ffffff',
          fontSize: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 'medium',
          shadow: true,
          backgroundColor: '#09090b',
          backgroundOpacity: 0.7,
        },
        {
          id: `ov-text-2-${Date.now()}`,
          type: 'text',
          content: '@creator.studio',
          x: 85,
          y: 15,
          scale: 1.0,
          opacity: 0.9,
          rotation: 0,
          color: '#38bdf8',
          fontSize: 22,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 'bold',
          shadow: true,
        },
      ];
    } else if (preset === 'minimal-bottom') {
      newOverlays = [
        {
          id: `ov-logo-${Date.now()}`,
          type: 'logo',
          content: logoUrl,
          x: 85,
          y: 88,
          scale: 0.8,
          opacity: 0.85,
          rotation: 0,
          blendMode: 'normal',
        },
        {
          id: `ov-text-1-${Date.now()}`,
          type: 'text',
          content: 'www.studiobrand.io',
          x: 20,
          y: 92,
          scale: 0.9,
          opacity: 0.8,
          rotation: 0,
          color: '#d4d4d8',
          fontSize: 18,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 'normal',
          shadow: true,
        },
      ];
    } else if (preset === 'center-protect') {
      newOverlays = [
        {
          id: `ov-logo-${Date.now()}`,
          type: 'logo',
          content: logoUrl,
          x: 50,
          y: 50,
          scale: 1.8,
          opacity: 0.25,
          rotation: -15,
          blendMode: 'screen',
        },
        {
          id: `ov-text-1-${Date.now()}`,
          type: 'text',
          content: 'PROTECTED CONTENT · DO NOT DISTRIBUTE',
          x: 50,
          y: 85,
          scale: 1.1,
          opacity: 0.9,
          rotation: 0,
          color: '#ef4444',
          fontSize: 22,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 'bold',
          shadow: true,
          backgroundColor: '#000000',
          backgroundOpacity: 0.8,
        },
      ];
    } else {
      // Social bundle
      newOverlays = [
        {
          id: `ov-logo-${Date.now()}`,
          type: 'logo',
          content: logoUrl,
          x: 84,
          y: 16,
          scale: 0.9,
          opacity: 0.9,
          rotation: 0,
          blendMode: 'normal',
        },
        {
          id: `ov-text-1-${Date.now()}`,
          type: 'text',
          content: 'Follow @studio.creatives',
          x: 22,
          y: 88,
          scale: 1.0,
          opacity: 0.95,
          rotation: 0,
          color: '#ffffff',
          fontSize: 22,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 'bold',
          shadow: true,
          backgroundColor: '#4f46e5',
          backgroundOpacity: 0.9,
        },
      ];
    }

    setGlobalConfig((prev) => ({ ...prev, overlays: newOverlays }));
  };

  // Reset current item's custom overlays back to global
  const handleResetToGlobal = () => {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === activeItem.id
          ? { ...i, hasCustomOverlays: false, customOverlays: undefined }
          : i
      )
    );
  };

  // Apply current item's layout to all items (promotes current layout to global)
  const handleApplyCurrentToAll = () => {
    if (!activeItem || !activeItem.customOverlays) return;
    setGlobalConfig((prev) => ({
      ...prev,
      overlays: activeItem.customOverlays || prev.overlays,
    }));
    // Remove custom overrides across all items so everyone tracks the new global
    setItems((prev) =>
      prev.map((i) => ({ ...i, hasCustomOverlays: false, customOverlays: undefined }))
    );
  };

  // Update tone/crop edits for active item
  const handleUpdateItemEdits = (edits: Partial<MediaEdits>) => {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === activeItem.id ? { ...i, edits: { ...i.edits, ...edits } } : i
      )
    );
  };

  // Batch copy current item's edits to all media items
  const handleBatchApplyEditsToAll = () => {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        edits: { ...activeItem.edits },
      }))
    );
  };

  // Update tags on active item
  const handleUpdateItemTags = (tags: string[]) => {
    if (!activeItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === activeItem.id ? { ...i, tags } : i))
    );
  };

  // Batch apply a tag to all media items
  const handleBatchApplyTagsToAll = (tag: string) => {
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        tags: i.tags.includes(tag) ? i.tags : [...i.tags, tag],
      }))
    );
  };

  // Delete media item from list
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Export single active media item as high-res clean image
  const handleExportSingleMedia = async () => {
    if (!activeItem) return;
    try {
      if (activeItem.type === 'video') {
        // Download clean video directly
        const a = document.createElement('a');
        a.href = activeItem.cleanedUrl || activeItem.url;
        a.download = `${activeItem.name.replace(/\.[^/.]+$/, '')}_purified.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const canvas = await renderCompositedCanvas(activeItem, activeOverlays);
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${activeItem.name.replace(/\.[^/.]+$/, '')}_branded_purified.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export single item:', err);
      alert('Export failed. Check media permissions.');
    }
  };

  // Upload handler: Processes single/multiple files or .zip files.
  // No modal — progress is shown as a slim toast while the user keeps working.
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    if (isProcessingRef.current) return;

    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    setIsProcessingUpload(true);
    isProcessingRef.current = true;
    setUploadProgressPercent(0);
    setUploadProgressText('Inspecting uploaded files...');

    const filesToClean: File[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      if (file.name.endsWith('.zip')) {
        setUploadProgressText(`Unpacking ZIP: ${file.name}...`);
        try {
          const unpacked = await unpackZipArchive(file, (percent, curr) => {
            setUploadProgressPercent(Math.round(percent * 0.4));
            setUploadProgressText(`Extracting ${curr}...`);
          });
          filesToClean.push(...unpacked);
        } catch (err) {
          console.error('Failed to unpack zip:', err);
        }
      } else {
        filesToClean.push(file);
      }
    }

    if (filesToClean.length === 0) {
      setIsProcessingUpload(false);
      isProcessingRef.current = false;
      return;
    }

    const newMediaItems: MediaItem[] = [];
    let completedCount = 0;

    for (const file of filesToClean) {
      setUploadProgressText(`Purging AI metadata: ${file.name}...`);
      try {
        const cleanResult = await cleanMediaFile(file);
        const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i);

        const newItem: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          size: file.size,
          url: URL.createObjectURL(file),
          cleanedUrl: cleanResult.cleanedUrl,
          width: cleanResult.width,
          height: cleanResult.height,
          tags: ['Purified', isVideo ? 'Video' : 'Photo'],
          originalFile: file,
          aiStats: cleanResult.aiStats,
          edits: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            warmth: 0,
            vignette: 0,
            rotation: 0,
            flipH: false,
            flipV: false,
            aspectRatio: 'original',
          },
          hasCustomOverlays: false,
        };

        newMediaItems.push(newItem);
      } catch (err) {
        console.error(`Error cleaning file ${file.name}:`, err);
      }

      completedCount++;
      setUploadProgressPercent(40 + Math.round((completedCount / filesToClean.length) * 60));
    }

    if (newMediaItems.length > 0) {
      setItems((prev) => [...prev, ...newMediaItems]);
      setActiveId(newMediaItems[0].id);
      setSelectedTagFilter(null); // Ensure all newly uploaded files are immediately visible
      setMobileTab('canvas'); // Take user directly to interactive canvas preview
    }

    setUploadProgressText('Done! Files added to Studio.');
    setUploadProgressPercent(100);
    setTimeout(() => {
      setIsProcessingUpload(false);
      isProcessingRef.current = false;
    }, 700);
  };

  // Keep a stable ref to the latest handler for the window drag listeners
  const handleFilesRef = useRef(handleFilesSelected);
  useEffect(() => {
    handleFilesRef.current = handleFilesSelected;
  });

  // -------------------------------------------------------------
  // Full-screen Drag & Drop — drop files ANYWHERE on the screen
  // -------------------------------------------------------------
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes('Files');

    let depth = 0;

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e) || isProcessingRef.current) return;
      e.preventDefault();
      depth++;
      setIsDragActive(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // Required to allow dropping anywhere
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragActive(false);
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setIsDragActive(false);
      if (isProcessingRef.current) return;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFilesRef.current(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Load demo samples
  const handleLoadSamples = () => {
    const demoItems = SAMPLE_MEDIA_LIST.map((sample) => ({
      ...sample,
      id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tags: [...sample.tags],
      edits: { ...sample.edits },
    }));
    setItems((prev) => [...prev, ...demoItems]);
    setActiveId(demoItems[0].id);
    setSelectedTagFilter(null);
    setMobileTab('canvas');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-[#0a0a0c] text-zinc-100 overflow-hidden font-sans ui-chrome">
      {/* Hidden one-click file picker (opened from Header, Empty State, ⌘U) */}
      <input
        ref={filePickerRef}
        type="file"
        multiple
        accept="image/*,video/*,.zip"
        onChange={handlePickerChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Top Header */}
      <Header
        mediaCount={items.length}
        activeItem={activeItem || undefined}
        onAddMedia={openFilePicker}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Central Workspace: Interactive Canvas (full-width on mobile when on canvas tab) */}
        {activeItem ? (
          <div
            className={`flex-1 flex overflow-hidden min-w-0 ${
              mobileTab !== 'canvas' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <InteractiveCanvas
              item={activeItem}
              overlays={activeOverlays}
              isCustomForItem={activeItem.hasCustomOverlays}
              onUpdateOverlay={handleUpdateOverlay}
              onDeleteOverlay={handleDeleteOverlay}
              onDuplicateOverlay={handleDuplicateOverlay}
              onSelectOverlay={setSelectedOverlayId}
              selectedOverlayId={selectedOverlayId}
              onResetToGlobal={handleResetToGlobal}
              onApplyCurrentToAll={handleApplyCurrentToAll}
              onOpenAIInspector={() => setIsAIInspectorOpen(true)}
            />
          </div>
        ) : (
          <EmptyStateHero
            onUpload={openFilePicker}
            onLoadSamples={handleLoadSamples}
            isDragActive={isDragActive}
          />
        )}

        {/* Right Editor Sidebar */}
        {activeItem && (
          <div
            className={`h-full min-h-0 ${
              mobileTab === 'canvas' ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
            }`}
          >
            <MediaEditorSidebar
              item={activeItem}
              globalConfig={globalConfig}
              onUpdateGlobalConfig={(updates) => setGlobalConfig((prev) => ({ ...prev, ...updates }))}
              onUpdateItemEdits={handleUpdateItemEdits}
              onUpdateItemTags={handleUpdateItemTags}
              onBatchApplyTagsToAll={handleBatchApplyTagsToAll}
              onBatchApplyEditsToAll={handleBatchApplyEditsToAll}
              onExportSingleMedia={handleExportSingleMedia}
              onAddTextOverlay={handleAddTextOverlay}
              onUpdateOverlay={handleUpdateOverlay}
              onDeleteOverlay={handleDeleteOverlay}
              onApplyPresetLayout={handleApplyPresetLayout}
              activeOverlays={activeOverlays}
              selectedOverlayId={selectedOverlayId}
              onSelectOverlay={setSelectedOverlayId}
              activeTab={mobileTab === 'canvas' ? undefined : mobileTab}
              onTabChange={(tab) => setMobileTab(tab)}
              onCloseMobile={() => setMobileTab('canvas')}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) for quick thumb-switching */}
      {activeItem && (
        <nav
          aria-label="Studio sections"
          className="md:hidden flex items-center justify-around border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md py-1.5 px-2 shrink-0 z-20 safe-bottom"
        >
          {[
            { id: 'canvas' as const, icon: Eye, label: 'Canvas' },
            { id: 'brand' as const, icon: Layers, label: 'Brand' },
            { id: 'edits' as const, icon: Sliders, label: 'Edits' },
            { id: 'tags' as const, icon: TagIcon, label: 'Tags' },
          ].map(({ id, icon: Icon, label }) => {
            const active = mobileTab === id;
            return (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-lg text-[10px] font-semibold transition-all ${
                  active
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-zinc-500 hover:text-zinc-300 active:scale-95'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'scale-105' : ''}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Bottom Media Tray Carousel */}
      <MediaTray
        items={items}
        activeId={activeId}
        onSelectItem={(id) => {
          setActiveId(id);
          setSelectedOverlayId(null);
          setMobileTab('canvas');
        }}
        onDeleteItem={handleDeleteItem}
        onUploadFiles={handleFilesSelected}
        selectedTagFilter={selectedTagFilter}
        onSelectTagFilter={setSelectedTagFilter}
        allTags={allTags}
      />

      {/* Upload progress toast — non-blocking */}
      {isProcessingUpload && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm glass-panel rounded-2xl px-4 py-3 shadow-2xl animate-fade-in-down">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-100 truncate">{uploadProgressText}</p>
              <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${uploadProgressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 shrink-0 tabular-nums">
              {uploadProgressPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Full-screen drop zone — drop files anywhere on the screen */}
      {isDragActive && (
        <div className="fixed inset-0 z-[100] pointer-events-none animate-fade-in">
          <div className="absolute inset-0 bg-indigo-950/60 modal-backdrop" />
          <div className="absolute inset-3 sm:inset-6 rounded-3xl border-[3px] border-dashed border-indigo-400/80 bg-indigo-500/10 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-500/25 border border-indigo-400/50 flex items-center justify-center shadow-2xl">
              <CloudUpload className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-200" />
            </div>
            <p className="text-base sm:text-xl font-bold text-white tracking-tight">
              Drop files to upload
            </p>
            <p className="text-xs sm:text-sm text-indigo-200/80">
              Images, videos &amp; ZIP archives — release anywhere on this screen
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <BatchExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={items}
        globalOverlays={globalConfig.overlays}
      />

      <AIFingerprintInspector
        item={activeItem || undefined}
        isOpen={isAIInspectorOpen}
        onClose={() => setIsAIInspectorOpen(false)}
      />
    </div>
  );
}

/* ============================================================
   Empty State Hero — shown when no media is loaded
   ============================================================ */
interface EmptyStateHeroProps {
  onUpload: () => void;
  onLoadSamples: () => void;
  isDragActive: boolean;
}

const EmptyStateHero: React.FC<EmptyStateHeroProps> = ({ onUpload, onLoadSamples, isDragActive }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-auto">
      <div className="max-w-lg w-full text-center animate-fade-in-up">
        {/* Drop target visual */}
        <div
          className={`relative mx-auto mb-7 w-36 h-36 sm:w-44 sm:h-44 rounded-3xl border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
            isDragActive
              ? 'border-indigo-400 bg-indigo-500/15 scale-105'
              : 'border-zinc-700/80 bg-zinc-900/40'
          }`}
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 blur-2xl" />
          <div
            className={`relative w-full h-full rounded-3xl flex items-center justify-center transition-transform duration-200 ${
              isDragActive ? 'scale-110' : ''
            }`}
          >
            <CloudUpload
              className={`w-12 h-12 sm:w-14 sm:h-14 transition-colors ${
                isDragActive ? 'text-indigo-300' : 'text-indigo-400'
              }`}
              strokeWidth={1.5}
            />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
          {isDragActive ? 'Release to upload' : 'Welcome to BrandStudio'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
          Drop your photos or videos <span className="text-zinc-200 font-medium">anywhere on this screen</span> to
          watermark them with your brand and purge AI fingerprints — or click below to browse your files.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={onUpload}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Files</span>
          </button>
          <button
            onClick={onLoadSamples}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Try with Samples</span>
          </button>
        </div>

        {/* Supported formats */}
        <div className="mt-7 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span className="font-mono">PNG · JPG · WebP · GIF · MP4 · WebM · MOV · ZIP</span>
        </div>
      </div>
    </div>
  );
};
