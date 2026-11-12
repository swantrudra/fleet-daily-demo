"use client";

import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Small photo thumbnail; tap to see it large. */
export function PhotoThumb({ url, label = "Meter photo", size = 44 }: { url: string | null; label?: string; size?: number }) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-zinc-300"
        title="No photo"
      >
        <ImageOff className="size-4" />
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Enlarge ${label}`}
          style={{ width: size, height: size }}
          className="shrink-0 overflow-hidden rounded-lg border bg-zinc-100 transition-opacity hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-full w-full object-cover" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-3 p-3 sm:max-w-lg">
        <DialogTitle className="text-sm font-medium">{label}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="max-h-[75dvh] w-full rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}
