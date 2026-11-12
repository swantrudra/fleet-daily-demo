"use client";

import { Calendar, MapPin, Play, Square, TriangleAlert } from "lucide-react";
import { useDriver, type DriverContext } from "@/lib/driver";
import { dateLocale, useT, type TFn } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/date";
import { fmt } from "@/lib/format";
import { num, type Lang } from "@/lib/types";
import { ActionLink, AppHeader, LangSwitch, LogoutButton, SectionTitle, StatusBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { DriverFallback } from "@/components/DriverFallback";

export default function DriverHome() {
  const state = useDriver();
  const { t, lang } = useT(state.status === "ready" ? state.ctx.profile.preferred_language : "mr");
  if (state.status !== "ready") return <DriverFallback status={state.status} t={t} />;
  return <Home ctx={state.ctx} t={t} lang={lang} />;
}

function Home({ ctx, t, lang }: { ctx: DriverContext; t: TFn; lang: Lang }) {
  const { machine, todayLog, openLog, recent } = ctx;
  const unit = t(`unit.${machine.reading_type}`);

  const todayState = !todayLog ? "notStarted" : todayLog.closing_reading == null ? "running" : "ended";
  const canStart = !todayLog && !openLog;
  const canEnd = !!openLog;

  return (
    <>
      <AppHeader subtitle={ctx.profile.full_name} actions={<LogoutButton label={t("home.logout")} />} />
      <main className="flex flex-col gap-6 p-4">
        <Card className="gap-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight">{machine.name}</p>
              <p className="text-sm text-muted-foreground">{t(`type.${machine.type}`)}</p>
            </div>
            <StatusBadge
              status={todayState === "running" ? "running" : todayState === "ended" ? "worked" : "pending"}
              label={t(`home.${todayState}`)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatDate(ctx.today, dateLocale(lang))}
            </span>
            {ctx.siteName && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {ctx.siteName}
              </span>
            )}
          </div>
          {todayLog && todayLog.closing_reading == null && (
            <p className="text-sm text-blue-700">{t("home.startedAt", { time: formatTime(todayLog.started_at) })}</p>
          )}
        </Card>

        <div className="flex flex-col gap-2">
          <ActionLink href="/driver/start" enabled={canStart} variant="primary" icon={Play}>
            {t("home.startShift")}
          </ActionLink>
          <ActionLink href="/driver/end" enabled={canEnd} variant="dark" icon={Square}>
            {t("home.endShift")}
          </ActionLink>
          <ActionLink href="/driver/breakdown" enabled variant="danger" icon={TriangleAlert}>
            {t("home.breakdown")}
          </ActionLink>
        </div>

        <section className="flex flex-col gap-2">
          <SectionTitle>{t("home.last3")}</SectionTitle>
          <Card className="gap-0 py-0">
            {recent.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("home.noEntries")}</p>}
            {recent.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDate(log.log_date, dateLocale(lang))}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {fmt(num(log.opening_reading))} → {log.closing_reading == null ? "…" : fmt(num(log.closing_reading))}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {log.worked != null && (
                    <p className="text-sm font-semibold tabular-nums">
                      {fmt(num(log.worked))} <span className="font-normal text-muted-foreground">{unit}</span>
                    </p>
                  )}
                  <StatusBadge status={log.status ?? "running"} label={t(`status.${log.status ?? "running"}`)} />
                </div>
              </div>
            ))}
          </Card>
        </section>

        <LangSwitch lang={lang} />
      </main>
    </>
  );
}
