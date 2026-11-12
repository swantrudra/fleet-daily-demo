"use client";

import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { LANGS, setLang } from "@/lib/i18n";
import type { Lang, LogStatus } from "@/lib/types";

export function Logo({ size = 36 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icons/icon.svg" alt="" width={size} height={size} className="rounded-lg" />;
}

export function TopBar({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 bg-ink px-3 text-white">
      {back ? (
        <Link href={back} aria-label="Back" className="-ml-1 flex h-12 w-12 items-center justify-center text-3xl">
          ←
        </Link>
      ) : (
        <Logo size={32} />
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}

const NOTICE_STYLES = {
  error: "bg-red-50 border-red-600 text-red-800",
  success: "bg-green-50 border-green-600 text-green-800",
  warn: "bg-amber-50 border-amber-500 text-amber-900",
};

export function Notice({ kind, children }: { kind: keyof typeof NOTICE_STYLES; children: ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border-l-8 p-4 text-base font-semibold ${NOTICE_STYLES[kind]}`}>
      {children}
    </div>
  );
}

export function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`h-12 rounded-xl border-2 text-base font-bold ${
            lang === l.code ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export const STATUS_STYLE: Record<LogStatus | "missing" | "running" | "inactive", { badge: string; icon: string }> = {
  worked: { badge: "bg-green-600 text-white", icon: "✅" },
  idle: { badge: "bg-amber-400 text-ink", icon: "⏸" },
  breakdown: { badge: "bg-red-600 text-white", icon: "⚠️" },
  missing: { badge: "bg-red-600 text-white", icon: "❗" },
  running: { badge: "bg-sky-600 text-white", icon: "▶" },
  inactive: { badge: "bg-slate-400 text-white", icon: "–" },
};

export function Badge({ status, label }: { status: keyof typeof STATUS_STYLE; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[status].badge}`}>
      {label}
    </span>
  );
}

/** Camera input with a preview of the chosen photo. */
export function PhotoPicker({
  label,
  takeLabel,
  retakeLabel,
  file,
  onChange,
  disabled,
}: {
  label: string;
  takeLabel: string;
  retakeLabel: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div>
      <p className="mb-2 text-base font-bold">{label}</p>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mb-2 h-44 w-full rounded-xl border-2 border-slate-300 object-cover" />
      )}
      <label
        className={`flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-500 bg-white text-lg font-bold ${
          disabled ? "opacity-50" : "active:bg-slate-200"
        }`}
      >
        📷 {file ? retakeLabel : takeLabel}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export function SubmitButton({ children, disabled, color = "ink" }: { children: ReactNode; disabled?: boolean; color?: "ink" | "red" | "green" }) {
  const colors = { ink: "bg-ink", red: "bg-red-600", green: "bg-green-700" };
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`h-16 w-full rounded-2xl text-xl font-extrabold text-white shadow ${colors[color]} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="h-16 w-full rounded-xl border-2 border-slate-400 bg-white px-4 text-3xl font-bold tabular-nums focus:border-ink focus:outline-none"
      />
      {hint && <span className="mt-1 block text-sm text-slate-600">{hint}</span>}
    </label>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10 text-lg font-semibold text-slate-600">{label}</div>
  );
}

/** Parses a user-typed number; returns null if empty/invalid. */
export function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Trims float noise: 6.199999 → 6.2 */
export function fmt(n: number, digits = 1): string {
  return Number(n.toFixed(digits)).toLocaleString("en-IN");
}
