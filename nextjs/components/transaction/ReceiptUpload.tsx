"use client";

import { useRef, useState } from "react";
import { Camera, X, ImageIcon, RefreshCw } from "lucide-react";

interface ReceiptUploadProps {
  /** Current base64 data URL, or undefined when no receipt is attached. */
  value?: string;
  /** Called with the new base64 data URL on selection, or undefined on clear. */
  onChange: (base64: string | undefined) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be re-selected if needed
    e.target.value = "";

    if (file.size > MAX_BYTES) {
      console.warn(
        `[ReceiptUpload] File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Max 5 MB.`
      );
      setSizeError(true);
      return;
    }

    setSizeError(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSizeError(false);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {/* 1. Camera File Input (triggers camera on mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Capture receipt with camera"
      />

      {/* 2. Gallery / File Picker Input (triggers photo library on mobile & file picker on PC) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload receipt from gallery or files"
      />

      {value ? (
        /* ── Thumbnail view when receipt is attached ── */
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div
            className="relative flex-shrink-0 rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm"
            style={{ width: 72, height: 72 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Receipt thumbnail"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                Receipt Attached
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Replace or remove image
              </p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] hover:underline"
              >
                <Camera size={12} />
                <span>Camera</span>
              </button>

              <span className="text-[var(--border-color)]">|</span>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] hover:underline"
              >
                <ImageIcon size={12} />
                <span>Gallery</span>
              </button>

              <span className="text-[var(--border-color)]">|</span>

              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#EF4444] hover:underline"
              >
                <X size={12} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Two Clean Options: Capture Photo & Upload from Gallery ── */
        <div className="grid grid-cols-2 gap-2">
          {/* Option 1: Capture Photo */}
          <button
            type="button"
            onClick={() => {
              setSizeError(false);
              cameraInputRef.current?.click();
            }}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/5 transition-all text-xs font-semibold text-[var(--text-primary)] active:scale-[0.98]"
          >
            <Camera size={15} className="text-[#6366F1]" />
            <span>Capture Photo</span>
          </button>

          {/* Option 2: Upload Photo / Gallery */}
          <button
            type="button"
            onClick={() => {
              setSizeError(false);
              galleryInputRef.current?.click();
            }}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/5 transition-all text-xs font-semibold text-[var(--text-primary)] active:scale-[0.98]"
          >
            <ImageIcon size={15} className="text-[#6366F1]" />
            <span>Upload Photo</span>
          </button>
        </div>
      )}

      {/* Size error alert if > 5MB */}
      {sizeError && (
        <p className="text-[11px] font-semibold text-[#EF4444]">
          Image too large. Maximum size is 5MB.
        </p>
      )}
    </div>
  );
}
