"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { useDriver, type DriverContext } from "@/lib/driver";
import { useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import { fmt, parseNum } from "@/lib/format";
import { num } from "@/lib/types";
import { AppHeader, Notice, NumberInput, PhotoPicker, SubmitButton } from "@/components/common";
import { Card } from "@/components/ui/card";
import { DriverFallback } from "@/components/DriverFallback";

export default function StartShiftPage() {
  const state = useDriver();
  const { t } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} back="/driver" />;
  return <StartForm ctx={state.ctx} t={t} />;
}

function StartForm({ ctx, t }: { ctx: DriverContext; t: TFn }) {
  const router = useRouter();
  const { machine, profile } = ctx;
  const unit = t(`unit.${machine.reading_type}`);
  const lastClosed = ctx.recent.find((l) => l.closing_reading != null);
  const lastClosing = lastClosed ? num(lastClosed.closing_reading) : null;

  const [reading, setReading] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const opening = parseNum(reading);
  const mismatch = opening != null && lastClosing != null && Math.abs(opening - lastClosing) > 0.001;
  const busy = phase !== "idle";

  if (ctx.todayLog || ctx.openLog) {
    return (
      <>
        <AppHeader title={t("start.title")} subtitle={machine.name} back="/driver" />
        <main className="flex flex-col gap-4 p-4">
          <Notice kind="warn">{ctx.openLog ? t("home.running") : t("start.alreadyLogged")}</Notice>
          <Link href="/driver" className="text-center text-sm font-medium text-primary hover:underline">
            {t("common.home")}
          </Link>
        </main>
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (opening == null) return setError(t("common.enterNumber"));

    try {
      let photoPath: string | null = null;
      if (photo) {
        setPhase("uploading");
        photoPath = await uploadPhoto(photo, machine.company_id, machine.id, "start");
      }
      setPhase("saving");
      const { error } = await supabase().from("shift_logs").insert({
        company_id: machine.company_id,
        machine_id: machine.id,
        driver_id: profile.id,
        site_id: machine.current_site_id,
        log_date: ctx.today,
        opening_reading: opening,
        start_photo_path: photoPath,
        started_at: new Date().toISOString(),
      });
      if (error) {
        setPhase("idle");
        return setError(error.code === "23505" ? t("start.alreadyLogged") : t("common.error"));
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
      <AppHeader title={t("start.title")} subtitle={machine.name} back="/driver" />
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <Card className="gap-1 px-4">
          <p className="text-xs font-medium text-muted-foreground">{t("start.lastClosing")}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {lastClosing != null ? (
              <>
                {fmt(lastClosing)} <span className="text-base font-normal text-muted-foreground">{unit}</span>
              </>
            ) : (
              <span className="text-base font-normal text-muted-foreground">{t("start.noPrevious")}</span>
            )}
          </p>
        </Card>

        <NumberInput id="opening" label={t("start.opening")} unit={unit} value={reading} onChange={setReading} disabled={busy} />
        {mismatch && <Notice kind="warn">{t("start.mismatch", { last: fmt(lastClosing!) })}</Notice>}

        <PhotoPicker
          label={t("photo.meter")}
          takeLabel={t("photo.take")}
          retakeLabel={t("photo.retake")}
          file={photo}
          onChange={setPhoto}
          disabled={busy}
        />

        {error && <Notice kind="error">{error}</Notice>}
        {phase === "done" && <Notice kind="success">{t("start.done")}</Notice>}

        <SubmitButton disabled={busy} busy={phase === "uploading" || phase === "saving"} icon={Play}>
          {phase === "uploading" ? t("common.uploading") : phase === "saving" ? t("common.saving") : t("start.submit")}
        </SubmitButton>
      </form>
    </>
  );
}
