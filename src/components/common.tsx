"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CirclePlay,
  Info,
  LoaderCircle,
  LogOut,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { LANGS, setLang } from "@/lib/i18n";
import type { Lang, LogStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Icon = ComponentType<{ className?: string }>;

/* ------------------------------------------------------------------ brand */

export function Logo({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icons/icon.svg" alt="" width={size} height={size} className="rounded-lg" />;
}

/* ----------------------------------------------------------------- header */

export function useLogout() {
  const router = useRouter();
  return async () => {
    await supabase().auth.signOut();
    router.replace("/login");
  };
}

export function LogoutButton({ label = "Log out" }: { label?: string }) {
  const logout = useLogout();
  return (
    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground" onClick={logout} aria-label={label} title={label}>
      <LogOut className="size-5" />
    </Button>
  );
}

/** Sticky app header: logo (or back link) + title, actions on the right, optional second row. */
export function AppHeader({
  title = "Fleet Daily",
  subtitle,
  back,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  back?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="flex h-14 items-center gap-2 px-2">
        {back ? (
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href={back} aria-label="Back">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        ) : (
          <div className="pl-2">
            <Logo />
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center">{actions}</div>
      </div>
      {children && <div className="px-4 pb-3">{children}</div>}
    </header>
  );
}

/* --------------------------------------------------------------- feedback */

const CALLOUT = {
  error: { cls: "border-red-200 bg-red-50 text-red-700", icon: CircleAlert },
  success: { cls: "border-green-200 bg-green-50 text-green-700", icon: CircleCheck },
  warn: { cls: "border-amber-200 bg-amber-50 text-amber-800", icon: TriangleAlert },
  info: { cls: "border-border bg-muted text-foreground", icon: Info },
} satisfies Record<string, { cls: string; icon: Icon }>;

export function Notice({ kind, children }: { kind: keyof typeof CALLOUT; children: ReactNode }) {
  const { cls, icon: I } = CALLOUT[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm font-medium", cls)}>
      <I className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- status */

export type BadgeStatus = LogStatus | "missing" | "running" | "inactive" | "pending";

export const STATUS_STYLE: Record<BadgeStatus, { cls: string; icon: Icon }> = {
  worked: { cls: "bg-green-50 text-green-700 ring-green-600/20", icon: CircleCheck },
  idle: { cls: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: CirclePause },
  breakdown: { cls: "bg-red-50 text-red-700 ring-red-600/20", icon: TriangleAlert },
  missing: { cls: "bg-red-50 text-red-700 ring-red-600/20", icon: CircleAlert },
  running: { cls: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: CirclePlay },
  inactive: { cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20", icon: CircleMinus },
  pending: { cls: "bg-zinc-100 text-zinc-600 ring-zinc-500/20", icon: CircleDashed },
};

export function StatusBadge({ status, label, className }: { status: BadgeStatus; label: string; className?: string }) {
  const { cls, icon: I } = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium ring-1 ring-inset", cls, className)}>
      <I className="size-3.5" />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------- inputs */

export function LangSwitch({ lang }: { lang: Lang }) {
  return (
    <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)} className="w-full">
      <TabsList className="h-11! w-full bg-zinc-100">
        {LANGS.map((l) => (
          <TabsTrigger key={l.code} value={l.code} className="h-9 text-sm data-active:bg-white">
            {l.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function NumberInput({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="h-14 rounded-xl bg-white pr-16 text-2xl font-semibold tabular-nums md:text-2xl"
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
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
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-40 w-full rounded-xl border object-cover" />
      )}
      <label
        className={cn(
          "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Camera className="size-4" />
        {file ? retakeLabel : takeLabel}
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

/* ---------------------------------------------------------------- buttons */

const ACTION_VARIANTS = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  dark: "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100",
};

/** Full-width driver action: icon + label, 56px tall. Renders a link, or a muted block when disabled. */
export function ActionLink({
  href,
  enabled,
  variant,
  icon: I,
  children,
}: {
  href: string;
  enabled: boolean;
  variant: keyof typeof ACTION_VARIANTS;
  icon: Icon;
  children: ReactNode;
}) {
  const base = "flex h-14 w-full items-center gap-3 rounded-xl px-4 text-base font-medium transition-all";
  if (!enabled) {
    return (
      <div aria-disabled className={cn(base, "cursor-not-allowed bg-zinc-100 text-zinc-400")}>
        <I className="size-5" />
        <span className="flex-1">{children}</span>
      </div>
    );
  }
  return (
    <Link href={href} className={cn(base, ACTION_VARIANTS[variant], "active:scale-[0.99]")}>
      <I className="size-5" />
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4 opacity-60" />
    </Link>
  );
}

export function SubmitButton({
  children,
  disabled,
  busy,
  variant = "primary",
  icon: I,
}: {
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  variant?: keyof typeof ACTION_VARIANTS;
  icon?: Icon;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-medium transition-all active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        ACTION_VARIANTS[variant],
      )}
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : I && <I className="size-4" />}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- layout */

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h2>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------- skeletons */

export function DriverSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy aria-label="Loading">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="mt-4 h-4 w-32" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="size-11 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
