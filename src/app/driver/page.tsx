"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDriver, type DriverContext } from "@/lib/driver";
import { dateLocale, useT, type TFn } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/date";
import { num, type Lang } from "@/lib/types";
import { Badge, LangSwitch, TopBar, fmt } from "@/components/ui";
import { DriverFallback } from "@/components/DriverFallback";


export default function DriverHome() {
  const state = useDriver();
  const { t, lang } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} />;
  return <Home ctx={state.ctx} t={t} lang={lang} />;
}

function Home({ ctx, t, lang }: { ctx: DriverContext; t: TFn; lang: Lang }) {
  const router = useRouter();
  const { machine, todayLog, openLog, recent } = ctx;
  const unit = t(`unit.${machine.reading_type}`);

  const todayState = !todayLog ? "notStarted" : todayLog.closing_reading == null ? "running" : "ended";
  const canStart = !todayLog && !openLog;
  const canEnd = !!openLog;

  async function logout() {
    await supabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <TopBar
        title={t("app.name")}
        right={
          <button onClick={logout} className="h-12 rounded-lg px-3 text-sm font-semibold text-slate-300">
            {t("home.logout")}
          </button>
        }
      />
      <main className="flex flex-col gap-4 p-4">
        <section className="rounded-2xl border-2 border-slate-300 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-4xl font-extrabold">{machine.name}</p>
              <p className="text-lg font-semibold text-slate-600">
                {t(`type.${machine.type}`)}
                {ctx.siteName ? ` · ${ctx.siteName}` : ""}
              </p>
            </div>
            <span className="text-3xl" aria-hidden>
              🚜
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <p className="text-base font-semibold">
              {t("home.today")}: {formatDate(ctx.today, dateLocale(lang))}
            </p>
            <Badge
              status={todayState === "running" ? "running" : todayState === "ended" ? "worked" : "idle"}
              label={t(`home.${todayState}`)}
            />
          </div>
          {todayLog && todayLog.closing_reading == null && (
            <p className="mt-2 text-sm text-slate-600">{t("home.startedAt", { time: formatTime(todayLog.started_at) })}</p>
          )}
        </section>

        <BigLink href="/driver/start" enabled={canStart} className="bg-green-700" icon="▶">
          {t("home.startShift")}
        </BigLink>
        <BigLink href="/driver/end" enabled={canEnd} className="bg-ink" icon="■">
          {t("home.endShift")}
        </BigLink>
        <BigLink href="/driver/breakdown" enabled className="bg-red-600" icon="⚠️">
          {t("home.breakdown")}
        </BigLink>

        <section>
          <h2 className="mb-2 text-lg font-bold">{t("home.last3")}</h2>
          {recent.length === 0 && <p className="text-slate-600">{t("home.noEntries")}</p>}
          <ul className="flex flex-col gap-2">
            {recent.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white p-3">
                <div>
                  <p className="font-bold">{formatDate(log.log_date, dateLocale(lang))}</p>
                  <p className="text-sm tabular-nums text-slate-600">
                    {fmt(num(log.opening_reading))} → {log.closing_reading == null ? "…" : fmt(num(log.closing_reading))}
                  </p>
                </div>
                <div className="text-right">
                  {log.worked != null && (
                    <p className="text-lg font-extrabold tabular-nums">
                      {fmt(num(log.worked))} {unit}
                    </p>
                  )}
                  <Badge status={log.status ?? "running"} label={t(`status.${log.status ?? "running"}`)} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <LangSwitch lang={lang} />
      </main>
    </>
  );
}

function BigLink({
  href,
  enabled,
  className,
  icon,
  children,
}: {
  href: string;
  enabled: boolean;
  className: string;
  icon: string;
  children: React.ReactNode;
}) {
  const base = "flex h-20 items-center gap-4 rounded-2xl px-6 text-2xl font-extrabold shadow";
  if (!enabled) {
    return (
      <div aria-disabled className={`${base} bg-slate-300 text-slate-500 shadow-none`}>
        <span aria-hidden>{icon}</span>
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className={`${base} ${className} text-white active:scale-[0.98]`}>
      <span aria-hidden>{icon}</span>
      {children}
    </Link>
  );
}
