export type MediaType = 'image' | 'video';

export interface AICleanStats {
  strippedMetadata: boolean;
  synthIdDisrupted: boolean;
  ditherPerturbationApplied: boolean;
  detectedSignatures: string[];
  cleanDataBytes: number;
  originalDataBytes: number;
  processedAt: number;
}

export interface MediaEdits {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100
  vignette: number; // 0 to 100
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  aspectRatio: 'original' | '1:1' | '16:9' | '9:16' | '4:5' | '4:3';
}

export interface WatermarkOverlay {
  id: string;
  type: 'logo' | 'text';
  content: string; // text string or dataURL/image URL for logo
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  scale: number; // 0.2 to 3.0
  opacity: number; // 0 to 1
  rotation: number; // degrees -180 to 180
  // Text specific properties:
  color?: string;
  fontSize?: number; // relative font size (12 to 72)
  fontFamily?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  letterSpacing?: number;
  shadow?: boolean;
  shadowColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  // Logo specific properties:
  logoWidth?: number;
  logoHeight?: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  size: number;
  url: string; // original preview URL
  cleanedUrl: string; // post-AI-clean URL
  width: number;
  height: number;
  duration?: number; // for videos in seconds
  tags: string[];
  originalFile?: File;
  aiStats: AICleanStats;
  edits: MediaEdits;
  hasCustomOverlays: boolean;
  customOverlays?: WatermarkOverlay[];
}

export interface GlobalBrandConfig {
  applyToAll: boolean;
  defaultLogo?: {
    url: string;
    name: string;
    width: number;
    height: number;
  };
  overlays: WatermarkOverlay[];
  autoCleanAI: boolean;
}
