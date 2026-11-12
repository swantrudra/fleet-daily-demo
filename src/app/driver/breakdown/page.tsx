"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDriver, type DriverContext } from "@/lib/driver";
import { useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import { Notice, PhotoPicker, SubmitButton, TopBar } from "@/components/ui";
import { DriverFallback } from "@/components/DriverFallback";

export default function BreakdownPage() {
  const state = useDriver();
  const { t } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} />;
  return <BreakdownForm ctx={state.ctx} t={t} />;
}

function BreakdownForm({ ctx, t }: { ctx: DriverContext; t: TFn }) {
  const router = useRouter();
  const { machine, profile } = ctx;
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let photoPath: string | null = null;
      if (photo) {
        setPhase("uploading");
        photoPath = await uploadPhoto(photo, machine.company_id, machine.id, "breakdown");
      }
      setPhase("saving");
      const { error } = await supabase().from("breakdowns").insert({
        company_id: machine.company_id,
        machine_id: machine.id,
        driver_id: profile.id,
        reported_at: new Date().toISOString(),
        photo_path: photoPath,
        note: note.trim() || null,
        status: "open",
      });
      if (error) {
        setPhase("idle");
        return setError(t("common.error"));
      }
      setPhase("done");
      setTimeout(() => router.replace("/driver"), 1800);
    } catch {
      setPhase("idle");
      setError(t("common.error"));
    }
  }

  return (
    <>
      <TopBar title={t("bd.title")} back="/driver" />
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <div className="rounded-2xl bg-red-600 p-4 text-white">
          <p className="text-3xl font-extrabold">⚠️ {machine.name}</p>
        </div>

        <PhotoPicker
          label={t("photo.optional")}
          takeLabel={t("photo.take")}
          retakeLabel={t("photo.retake")}
          file={photo}
          onChange={setPhoto}
          disabled={busy}
        />

        <label className="block">
          <span className="mb-2 block text-base font-bold">
            {t("bd.note")} <span className="font-normal text-slate-600">· {t("end.optional")}</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={300}
            placeholder={t("bd.notePlaceholder")}
            className="w-full rounded-xl border-2 border-slate-400 bg-white p-3 text-lg focus:border-ink focus:outline-none"
          />
        </label>

        {error && <Notice kind="error">{error}</Notice>}
        {phase === "done" && <Notice kind="success">{t("bd.done")}</Notice>}

        <SubmitButton disabled={busy} color="red">
          {phase === "uploading" ? t("common.uploading") : phase === "saving" ? t("common.saving") : t("bd.submit")}
        </SubmitButton>
      </form>
    </>
  );
}
