"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDriver, type DriverContext } from "@/lib/driver";
import { dateLocale, useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import { formatDate } from "@/lib/date";
import { num, type Lang, type LogStatus, type ShiftLog } from "@/lib/types";
import { Notice, NumberInput, PhotoPicker, STATUS_STYLE, SubmitButton, TopBar, fmt, parseNum } from "@/components/ui";
import { DriverFallback } from "@/components/DriverFallback";

export default function EndShiftPage() {
  const state = useDriver();
  const { t, lang } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} />;
  if (!state.ctx.openLog) {
    return (
      <>
        <TopBar title={t("end.title")} back="/driver" />
        <main className="flex flex-col gap-4 p-4">
          <Notice kind="warn">{t("end.noOpen")}</Notice>
          <Link href="/driver" className="text-center text-lg font-bold underline">
            {t("common.home")}
          </Link>
        </main>
      </>
    );
  }
  return <EndForm ctx={state.ctx} log={state.ctx.openLog} t={t} lang={lang} />;
}

const STATUSES: LogStatus[] = ["worked", "idle", "breakdown"];

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
      <TopBar title={t("end.title")} back="/driver" />
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="text-sm font-semibold text-slate-300">
            {machine.name} · {t("end.opening")}
            {log.log_date !== ctx.today && ` · ${formatDate(log.log_date, dateLocale(lang))}`}
          </p>
          <p className="text-3xl font-extrabold tabular-nums">
            {fmt(opening)} {unit}
          </p>
        </div>

        <NumberInput label={`${t("end.closing")} (${unit})`} value={reading} onChange={setReading} disabled={busy} />
        {tooLow && <Notice kind="error">{t("end.tooLow", { opening: fmt(opening) })}</Notice>}

        <div className={`rounded-2xl border-4 p-4 text-center ${worked != null ? "border-green-600 bg-green-50" : "border-slate-300 bg-white"}`}>
          <p className="text-base font-bold text-slate-600">{t("end.result")}</p>
          <p className="text-5xl font-extrabold tabular-nums">
            {worked != null ? fmt(worked) : "—"} <span className="text-2xl">{unit}</span>
          </p>
        </div>

        <NumberInput
          label={`${t("end.diesel")} · ${t("end.optional")}`}
          value={diesel}
          onChange={setDiesel}
          disabled={busy}
        />

        <fieldset>
          <legend className="mb-2 text-base font-bold">{t("end.status")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={`flex h-20 flex-col items-center justify-center rounded-xl border-4 text-base font-bold ${
                  status === s ? `${STATUS_STYLE[s].badge} border-ink` : "border-slate-300 bg-white"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {STATUS_STYLE[s].icon}
                </span>
                {t(`status.${s}`)}
              </button>
            ))}
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

        <SubmitButton disabled={busy || tooLow}>
          {phase === "uploading" ? t("common.uploading") : phase === "saving" ? t("common.saving") : `■ ${t("end.submit")}`}
        </SubmitButton>
      </form>
    </>
  );
}
