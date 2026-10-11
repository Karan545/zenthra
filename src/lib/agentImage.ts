/** Keep uploaded pictures small enough to store with the registration. */
export const MAX_AGENT_IMAGE_DATA_URL = 14_000;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Read a picture from the computer and return a compact JPEG data URL.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use a PNG, JPEG, WebP, or GIF.");
  }

  const source = await loadImage(file);
  try {
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!width || !height) {
      throw new Error("Could not read that image.");
    }

    let size = 256;
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const url = drawJpeg(source, width, height, size, quality);
      if (url.length <= MAX_AGENT_IMAGE_DATA_URL) return url;
      if (quality > 0.45) {
        quality = Math.round((quality - 0.12) * 100) / 100;
      } else {
        size = Math.round(size * 0.75);
        quality = 0.72;
      }
      if (size < 64) break;
    }
    throw new Error("That image is too large. Try a smaller picture.");
  } finally {
    if ("close" in source) source.close();
  }
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function drawJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  size: number,
  quality: number
): string {
  const scale = Math.min(1, size / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
