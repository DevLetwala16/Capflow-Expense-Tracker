import { PDFDocument, PDFPage, PDFFont, PDFImage, rgb, Color } from 'pdf-lib';
import { CAPFLOW_LOGO_BASE64 } from './pdfLogoData';

export const DEFAULT_LOGO_SIZE = 28;
export const DEFAULT_LOGO_GAP = 9;

/**
 * Safely decodes a base64 string to Uint8Array across Node.js and Browser runtimes.
 */
export function decodeBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safely sanitizes text for PDF rendering using StandardFonts (Helvetica / WinAnsi).
 * - Converts common unicode symbols to WinAnsi equivalents (₹ -> Rs., smart quotes -> standard quotes, dashes, ellipses).
 * - Strips unencodable emojis (like 0x1f366 🍦), surrogate pairs, and out-of-range glyphs that cause WinAnsi crash.
 * - Guarantees that pdf-lib font.encodeText never throws.
 */
export function cleanPDFText(text: unknown, fallback: string = ''): string {
  if (text == null) return fallback;
  const str = String(text);
  if (!str) return fallback;

  // 1. Normalize linebreaks/tabs to spaces and replace common Unicode characters with safe ASCII equivalents
  const normalized = str
    .replace(/[\r\n\t]+/g, ' ')          // Line breaks and tabs
    .replace(/\u20B9/g, 'Rs. ')         // Indian Rupee ₹
    .replace(/\u20AC/g, 'EUR ')         // Euro sign €
    .replace(/[\u2018\u2019]/g, "'")    // Left/Right single quotation mark
    .replace(/[\u201C\u201D]/g, '"')    // Left/Right double quotation mark
    .replace(/\u2013/g, '-')            // En-dash
    .replace(/\u2014/g, '--')           // Em-dash
    .replace(/\u2026/g, '...')          // Horizontal ellipsis
    .replace(/\u00A0/g, ' ')            // Non-breaking space
    .replace(/[\u2022\u2023\u25E6]/g, '-'); // Bullet points

  // 2. Strip any characters that WinAnsi (Windows-1252 / standard fonts) cannot encode.
  // Standard WinAnsi supports 0x20-0x7E (ASCII printable) plus 0xA0-0xFF (Latin-1 supplement).
  // Characters outside this range (such as emojis like 🍦 0x1F366) are stripped.
  const sanitized = normalized
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized || fallback;
}

/**
 * Retrieves the CapFlow logo image bytes.
 * Uses the embedded lossless base64 representation directly for guaranteed
 * zero-network, offline, fast, and serverless reliability.
 * Guaranteed to never throw.
 */
export async function getCapFlowLogoBytes(): Promise<Uint8Array | null> {
  try {
    if (CAPFLOW_LOGO_BASE64) {
      return decodeBase64(CAPFLOW_LOGO_BASE64);
    }
  } catch (err) {
    console.warn('[PDF] Failed to decode embedded CapFlow logo base64:', err);
  }

  // Fallback: In browser runtime, attempt fetching official static asset
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const res = await window.fetch('/capflow-logo.png');
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Ignore fetch error
    }
  }

  return null;
}

/**
 * Attempts to embed the CapFlow logo into a PDFDocument.
 * If the logo fails to load or embed, returns null so that callers
 * can gracefully fall back to rendering only the brand name.
 */
export async function tryEmbedCapFlowLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await getCapFlowLogoBytes();
    if (!bytes || bytes.length === 0) {
      return null;
    }
    const image = await pdfDoc.embedPng(bytes);
    return image;
  } catch (err) {
    console.warn('[PDF] Failed to embed CapFlow logo, falling back to text-only brand:', err);
    return null;
  }
}

export interface DrawCapFlowBrandHeaderOptions {
  page: PDFPage;
  topY: number;
  marginLeft: number;
  logoImage?: PDFImage | null;
  logoSize?: number;
  logoGap?: number;
  title?: string;
  titleSize?: number;
  titleFont: PDFFont;
  titleColor?: Color;
  subtitle: string;
  subtitleSize?: number;
  subtitleFont: PDFFont;
  subtitleColor?: Color;
}

export interface CapFlowBrandHeaderLayout {
  textStartX: number;
  logoDrawn: boolean;
  logoWidth: number;
  logoHeight: number;
}

/**
 * Draws the standard CapFlow brand header on a PDF page.
 * - When logo is provided: draws the logo and offsets the title/subtitle.
 * - When logo is null/undefined: renders only the text starting at marginLeft.
 */
export function drawCapFlowBrandHeader({
  page,
  topY,
  marginLeft,
  logoImage,
  logoSize = DEFAULT_LOGO_SIZE,
  logoGap = DEFAULT_LOGO_GAP,
  title = 'CAPFLOW',
  titleSize = 16,
  titleFont,
  titleColor = rgb(0.09, 0.13, 0.2), // Navy #172033
  subtitle,
  subtitleSize = 7.5,
  subtitleFont,
  subtitleColor = rgb(0.39, 0.4, 0.95), // Indigo #6366F1
}: DrawCapFlowBrandHeaderOptions): CapFlowBrandHeaderLayout {
  const hasLogo = !!logoImage;
  const textStartX = hasLogo ? marginLeft + logoSize + logoGap : marginLeft;

  if (hasLogo && logoImage) {
    // logoY positioned so top of logo aligns with top of title text
    const logoY = topY - 29.5;
    page.drawImage(logoImage, {
      x: marginLeft,
      y: logoY,
      width: logoSize,
      height: logoSize,
    });
  }

  page.drawText(cleanPDFText(title, 'CAPFLOW'), {
    x: textStartX,
    y: topY - 14,
    size: titleSize,
    font: titleFont,
    color: titleColor,
  });

  page.drawText(cleanPDFText(subtitle), {
    x: textStartX,
    y: topY - 26,
    size: subtitleSize,
    font: subtitleFont,
    color: subtitleColor,
  });

  return {
    textStartX,
    logoDrawn: hasLogo,
    logoWidth: hasLogo ? logoSize : 0,
    logoHeight: hasLogo ? logoSize : 0,
  };
}
