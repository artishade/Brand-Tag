/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Eye, Layers, Sliders, Tag as TagIcon, Upload, ImagePlus, ShieldCheck, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { MediaTray } from './components/MediaTray';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { MediaEditorSidebar } from './components/MediaEditorSidebar';
import { AIFingerprintInspector } from './components/AIFingerprintInspector';
import { BatchExportModal } from './components/BatchExportModal';
import { UploadModal } from './components/UploadModal';
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
  // Media items list
  const [items, setItems] = useState<MediaItem[]>(() => {
    // Initialize with high quality sample items so the app is immediately alive and interactive
    return SAMPLE_MEDIA_LIST.map((sample) => ({
      ...sample,
      tags: [...sample.tags],
      edits: { ...sample.edits },
    }));
  });

  // Currently selected media item ID
  const [activeId, setActiveId] = useState<string | null>(() => {
    return SAMPLE_MEDIA_LIST[0]?.id || null;
  });

  // Mobile navigation tab: 'canvas' | 'brand' | 'edits' | 'tags'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'brand' | 'edits' | 'tags'>('canvas');

  // Global Brand and Watermark Configuration
  const [globalConfig, setGlobalConfig] = useState<GlobalBrandConfig>(INITIAL_BRAND_CONFIG);

  // Selected Overlay ID in the canvas
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Filter by tag in media tray
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAIInspectorOpen, setIsAIInspectorOpen] = useState(false);

  // Upload processing state
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);

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

  // Global keyboard shortcuts for power users:
  //   - Esc         : deselect current overlay (or close modals)
  //   - Arrow keys  : nudge selected overlay by 1%
  //   - Shift+Arrow : nudge by 5%
  //   - [ / ]       : cycle prev/next media item
  //   - Delete/Bksp : delete selected overlay
  //   - D           : duplicate selected overlay
  //   - Cmd/Ctrl+E  : open export modal
  //   - Cmd/Ctrl+U  : open upload modal
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
          setIsUploadModalOpen(true);
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
          setIsUploadModalOpen(false);
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
        handleUpdateOverlay(selectedOverlayId, { x: Math.max(3, targetOverlay.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { x: Math.min(97, targetOverlay.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { y: Math.max(3, targetOverlay.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleUpdateOverlay(selectedOverlayId, { y: Math.min(97, targetOverlay.y + step) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteOverlay(selectedOverlayId);
      } else if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleDuplicateOverlay(selectedOverlayId);
      }
    },
    [selectedOverlayId, activeOverlays, items, activeId, handleUpdateOverlay, handleDeleteOverlay, handleDuplicateOverlay]
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

  // Upload handler: Processes single/multiple files or .zip files
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    setIsUploadModalOpen(true);
    setIsProcessingUpload(true);
    setUploadProgressPercent(0);
    setUploadProgressText('Inspecting uploaded archives & files...');

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
      setIsUploadModalOpen(false);
      return;
    }

    const newMediaItems: MediaItem[] = [];
    let completedCount = 0;

    for (const file of filesToClean) {
      setUploadProgressText(`Purging AI metadata & neutralizing SynthID: ${file.name}...`);
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

    setUploadProgressText('Purification Complete! Adding to Studio...');
    setTimeout(() => {
      setIsProcessingUpload(false);
      setIsUploadModalOpen(false);
    }, 600);
  };

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
      {/* Top Header */}
      <Header
        mediaCount={items.length}
        activeItem={activeItem || undefined}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAIInspector={() => setIsAIInspectorOpen(true)}
        onLoadSamples={handleLoadSamples}
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
            onUpload={() => setIsUploadModalOpen(true)}
            onLoadSamples={handleLoadSamples}
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

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFilesSelected={handleFilesSelected}
        onLoadSamples={handleLoadSamples}
        isProcessing={isProcessingUpload}
        progressText={uploadProgressText}
        progressPercent={uploadProgressPercent}
      />

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
}

const EmptyStateHero: React.FC<EmptyStateHeroProps> = ({ onUpload, onLoadSamples }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-auto">
      <div className="max-w-xl w-full text-center animate-fade-in-up">
        {/* Hero illustration: a stylized stack of media */}
        <div className="relative mx-auto mb-8 w-40 h-40 sm:w-48 sm:h-48">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 blur-2xl" />
          <div className="absolute inset-4 sm:inset-6 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 border border-zinc-700/50 flex items-center justify-center shadow-2xl">
            <div className="w-full h-full rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.18),transparent_50%)] flex items-center justify-center">
              <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 text-indigo-400" strokeWidth={1.5} />
            </div>
          </div>
          {/* Floating accent badges */}
          <div className="absolute -top-1 -right-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 backdrop-blur shadow-lg">
            <ShieldCheck className="w-3 h-3" />
            <span>AI-Safe</span>
          </div>
          <div className="absolute -bottom-1 -left-1 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[10px] font-semibold flex items-center gap-1 backdrop-blur shadow-lg">
            <Layers className="w-3 h-3" />
            <span>Multi-Brand</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
          Welcome to BrandStudio
        </h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
          Drop your photos and videos to instantly watermark them with your brand
          and automatically purge AI-generated fingerprints. Supports ZIP archives
          and batch exports.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={onUpload}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
            <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-indigo-700/50 text-[10px] font-mono">⌘U</kbd>
          </button>
          <button
            onClick={onLoadSamples}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Try with Samples</span>
          </button>
        </div>

        {/* Feature pills */}
        <div className="mt-8 grid grid-cols-3 gap-2 max-w-md mx-auto">
          {[
            { label: 'AI Fingerprint Purge', icon: ShieldCheck },
            { label: 'Multi-Logo & Text', icon: Layers },
            { label: 'Batch ZIP Export', icon: Sparkles },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.label}
                className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col items-center gap-1 text-[10px] text-zinc-400"
              >
                <Icon className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-center leading-tight">{feat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
