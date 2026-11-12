"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { homeFor, mobileToEmail, pinToPassword, type Role } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch, Logo, Notice, SubmitButton } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const inputClass = "h-12 rounded-xl bg-white text-lg font-medium tracking-wider md:text-lg";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={48} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.title")}</p>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">{t("login.mobile")}</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={inputClass}
                placeholder="98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">{t("login.pin")}</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass}
                placeholder="••••"
              />
            </div>

            {error && <Notice kind="error">{error}</Notice>}

            <SubmitButton disabled={busy} busy={busy}>
              {busy ? t("login.loading") : t("login.submit")}
              {!busy && <ArrowRight className="size-4" />}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <LangSwitch lang={lang} />
    </main>
  );
}
