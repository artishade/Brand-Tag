import { MediaItem, WatermarkOverlay, GlobalBrandConfig } from '../types';

/**
 * Generates an SVG data URL for a crisp sample watermark logo
 */
export function generateSampleLogoSVG(name: string, type: 'badge' | 'monogram' | 'crest' = 'badge'): string {
  let svg = '';
  if (type === 'badge') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 90" width="320" height="90">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="316" height="86" rx="43" fill="#09090b" fill-opacity="0.85" stroke="url(#g)" stroke-width="3"/>
      <circle cx="48" cy="45" r="24" fill="url(#g)"/>
      <path d="M48 30 L53 40 L64 42 L56 50 L58 60 L48 55 L38 60 L40 50 L32 42 L43 40 Z" fill="#ffffff"/>
      <text x="88" y="44" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="22" letter-spacing="1.5">${name.toUpperCase()}</text>
      <text x="89" y="64" fill="#a1a1aa" font-family="system-ui, sans-serif" font-weight="600" font-size="11" letter-spacing="3">OFFICIAL VERIFIED MEDIA</text>
    </svg>`;
  } else if (type === 'monogram') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="74" fill="#09090b" fill-opacity="0.9" stroke="url(#mg)" stroke-width="4"/>
      <polygon points="80,28 126,118 34,118" fill="none" stroke="url(#mg)" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="80" cy="88" r="14" fill="#ffffff"/>
      <text x="80" y="146" fill="#f4f4f5" font-family="system-ui, sans-serif" font-weight="700" font-size="14" text-anchor="middle" letter-spacing="3">CREATIVE</text>
    </svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
      <rect x="0" y="0" width="240" height="70" rx="12" fill="#000000" fill-opacity="0.75"/>
      <text x="24" y="44" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="26" letter-spacing="-0.5">STUDIO<tspan fill="#6366f1">X</tspan></text>
      <circle cx="190" cy="35" r="8" fill="#22c55e"/>
      <text x="204" y="39" fill="#e4e4e7" font-family="system-ui, sans-serif" font-weight="600" font-size="12">RAW</text>
    </svg>`;
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_SAMPLE_LOGO = generateSampleLogoSVG('Apex Studio', 'badge');

export const DEFAULT_WATERMARK_OVERLAYS: WatermarkOverlay[] = [
  {
    id: 'ov-logo-default',
    type: 'logo',
    content: DEFAULT_SAMPLE_LOGO,
    x: 18,
    y: 16,
    scale: 1.0,
    opacity: 0.92,
    rotation: 0,
    blendMode: 'normal',
  },
  {
    id: 'ov-text-copyright',
    type: 'text',
    content: '© 2026 APEX MEDIA · ALL RIGHTS RESERVED',
    x: 50,
    y: 92,
    scale: 1.0,
    opacity: 0.9,
    rotation: 0,
    color: '#ffffff',
    fontSize: 22,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 'medium',
    shadow: true,
    shadowColor: 'rgba(0,0,0,0.85)',
    backgroundColor: '#09090b',
    backgroundOpacity: 0.65,
  },
  {
    id: 'ov-text-social',
    type: 'text',
    content: '@apex.visuals',
    x: 84,
    y: 16,
    scale: 1.0,
    opacity: 0.85,
    rotation: 0,
    color: '#38bdf8',
    fontSize: 24,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 'bold',
    shadow: true,
    shadowColor: 'rgba(0,0,0,0.9)',
    backgroundColor: '#000000',
    backgroundOpacity: 0.5,
  },
];

export const INITIAL_BRAND_CONFIG: GlobalBrandConfig = {
  applyToAll: true,
  defaultLogo: {
    url: DEFAULT_SAMPLE_LOGO,
    name: 'Apex_Studio_Badge.svg',
    width: 320,
    height: 90,
  },
  overlays: DEFAULT_WATERMARK_OVERLAYS,
  autoCleanAI: true,
};

/**
 * Curated high-res sample photos to demo the application immediately
 */
export const SAMPLE_MEDIA_LIST: Omit<MediaItem, 'originalFile'>[] = [
  {
    id: 'sample-1',
    name: 'synth_cyberpunk_alleyway.jpg',
    type: 'image',
    size: 2840000,
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600&auto=format&fit=crop',
    cleanedUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600&auto=format&fit=crop',
    width: 1600,
    height: 1067,
    tags: ['Cyberpunk', 'Concept Art', 'Purified'],
    aiStats: {
      strippedMetadata: true,
      synthIdDisrupted: true,
      ditherPerturbationApplied: true,
      detectedSignatures: [
        'C2PA Content Credentials Manifest',
        'Midjourney Generation Parameters (--v 6.0)',
        'SynthID Frequency Signature',
      ],
      cleanDataBytes: 2540000,
      originalDataBytes: 2840000,
      processedAt: Date.now() - 120000,
    },
    edits: {
      brightness: 0,
      contrast: 5,
      saturation: 10,
      warmth: 0,
      vignette: 15,
      rotation: 0,
      flipH: false,
      flipV: false,
      aspectRatio: 'original',
    },
    hasCustomOverlays: false,
  },
  {
    id: 'sample-2',
    name: 'hyperreal_portrait_studio.jpg',
    type: 'image',
    size: 3210000,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1600&auto=format&fit=crop',
    cleanedUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1600&auto=format&fit=crop',
    width: 1600,
    height: 1067,
    tags: ['Studio', 'Portrait', 'Approved'],
    aiStats: {
      strippedMetadata: true,
      synthIdDisrupted: true,
      ditherPerturbationApplied: true,
      detectedSignatures: [
        'Stable Diffusion Prompt & Seed Block',
        'Adobe Firefly AI Generation Stamp',
        'EXIF Software: Automatic1111 WebUI',
      ],
      cleanDataBytes: 2980000,
      originalDataBytes: 3210000,
      processedAt: Date.now() - 60000,
    },
    edits: {
      brightness: 2,
      contrast: 0,
      saturation: 0,
      warmth: 4,
      vignette: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      aspectRatio: 'original',
    },
    hasCustomOverlays: false,
  },
  {
    id: 'sample-3',
    name: 'futuristic_architectural_render.jpg',
    type: 'image',
    size: 1940000,
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
    cleanedUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
    width: 1600,
    height: 1067,
    tags: ['Architecture', '3D Render'],
    aiStats: {
      strippedMetadata: true,
      synthIdDisrupted: true,
      ditherPerturbationApplied: true,
      detectedSignatures: [
        'DALL-E 3 Provenance Header',
        'C2PA JUMBF Manifest',
      ],
      cleanDataBytes: 1820000,
      originalDataBytes: 1940000,
      processedAt: Date.now() - 10000,
    },
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
  },
];
