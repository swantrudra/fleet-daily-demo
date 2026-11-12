"use client";

import { useState } from "react";

/** Small photo thumbnail; tap to see it full screen. */
export function PhotoThumb({ url, label = "Meter photo", size = 64 }: { url: string | null; label?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400"
      >
        No photo
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${label}`}
        style={{ width: size, height: size }}
        className="shrink-0 overflow-hidden rounded-lg border-2 border-slate-300"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-[85dvh] max-w-full rounded-lg" />
          <button type="button" className="mt-4 h-12 rounded-xl bg-white px-8 text-lg font-bold text-ink">
            Close
          </button>
        </div>
      )}
    </>
  );
}
