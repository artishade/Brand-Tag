/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
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
      <div className="flex-1 flex overflow-hidden">
        {/* Central Workspace: Interactive Canvas */}
        {activeItem ? (
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-4">
            <p className="text-sm">No media in queue.</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
            >
              Upload Pictures, Videos or ZIP
            </button>
          </div>
        )}

        {/* Right Editor Sidebar */}
        {activeItem && (
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
          />
        )}
      </div>

      {/* Bottom Media Tray Carousel */}
      <MediaTray
        items={items}
        activeId={activeId}
        onSelectItem={(id) => {
          setActiveId(id);
          setSelectedOverlayId(null);
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
