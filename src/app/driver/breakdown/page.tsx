"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, TriangleAlert } from "lucide-react";
import { useDriver, type DriverContext } from "@/lib/driver";
import { useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import { AppHeader, Notice, PhotoPicker, SubmitButton } from "@/components/common";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DriverFallback } from "@/components/DriverFallback";

export default function BreakdownPage() {
  const state = useDriver();
  const { t } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} back="/driver" />;
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
      <AppHeader title={t("bd.title")} subtitle={machine.name} back="/driver" />
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <TriangleAlert className="size-5 shrink-0" />
          <p className="text-base font-semibold">{machine.name}</p>
        </div>

        <PhotoPicker
          label={t("photo.optional")}
          takeLabel={t("photo.take")}
          retakeLabel={t("photo.retake")}
          file={photo}
          onChange={setPhoto}
          disabled={busy}
        />

        <div className="space-y-2">
          <Label htmlFor="note">
            {t("bd.note")} <span className="font-normal text-muted-foreground">· {t("end.optional")}</span>
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={300}
            placeholder={t("bd.notePlaceholder")}
            className="min-h-24 rounded-xl bg-white text-base md:text-base"
          />
        </div>

        {error && <Notice kind="error">{error}</Notice>}
        {phase === "done" && <Notice kind="success">{t("bd.done")}</Notice>}

        <SubmitButton disabled={busy} busy={phase === "uploading" || phase === "saving"} variant="danger" icon={Send}>
          {phase === "uploading" ? t("common.uploading") : phase === "saving" ? t("common.saving") : t("bd.submit")}
        </SubmitButton>
      </form>
    </>
  );
}
