/**
 * Image processing utilities for 4M1E1I system
 * Handles offline-friendly rotation, cropping, WebP conversion,
 * and smart quality tuning on client canvas to target 100KB-200KB.
 */

export interface CompressingResult {
  compressedBase64: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
  qualityUsed: number;
}

/**
 * Loads an image from a native file into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Không thể tải tập tin hình ảnh."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes, rotates, crops and compresses an image to WebP format,
 * striving to output between 100KB and 200KB for maximum detail retention.
 */
export async function processImage(
  imageSource: HTMLImageElement,
  options: {
    rotationAngle: number; // 0, 90, 180, 270
    cropState?: { x: number; y: number; width: number; height: number } | null;
    targetMinKb?: number; // default 100
    targetMaxKb?: number; // default 200
  }
): Promise<CompressingResult> {
  const rotationAngle = options.rotationAngle % 360;
  const targetMinKb = options.targetMinKb || 100;
  const targetMaxKb = options.targetMaxKb || 200;

  // Create primary offscreen canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Không khởi tạo được bộ lọc canvas 2D.");
  }

  // Calculate rotating bounding box
  let srcWidth = imageSource.naturalWidth || imageSource.width;
  let srcHeight = imageSource.naturalHeight || imageSource.height;

  // Apply cropping coordinates if provided
  let startX = 0;
  let startY = 0;
  let drawWidth = srcWidth;
  let drawHeight = srcHeight;

  if (options.cropState) {
    const c = options.cropState;
    startX = (c.x / 100) * srcWidth;
    startY = (c.y / 100) * srcHeight;
    drawWidth = (c.width / 100) * srcWidth;
    drawHeight = (c.height / 100) * srcHeight;
  }

  // Set canvas dimensions based on rotation
  const is90or270 = rotationAngle === 90 || rotationAngle === 270;
  if (is90or270) {
    canvas.width = drawHeight;
    canvas.height = drawWidth;
  } else {
    canvas.width = drawWidth;
    canvas.height = drawHeight;
  }

  // Draw rotated/cropped photo on canvas
  ctx.save();
  // Translate to center for rotation
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationAngle * Math.PI) / 180);
  
  // Draw the image centered
  ctx.drawImage(
    imageSource,
    startX,
    startY,
    drawWidth,
    drawHeight,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  ctx.restore();

  // Smart iterative compression targeting 100KB-200KB
  // We'll adjust resolution and quality recursively to hit the target.
  const maxPixels = 1200 * 900; // Cap resolution at ~1.08 MP to save memory while preserving high detail
  const currentPixels = canvas.width * canvas.height;
  
  let processingCanvas = canvas;
  if (currentPixels > maxPixels) {
    const scale = Math.sqrt(maxPixels / currentPixels);
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = Math.round(canvas.width * scale);
    scaledCanvas.height = Math.round(canvas.height * scale);
    const sCtx = scaledCanvas.getContext("2d");
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      processingCanvas = scaledCanvas;
    }
  }

  let finalBase64 = "";
  let finalSizeKb = 0;
  let bestQuality = 0.85;

  // Binary search or trial of qualities to land exactly in 100kb-200kb if possible
  const qualityTries = [0.95, 0.85, 0.75, 0.60, 0.45, 0.30];
  
  for (const q of qualityTries) {
    const testBase64 = processingCanvas.toDataURL("image/webp", q);
    // Calculate size in KB: length of base64 * 3/4 / 1024
    const headLen = testBase64.indexOf(",") + 1;
    const sizeKb = Math.round(((testBase64.length - headLen) * 3) / 4 / 102.4) / 10;
    
    finalBase64 = testBase64;
    finalSizeKb = sizeKb;
    bestQuality = q;

    // If within our golden 100 - 200 KB target, we stop!
    if (sizeKb >= targetMinKb && sizeKb <= targetMaxKb) {
      break;
    }
    // If it's too small, maybe we can use a higher quality next, otherwise we take the closest quality
  }

  // Estimate original size
  // If we can get it from canvas png test representation or standard estimate
  const placeholderPng = imageSource.src;
  let estOriginalKb = 500;
  if (placeholderPng.startsWith("data:")) {
    const headLen = placeholderPng.indexOf(",") + 1;
    estOriginalKb = Math.round(((placeholderPng.length - headLen) * 3) / 4 / 10.24) / 100;
  }

  return {
    compressedBase64: finalBase64,
    originalSizeKb: estOriginalKb || 600,
    compressedSizeKb: finalSizeKb,
    width: processingCanvas.width,
    height: processingCanvas.height,
    qualityUsed: bestQuality
  };
}
