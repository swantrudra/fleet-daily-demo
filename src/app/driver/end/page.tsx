"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { useDriver, type DriverContext } from "@/lib/driver";
import { dateLocale, useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import { formatDate } from "@/lib/date";
import { fmt, parseNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { num, type Lang, type LogStatus, type ShiftLog } from "@/lib/types";
import { AppHeader, Notice, NumberInput, PhotoPicker, STATUS_STYLE, SubmitButton } from "@/components/common";
import { Card } from "@/components/ui/card";
import { DriverFallback } from "@/components/DriverFallback";

export default function EndShiftPage() {
  const state = useDriver();
  const { t, lang } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} back="/driver" />;
  if (!state.ctx.openLog) {
    return (
      <>
        <AppHeader title={t("end.title")} subtitle={state.ctx.machine.name} back="/driver" />
        <main className="flex flex-col gap-4 p-4">
          <Notice kind="warn">{t("end.noOpen")}</Notice>
          <Link href="/driver" className="text-center text-sm font-medium text-primary hover:underline">
            {t("common.home")}
          </Link>
        </main>
      </>
    );
  }
  return <EndForm ctx={state.ctx} log={state.ctx.openLog} t={t} lang={lang} />;
}

const STATUSES: LogStatus[] = ["worked", "idle", "breakdown"];
const SELECTED_RING: Record<LogStatus, string> = {
  worked: "ring-green-600",
  idle: "ring-amber-500",
  breakdown: "ring-red-600",
};

function EndForm({ ctx, log, t, lang }: { ctx: DriverContext; log: ShiftLog; t: TFn; lang: Lang }) {
  const router = useRouter();
  const { machine } = ctx;
  const unit = t(`unit.${machine.reading_type}`);
  const opening = num(log.opening_reading);

  const [reading, setReading] = useState("");
  const [diesel, setDiesel] = useState("");
  const [status, setStatus] = useState<LogStatus>("worked");
  const [photo, setPhoto] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const closing = parseNum(reading);
  const tooLow = closing != null && closing < opening;
  const worked = closing != null && !tooLow ? closing - opening : null;
  const busy = phase !== "idle";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (closing == null) return setError(t("common.enterNumber"));
    if (tooLow) return setError(t("end.tooLow", { opening: fmt(opening) }));
    const dieselLitres = diesel.trim() === "" ? 0 : parseNum(diesel);
    if (dieselLitres == null) return setError(t("common.enterNumber"));

    try {
      let photoPath: string | null = null;
      if (photo) {
        setPhase("uploading");
        photoPath = await uploadPhoto(photo, machine.company_id, machine.id, "end");
      }
      setPhase("saving");
      const { error } = await supabase()
        .from("shift_logs")
        .update({
          closing_reading: closing,
          diesel_litres: dieselLitres,
          status,
          end_photo_path: photoPath,
          ended_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      if (error) {
        setPhase("idle");
        return setError(t("common.error"));
      }
      setPhase("done");
      setTimeout(() => router.replace("/driver"), 1200);
    } catch {
      setPhase("idle");
      setError(t("common.error"));
    }
  }

  return (
    <>
      <AppHeader title={t("end.title")} subtitle={machine.name} back="/driver" />
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <Card className="grid grid-cols-2 gap-0 divide-x py-0">
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("end.opening")}
              {log.log_date !== ctx.today && ` · ${formatDate(log.log_date, dateLocale(lang))}`}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
              {fmt(opening)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
          <div className={cn("p-4 transition-colors", worked != null && "bg-blue-50/60")}>
            <p className="text-xs font-medium text-muted-foreground">{t("end.result")}</p>
            <p className={cn("mt-1 text-xl font-semibold tracking-tight tabular-nums", worked != null ? "text-blue-700" : "text-zinc-300")}>
              {worked != null ? fmt(worked) : "—"} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </Card>

        <NumberInput
          id="closing"
          label={t("end.closing")}
          unit={unit}
          value={reading}
          onChange={setReading}
          disabled={busy}
          invalid={tooLow}
        />
        {tooLow && <Notice kind="error">{t("end.tooLow", { opening: fmt(opening) })}</Notice>}

        <NumberInput
          id="diesel"
          label={`${t("end.diesel")} · ${t("end.optional")}`}
          unit={t("unit.litres")}
          value={diesel}
          onChange={setDiesel}
          disabled={busy}
        />

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t("end.status")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => {
              const { cls, icon: I } = STATUS_STYLE[s];
              const selected = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus(s)}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[13px] leading-tight font-medium transition-all active:scale-[0.98]",
                    selected ? cn(cls, "ring-2 ring-inset", SELECTED_RING[s]) : "border bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <I className="size-5" />
                  <span className="text-center">{t(`status.${s}`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <PhotoPicker
          label={t("photo.meter")}
          takeLabel={t("photo.take")}
          retakeLabel={t("photo.retake")}
          file={photo}
          onChange={setPhoto}
          disabled={busy}
        />

        {error && <Notice kind="error">{error}</Notice>}
        {phase === "done" && <Notice kind="success">{t("end.done")}</Notice>}

        <SubmitButton disabled={busy || tooLow} busy={phase === "uploading" || phase === "saving"} variant="dark" icon={Square}>
          {phase === "uploading" ? t("common.uploading") : phase === "saving" ? t("common.saving") : t("end.submit")}
        </SubmitButton>
      </form>
    </>
  );
}
