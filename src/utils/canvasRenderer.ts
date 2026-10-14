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
 * Transforms overlay coordinates from preview space to canvas space.
 *
 * In the preview (InteractiveCanvas), overlays are positioned as CSS percentage
 * offsets relative to the media container div. The container div has the ORIGINAL
 * aspect ratio (it does NOT rotate — only the inner <img> gets CSS rotate/flip).
 * The image is visually rotated/flipped inside that container, but overlay
 * positions stay as percentages of the original-ratio container.
 *
 * In the export canvas, the image is drawn rotated/flipped and the canvas
 * dimensions are SWAPPED for 90°/270° rotation (finalWidth = cropH, finalHeight = cropW).
 * So we must transform the overlay's percentage coordinates to match the
 * post-rotation visual coordinate system before converting to pixels.
 */
function transformOverlayCoords(
  x: number,
  y: number,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  let adjX = x;
  let adjY = y;

  // Apply inverse rotation to account for the image rotation in the export canvas.
  // CSS rotate(90deg) and ctx.rotate(90°) both rotate clockwise by 90°.
  // The canvas dimensions are swapped (W↔H) for 90/270, so the percentage
  // mapping must also swap to stay visually aligned.
  if (rotation === 90) {
    // 90° CW: (x, y) in preview → (100-y, x) in rotated canvas space
    adjX = 100 - y;
    adjY = x;
  } else if (rotation === 180) {
    // 180°: (x, y) → (100-x, 100-y)
    adjX = 100 - x;
    adjY = 100 - y;
  } else if (rotation === 270) {
    // 270° CW (90° CCW): (x, y) → (y, 100-x)
    adjX = y;
    adjY = 100 - x;
  }

  // Apply inverse flip — if the image is flipped, the coordinate is mirrored
  if (flipH) {
    adjX = 100 - adjX;
  }
  if (flipV) {
    adjY = 100 - adjY;
  }

  return {
    x: (adjX / 100) * canvasWidth,
    y: (adjY / 100) * canvasHeight,
  };
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
  const hRotate = edits.warmth * 0.5; // subtle warmth via hue-rotate
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

  // Reset transformation matrix for overlays
  ctx.setTransform(1, 0, 0, 1, 0, 0);

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
  // Overlay coordinates must be transformed from preview space (relative to the
  // unrotated container) to canvas space (relative to the rotated/swapped canvas).
  for (const overlay of overlays) {
    const { x: posX, y: posY } = transformOverlayCoords(
      overlay.x,
      overlay.y,
      edits.rotation,
      edits.flipH,
      edits.flipV,
      canvas.width,
      canvas.height
    );

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
      // Scale font size proportionally to canvas width (baseline: 1400px)
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

      // --- Resolution-Scaled Positioning with Edge Awareness ---
      // The overlay position (posX, posY) is a center anchor point derived
      // from percentage coordinates on the *canvas*. For text overlays, a
      // center-anchored position can cause the text to overflow the canvas
      // boundaries (especially on the left/right edges or for wide text).
      // We compute an edge-adjusted draw position so the text glyph stays
      // within the visible canvas area, using a proportional padding.
      const padding = Math.max(canvas.width * 0.02, 12);

      // Determine which horizontal edge the anchor is closer to:
      //   - x < 50  → left-biased  (text draws left-aligned from posX, clamped by padding)
      //   - x >= 50 → right-biased (text draws right-aligned, width subtracted)
      // This preserves Bottom-Left / Bottom-Right semantic positioning while
      // ensuring the measured text width is accounted for.
      let drawTextX = 0;
      if (overlay.x < 50) {
        // Left-biased: place text so its left edge sits at posX + padding
        // but don't push past the left canvas edge.
        const availableWidth = posX;
        const safeOffset = Math.min(textWidth / 2, availableWidth - padding);
        drawTextX = -textWidth / 2 + safeOffset;
      } else {
        // Right-biased: place text so its right edge stays within bounds
        const availableWidth = canvas.width - posX;
        const safeOffset = Math.min(textWidth / 2, availableWidth - padding);
        drawTextX = textWidth / 2 - safeOffset;
      }

      // Similarly for vertical positioning — keep text within top/bottom bounds
      let drawTextY = 0;
      if (overlay.y < 50) {
        const availableHeight = posY;
        const safeOffsetY = Math.min(textHeight / 2, availableHeight - padding);
        drawTextY = -textHeight / 2 + safeOffsetY;
      } else {
        const availableHeight = canvas.height - posY;
        const safeOffsetY = Math.min(textHeight / 2, availableHeight - padding);
        drawTextY = textHeight / 2 - safeOffsetY;
      }

      // Optional background pill/box
      if (overlay.backgroundColor && (overlay.backgroundOpacity ?? 0.8) > 0) {
        ctx.save();
        ctx.fillStyle = overlay.backgroundColor;
        ctx.globalAlpha = overlay.opacity * (overlay.backgroundOpacity ?? 0.8);
        const padX = computedFontSize * 0.6;
        const padY = computedFontSize * 0.3;
        const r = computedFontSize * 0.3;

        // Rounded rect — centered on the same (drawTextX, drawTextY) origin
        // but we anchor the pill to the same edge-adjusted position.
        const pillX = drawTextX - padX;
        const pillY = drawTextY - textHeight / 2 - padY;
        const pillW = textWidth + padX * 2;
        const pillH = textHeight + padY * 2;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, r);
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
      ctx.fillText(overlay.content, drawTextX, drawTextY);
    }

    ctx.restore();
  }

  return canvas;
}
