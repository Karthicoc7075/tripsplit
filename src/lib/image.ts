/**
 * Receipt images are stored inside the transaction document.
 *
 * That is deliberate: Firebase Storage uploads are **not** queued by the
 * offline persistence layer, so a receipt added on a trip with no signal would
 * simply be lost. Keeping the image in the document means it queues and syncs
 * exactly like the expense it belongs to.
 *
 * The cost is Firestore's hard 1 MB document limit — a raw phone photo is
 * 3–8 MB, and base64 inflates it by ~37%, so the write silently failed. These
 * helpers shrink the image until it comfortably fits, which is what makes the
 * in-document approach viable.
 */

/** Target for the encoded string — leaves ample room for the rest of the doc. */
const DEFAULT_MAX_BYTES = 180_000;
const DEFAULT_MAX_DIMENSION = 1280;
const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5, 0.4];

export interface CompressResult {
  dataUrl: string;
  /** Approximate size of the encoded string, in bytes. */
  bytes: number;
  originalBytes: number;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

/** Rough byte length of a data URL's payload. */
function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

function scaleToFit(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };
  const ratio = width > height ? max / width : max / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function compressImage(
  file: File,
  {
    maxBytes = DEFAULT_MAX_BYTES,
    maxDimension = DEFAULT_MAX_DIMENSION,
  }: { maxBytes?: number; maxDimension?: number } = {}
): Promise<CompressResult> {
  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process that image.");

  let dimension = maxDimension;

  // Step quality down first, then dimensions — quality is far less noticeable
  // on a receipt than losing the resolution needed to read the total.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, dimension);
    canvas.width = width;
    canvas.height = height;

    // White ground: JPEG has no alpha, and transparent PNGs would go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const bytes = dataUrlBytes(dataUrl);
      if (bytes <= maxBytes) {
        return { dataUrl, bytes, originalBytes: file.size, width, height };
      }
    }

    dimension = Math.round(dimension * 0.7);
  }

  throw new Error(
    "That image is too detailed to attach. Try a tighter crop of the receipt."
  );
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(Math.round(bytes / 1000), 1)} KB`;
}
