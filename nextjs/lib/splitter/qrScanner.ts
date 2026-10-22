import jsQR from "jsqr";

/**
 * Parses raw text or URL scanned from a QR code and extracts the session ID
 */
export function extractSessionIdFromQR(rawText: string): string {
  if (!rawText) return "";
  const text = rawText.trim();

  // Helper to normalize session ID preserving mixed-case for CAP@ and uppercase for CAP-SPLIT
  const normalizeId = (rawId: string): string => {
    const trimmed = rawId.trim();
    if (/^CAP@/i.test(trimmed)) {
      return `CAP@${trimmed.slice(4)}`;
    }
    return trimmed.toUpperCase();
  };

  // 1. Try URL parameter `?join=...` or `&join=...`
  try {
    const urlString = text.includes("://") ? text : `https://${text}`;
    const url = new URL(urlString);
    const joinParam = url.searchParams.get("join");
    if (joinParam) {
      return normalizeId(joinParam);
    }

    // 2. Try URL path /splitter/[id]
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment) {
      const decoded = decodeURIComponent(lastSegment);
      const capAtMatch = decoded.match(/CAP@[A-Za-z0-9]+/i);
      if (capAtMatch) {
        return `CAP@${capAtMatch[0].slice(4)}`;
      }
      const splitMatch = decoded.match(/CAP-SPLIT-[A-Z0-9-]+/i);
      if (splitMatch) return splitMatch[0].toUpperCase();
    }
  } catch {
    // Ignore URL parse error
  }

  // 3. Regex match for CAP@ format
  const capAtMatch = text.match(/CAP@[A-Za-z0-9]+/i);
  if (capAtMatch) {
    return `CAP@${capAtMatch[0].slice(4)}`;
  }

  // 4. Regex match for standard CapFlow session ID format (e.g. CAP-SPLIT-9821-X)
  const regexMatch = text.match(/CAP-SPLIT-[A-Z0-9-]+/i);
  if (regexMatch) {
    return regexMatch[0].toUpperCase();
  }

  // 5. Return sanitized string
  return normalizeId(text);
}

/**
 * Decodes a QR code from a video frame using BarcodeDetector if available, falling back to jsQR
 */
export async function decodeQRCodeFromVideo(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): Promise<string | null> {
  if (!video || video.readyState < 2) return null;

  // 1. Try native BarcodeDetector API (hardware accelerated where available)
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fallback to jsQR
    }
  }

  // 2. Pure JS canvas fallback with jsQR (works in all browsers: Safari, Firefox, Chrome, iOS, Android)
  try {
    const cvs = canvas || document.createElement("canvas");
    cvs.width = video.videoWidth || 640;
    cvs.height = video.videoHeight || 480;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
    const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      return code.data;
    }
  } catch {
    // Frame capture failure
  }

  return null;
}

/**
 * Decodes a QR code from an image file (File or Blob)
 */
export async function decodeQRCodeFromFile(file: File | Blob): Promise<string | null> {
  if (!file) return null;

  // 1. Try native BarcodeDetector if available
  if (
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof createImageBitmap !== "undefined"
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to jsQR
    }
  }

  // 2. jsQR fallback via Image / Canvas
  return new Promise<string | null>((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            resolve(code?.data || null);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}
