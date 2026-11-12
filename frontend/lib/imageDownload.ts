/**
 * GoVisual AI — Image Download & PNG Conversion Utilities
 * Converts any image source (JPEG, WebP, Data URL, Remote/Local URL) into a verified PNG file via Canvas
 */

/**
 * Resolves a potentially relative image path into a full absolute URL.
 * Normalizes backend static paths (e.g. /static/generated/...) against the configured API URL.
 */
export function resolveFullImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return `${apiBase.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Checks if a Blob begins with the canonical 8-byte PNG file signature:
 * 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A (\x89PNG\r\n\x1a\n)
 */
export async function isValidPngBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 8) return false;
  try {
    const buffer = await blob.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 && // P
      bytes[2] === 0x4e && // N
      bytes[3] === 0x47 && // G
      bytes[4] === 0x0d && // \r
      bytes[5] === 0x0a && // \n
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  } catch {
    return false;
  }
}

/**
 * Loads an image from a URL into an HTMLImageElement with a timeout.
 */
function loadImageElement(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error("Image load timed out"));
    }, 15000);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Failed to load image from source"));
    };
    img.src = src;
  });
}

/**
 * Draws an HTMLImageElement onto a Canvas and exports it as an image/png Blob.
 */
function renderImageToPngBlob(img: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width || 1024;
      canvas.height = img.naturalHeight || img.height || 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Canvas 2D context unavailable"));
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error("Canvas export produced an empty blob"));
          }
        },
        "image/png",
        1.0
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts any image source into a guaranteed valid PNG blob.
 * Uses a two-stage strategy:
 * 1. Direct cross-origin Image load + Canvas draw
 * 2. Fetch network fallback -> same-origin Blob URL -> Canvas draw
 * Verifies the exported blob actually contains PNG signature bytes.
 */
export async function convertToPngBlob(rawUrl: string): Promise<Blob> {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("No image source provided for conversion");
  }

  const resolvedUrl = resolveFullImageUrl(rawUrl);

  // Strategy 1: Direct HTMLImageElement + Canvas
  try {
    const img = await loadImageElement(
      resolvedUrl,
      resolvedUrl.startsWith("data:") || resolvedUrl.startsWith("blob:") ? undefined : "anonymous"
    );
    const blob = await renderImageToPngBlob(img);
    if (await isValidPngBlob(blob)) {
      return blob;
    }
  } catch (directErr) {
    console.warn("[PNG Converter] Direct canvas conversion failed, falling back to fetch:", directErr);
  }

  // Strategy 2: Fetch -> Same-Origin ObjectURL -> Canvas
  try {
    const resp = await fetch(resolvedUrl);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} - ${resp.statusText}`);
    }
    const rawBlob = await resp.blob();
    if (!rawBlob || rawBlob.size === 0) {
      throw new Error("Fetched image content is empty");
    }

    // If it's already an authentic PNG blob, verify signature and return
    if (rawBlob.type === "image/png" && (await isValidPngBlob(rawBlob))) {
      return rawBlob;
    }

    // Convert raw blob (e.g. image/jpeg) to PNG via in-memory blob URL
    const blobUrl = URL.createObjectURL(rawBlob);
    try {
      const img = await loadImageElement(blobUrl);
      const pngBlob = await renderImageToPngBlob(img);
      if (await isValidPngBlob(pngBlob)) {
        return pngBlob;
      }
      throw new Error("Converted blob failed PNG signature validation");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (fetchErr: any) {
    console.error("[PNG Converter] Conversion pipeline failed:", fetchErr);
    throw new Error(fetchErr.message || "Failed to convert image to PNG");
  }
}

/**
 * Downloads the image as a valid PNG with a sanitized, product-based filename.
 * Throws actionable errors on network/conversion failure so the UI can inform the user.
 */
export async function downloadAsPng(imageUrl: string, filename: string): Promise<boolean> {
  const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const finalFilename = safeName.endsWith(".png") ? safeName : `${safeName}.png`;

  try {
    const pngBlob = await convertToPngBlob(imageUrl);
    const blobUrl = window.URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    return true;
  } catch (err: any) {
    console.error("[PNG Download] Failed to download PNG:", err);
    throw err;
  }
}

/**
 * Native or Web Share API with file support where available, falling back to WhatsApp Web link.
 */
export async function shareToWhatsAppContact(
  imageUrl: string,
  captionText: string,
  productName: string
): Promise<{ method: "native_file" | "whatsapp_web" | "clipboard"; success: boolean }> {
  const fullText = captionText
    ? `${captionText}\n\nGenerated with GoVisual AI`
    : `Check out our latest commercial creative for ${productName}!\n\nGenerated with GoVisual AI`;

  const resolvedUrl = resolveFullImageUrl(imageUrl);

  // Try Web Share Level 2 with file on supported devices (Android / iOS)
  if (typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const blob = await convertToPngBlob(resolvedUrl);
      const file = new File([blob], `${productName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`, {
        type: "image/png",
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: productName,
          text: fullText,
        });
        return { method: "native_file", success: true };
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return { method: "native_file", success: false };
      }
      console.info("[Share] Web Share with file failed, falling back to WhatsApp link:", e);
    }
  }

  // Fallback: WhatsApp API URL
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${fullText}\n\n${resolvedUrl}`)}`;
  window.open(waUrl, "_blank");
  return { method: "whatsapp_web", success: true };
}
