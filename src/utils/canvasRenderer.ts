import { MediaItem, WatermarkOverlay } from '../types';

/**
 * Loads an image from URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote http/https URLs; setting it on blob:/data: causes Safari & Mobile WebKit to fail
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If it failed with crossOrigin, retry without crossOrigin
      if (img.crossOrigin) {
        const retryImg = new Image();
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = (e) => reject(e);
        retryImg.src = src;
      } else {
        reject(new Error(`Failed to load image: ${src.slice(0, 40)}...`));
      }
    };
    img.src = src;
  });
}

/**
 * Calculates crop dimensions according to selected aspect ratio
 */
function calculateCrop(
  srcWidth: number,
  srcHeight: number,
  aspectRatio: MediaItem['edits']['aspectRatio']
): { cropX: number; cropY: number; cropW: number; cropH: number } {
  if (aspectRatio === 'original') {
    return { cropX: 0, cropY: 0, cropW: srcWidth, cropH: srcHeight };
  }

  let targetRatio = srcWidth / srcHeight;
  if (aspectRatio === '1:1') targetRatio = 1;
  else if (aspectRatio === '16:9') targetRatio = 16 / 9;
  else if (aspectRatio === '9:16') targetRatio = 9 / 16;
  else if (aspectRatio === '4:5') targetRatio = 4 / 5;
  else if (aspectRatio === '4:3') targetRatio = 4 / 3;

  let cropW = srcWidth;
  let cropH = srcHeight;

  const currentRatio = srcWidth / srcHeight;
  if (currentRatio > targetRatio) {
    // Current is wider than target: trim horizontal sides
    cropW = srcHeight * targetRatio;
    cropH = srcHeight;
  } else {
    // Current is taller than target: trim top & bottom
    cropW = srcWidth;
    cropH = srcWidth / targetRatio;
  }

  const cropX = (srcWidth - cropW) / 2;
  const cropY = (srcHeight - cropH) / 2;

  return { cropX, cropY, cropW, cropH };
}

/**
 * Renders full composited canvas with adjustments, transformations, and overlays.
 * Output is high-resolution matching media's real dimensions.
 */
export async function renderCompositedCanvas(
  item: MediaItem,
  overlays: WatermarkOverlay[]
): Promise<HTMLCanvasElement> {
  const baseImg = await loadImage(item.cleanedUrl || item.url);
  const edits = item.edits;

  const { cropX, cropY, cropW, cropH } = calculateCrop(
    baseImg.naturalWidth,
    baseImg.naturalHeight,
    edits.aspectRatio
  );

  const isRotated90or270 = edits.rotation === 90 || edits.rotation === 270;
  const finalWidth = isRotated90or270 ? cropH : cropW;
  const finalHeight = isRotated90or270 ? cropW : cropH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(finalWidth);
  canvas.height = Math.round(finalHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Apply image adjustments via CSS filter shorthand
  const b = 100 + edits.brightness;
  const c = 100 + edits.contrast;
  const s = 100 + edits.saturation;
  const hRotate = edits.warmth * 0.5; // subtle warmth via hue-rotate/sepia
  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${hRotate}deg)`;

  // 2. Transformations (Rotation & Flip)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  if (edits.rotation !== 0) {
    ctx.rotate((edits.rotation * Math.PI) / 180);
  }
  if (edits.flipH || edits.flipV) {
    ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1);
  }

  // Draw cropped image centered
  ctx.drawImage(
    baseImg,
    cropX,
    cropY,
    cropW,
    cropH,
    -cropW / 2,
    -cropH / 2,
    cropW,
    cropH
  );

  ctx.restore();
  ctx.filter = 'none'; // reset filter for overlays

  // 3. Optional Vignette effect
  if (edits.vignette > 0) {
    const radius = Math.sqrt(Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2));
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      radius * (1 - edits.vignette / 120),
      canvas.width / 2,
      canvas.height / 2,
      radius
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${(edits.vignette / 100) * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 4. Render Overlays (Logos and Texts)
  for (const overlay of overlays) {
    // Coordinate translation: x & y are 0 to 100 percentage of canvas width & height
    const posX = (overlay.x / 100) * canvas.width;
    const posY = (overlay.y / 100) * canvas.height;

    ctx.save();
    ctx.globalAlpha = overlay.opacity;
    ctx.translate(posX, posY);

    if (overlay.rotation) {
      ctx.rotate((overlay.rotation * Math.PI) / 180);
    }

    if (overlay.type === 'logo') {
      try {
        const logoImg = await loadImage(overlay.content);
        // Base logo width scales proportional to media dimensions
        const baseWidth = (canvas.width * 0.2) * (overlay.scale || 1);
        const aspect = (logoImg.naturalHeight || 1) / (logoImg.naturalWidth || 1);
        const baseHeight = baseWidth * aspect;

        if (overlay.blendMode && overlay.blendMode !== 'normal') {
          ctx.globalCompositeOperation = overlay.blendMode;
        }

        ctx.drawImage(
          logoImg,
          -baseWidth / 2,
          -baseHeight / 2,
          baseWidth,
          baseHeight
        );
      } catch (err) {
        console.warn('Could not render logo in canvas:', err);
      }
    } else if (overlay.type === 'text') {
      // Text rendering
      // Scale font size proportionally to canvas width (baseline: 1920px)
      const scaleFactor = canvas.width / 1400;
      const computedFontSize = Math.max(16, (overlay.fontSize || 28) * scaleFactor * (overlay.scale || 1));
      const fontFamily = overlay.fontFamily || "'Plus Jakarta Sans', sans-serif";
      const fontWeight = overlay.fontWeight || 'bold';

      ctx.font = `${fontWeight} ${computedFontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(overlay.content);
      const textWidth = metrics.width;
      const textHeight = computedFontSize * 1.2;

      // Optional background pill/box
      if (overlay.backgroundColor && (overlay.backgroundOpacity ?? 0.8) > 0) {
        ctx.save();
        ctx.fillStyle = overlay.backgroundColor;
        ctx.globalAlpha = overlay.opacity * (overlay.backgroundOpacity ?? 0.8);
        const padX = computedFontSize * 0.6;
        const padY = computedFontSize * 0.3;
        const r = computedFontSize * 0.3;

        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(
          -textWidth / 2 - padX,
          -textHeight / 2 - padY,
          textWidth + padX * 2,
          textHeight + padY * 2,
          r
        );
        ctx.fill();
        ctx.restore();
      }

      // Text Shadow
      if (overlay.shadow) {
        ctx.shadowColor = overlay.shadowColor || 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = computedFontSize * 0.25;
        ctx.shadowOffsetX = computedFontSize * 0.08;
        ctx.shadowOffsetY = computedFontSize * 0.08;
      }

      ctx.fillStyle = overlay.color || '#ffffff';
      ctx.fillText(overlay.content, 0, 0);
    }

    ctx.restore();
  }

  return canvas;
}
