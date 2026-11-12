"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { homeFor, mobileToEmail, pinToPassword, type Role } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch, Logo, Notice, SubmitButton } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang } = useT("mr");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mobile.length !== 10) return setError(t("login.badMobile"));
    if (pin.length !== 4) return setError(t("login.badPin"));

    setBusy(true);
    // DEMO-ONLY: mobile + PIN mapped to Supabase email/password (see src/lib/auth.ts).
    const { data, error } = await supabase().auth.signInWithPassword({
      email: mobileToEmail(mobile),
      password: pinToPassword(pin),
    });
    if (error || !data.user) {
      setBusy(false);
      setError(error?.message === "Invalid login credentials" ? t("login.failed") : t("common.error"));
      return;
    }
    router.replace(homeFor(data.user.app_metadata?.role as Role | undefined));
  }

  const inputClass =
    "h-16 w-full rounded-xl border-2 border-slate-400 bg-white px-4 text-2xl font-bold tracking-widest focus:border-ink focus:outline-none";

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <div className="mt-8 flex flex-col items-center gap-3">
        <Logo size={80} />
        <h1 className="text-3xl font-extrabold">{t("app.name")}</h1>
      </div>

      <LangSwitch lang={lang} />

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="block">
          <span className="mb-2 block text-base font-bold">{t("login.mobile")}</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className={inputClass}
            placeholder="98765 43210"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-base font-bold">{t("login.pin")}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={inputClass}
            placeholder="••••"
          />
        </label>

        {error && <Notice kind="error">{error}</Notice>}

        <SubmitButton disabled={busy}>{busy ? t("login.loading") : t("login.submit")}</SubmitButton>
      </form>
    </main>
  );
}
