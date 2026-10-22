/**
 * QR Code Matrix & SVG Generator.
 * Implements ISO/IEC 18004 QR Code Model 2 with Reed-Solomon Error Correction via battle-tested 'qrcode'.
 * 100% offline, client and server compatible.
 */

import QRCode from "qrcode";

export type QRErrorCorrectLevel = "L" | "M" | "Q" | "H";

/**
 * Generate an SVG string representing the QR code for a given text or URL.
 * Conforms to ISO/IEC 18004 standards with high-contrast quiet zone margins.
 */
export function generateQRCodeSVG(
  text: string,
  options: {
    size?: number;
    color?: string;
    bgColor?: string;
    margin?: number;
    errorCorrectionLevel?: QRErrorCorrectLevel;
  } = {}
): string {
  const size = options.size || 240;
  const color = options.color || "#0F172A";
  const bgColor = options.bgColor || "#FFFFFF";
  const margin = options.margin !== undefined ? options.margin : 4;
  const ecl = options.errorCorrectionLevel || "M";

  try {
    const qr = QRCode.create(text, {
      errorCorrectionLevel: ecl,
    });

    const count = qr.modules.size;
    const totalCells = count + margin * 2;
    const cellSize = size / totalCells;

    let rects = "";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.modules.get(r, c)) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellSize + 0.05).toFixed(2)}" height="${(cellSize + 0.05).toFixed(2)}" fill="${color}" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="12" />
      ${rects}
    </svg>`;
  } catch (err) {
    console.error("[QR Generator] Failed to generate QR code SVG:", err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="12" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="${color}">QR Unavailable</text>
    </svg>`;
  }
}
