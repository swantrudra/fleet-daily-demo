"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, Fuel, MessageCircle, Phone, RefreshCw, TriangleAlert } from "lucide-react";
import { addDays, formatDate, formatTime, todayIST, yesterdayIST } from "@/lib/date";
import { loadReport, useClientValue, whatsappUrl, type MachineRow, type Report } from "@/lib/owner";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { num } from "@/lib/types";
import { AppHeader, ListSkeleton, LogoutButton, Notice, SectionTitle, StatusBadge } from "@/components/common";
import { PhotoThumb } from "@/components/Photo";
import { MarkFixedButton } from "@/components/MarkFixed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABEL = { excavator: "Excavator", jcb: "JCB / Backhoe", tipper: "Tipper", roller: "Roller", other: "Other" };
const STATUS_LABEL = { worked: "Worked", idle: "Idle", breakdown: "Breakdown", missing: "Missing", inactive: "Inactive" };

export default function MorningReport() {
  const yesterday = useClientValue(yesterdayIST);
  const today = useClientValue(todayIST);
  const [picked, setPicked] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<{ key: string; report?: Report; error?: boolean } | null>(null);

  const date = picked ?? yesterday;
  const key = `${date}|${refreshKey}`;
  const loading = result?.key !== key;

  useEffect(() => {
    if (!date) return;
    let alive = true;
    loadReport(date)
      .then((report) => alive && setResult({ key, report }))
      .catch(() => alive && setResult({ key, error: true }));
    return () => {
      alive = false;
    };
  }, [date, key]);

  const report = result?.report;

  return (
    <>
      <AppHeader
        title="Morning Report"
        subtitle={date ? formatDate(date) : undefined}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={cn("size-5", loading && "animate-spin")} />
            </Button>
            <LogoutButton />
          </>
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-lg"
            onClick={() => date && setPicked(addDays(date, -1))}
            disabled={!date}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={date ?? ""}
            max={today ?? undefined}
            onChange={(e) => e.target.value && setPicked(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg bg-white text-sm font-medium md:text-sm"
            aria-label="Report date"
          />
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-lg"
            onClick={() => date && setPicked(addDays(date, 1))}
            disabled={!date || (!!today && date >= today)}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </AppHeader>

      <main className="flex flex-col gap-6 p-4">
        {!report && loading && <ReportSkeleton />}
        {result?.error && !loading && <Notice kind="error">Could not load the report. Check the network and tap refresh.</Notice>}

        {report && (
          <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
            <OpenBreakdowns report={report} onFixed={() => setRefreshKey((k) => k + 1)} />
            <Summary report={report} />
            <Button asChild variant="outline" className="h-11 gap-2 rounded-xl bg-white text-sm font-medium">
              <a href={whatsappUrl(report)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4 text-green-600" />
                Share on WhatsApp
              </a>
            </Button>
            <MissingList rows={report.rows.filter((r) => r.status === "missing")} />
            <section className="flex flex-col gap-2">
              <SectionTitle>All machines · {report.rows.length}</SectionTitle>
              <Card className="gap-0 py-0">
                {report.rows.map((row) => (
                  <MachineRowItem key={row.machine.id} row={row} />
                ))}
              </Card>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading report">
      <div className="grid gap-2 sm:grid-cols-[4fr_3fr]">
        <Skeleton className="h-[74px] rounded-xl" />
        <Skeleton className="h-[74px] rounded-xl" />
      </div>
      <Skeleton className="h-11 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}

function OpenBreakdowns({ report, onFixed }: { report: Report; onFixed: () => void }) {
  if (report.openBreakdowns.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5 text-red-700">
          <TriangleAlert className="size-3.5" /> Open breakdowns · {report.openBreakdowns.length}
        </span>
      </SectionTitle>
      <Card className="gap-0 border-red-200 py-0">
        {report.openBreakdowns.map((b) => (
          <div key={b.id} className="flex gap-3 border-b border-red-100 p-3 last:border-0">
            <PhotoThumb url={b.photoUrl} label={`${b.machineName} breakdown photo`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/owner/machine/${b.machine_id}`} className="text-sm font-semibold hover:underline">
                  {b.machineName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDate(todayIST(new Date(b.reported_at)))} · {formatTime(b.reported_at)}
                </span>
              </div>
              {b.note && <p className="mt-0.5 text-sm text-zinc-700">{b.note}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <MarkFixedButton id={b.id} machineName={b.machineName} onDone={onFixed} />
                {b.driver && (
                  <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 rounded-lg px-2 text-[13px] text-muted-foreground">
                    <a href={`tel:${b.driver.mobile}`}>
                      <Phone className="size-3.5" />
                      {b.driver.full_name}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function Summary({ report }: { report: Report }) {
  const { counts, totals } = report;
  const kpis = [
    { label: "Worked", value: counts.worked, dot: "bg-green-500" },
    { label: "Idle", value: counts.idle, dot: "bg-amber-500" },
    { label: "Breakdown", value: counts.breakdown, dot: "bg-red-500" },
    { label: "Missing", value: counts.missing, dot: "bg-red-500", alert: counts.missing > 0 },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-[4fr_3fr]">
      <Card className="grid grid-cols-4 gap-0 divide-x py-0">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 px-2.5 py-3">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{k.label}</p>
            <p className={cn("mt-1 flex items-center gap-1.5 text-2xl font-semibold tracking-tight tabular-nums", k.alert && "text-red-700")}>
              <span className={cn("size-1.5 shrink-0 rounded-full", k.dot)} aria-hidden />
              {k.value}
            </p>
          </div>
        ))}
      </Card>
      <Card className="grid grid-cols-3 gap-0 divide-x py-0">
        <Total label="Engine hrs" value={fmt(totals.hours)} />
        <Total label="Distance km" value={fmt(totals.km, 0)} />
        <Total label="Diesel L" value={fmt(totals.diesel, 0)} />
      </Card>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3">
      <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function MissingList({ rows }: { rows: MachineRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5 text-red-700">
          <CircleAlert className="size-3.5" /> Missing entries · {rows.length}
        </span>
      </SectionTitle>
      <Card className="gap-0 border-red-200 py-0">
        {rows.map((r) => (
          <div key={r.machine.id} className="flex items-center justify-between gap-3 border-b border-red-100 px-3 py-2.5 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.machine.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.driver?.full_name ?? "No driver assigned"}
                {r.running && " · shift not ended"}
              </p>
            </div>
            {r.driver && (
              <Button asChild variant="outline" size="sm" className="h-10 shrink-0 gap-1.5 rounded-lg px-3 text-[13px] tabular-nums">
                <a href={`tel:${r.driver.mobile}`}>
                  <Phone className="size-3.5 text-red-600" />
                  {r.driver.mobile}
                </a>
              </Button>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}

function MachineRowItem({ row }: { row: MachineRow }) {
  const { machine, log, driver, site, status } = row;
  const unit = machine.reading_type === "hours" ? "hrs" : "km";
  const completed = log?.closing_reading != null;

  return (
    <div className="flex items-center gap-3 border-b px-3 py-3 transition-colors last:border-0 hover:bg-zinc-50">
      <Link href={`/owner/machine/${machine.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{machine.name}</p>
          <StatusBadge status={status} label={STATUS_LABEL[status]} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {TYPE_LABEL[machine.type]} · {site?.name ?? "No site"} · {driver?.full_name ?? "No driver"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-semibold text-foreground tabular-nums">
            {completed ? `${fmt(num(log.worked))} ${unit}` : row.running ? "Shift running" : "—"}
          </span>
          {completed && (
            <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
              <Fuel className="size-3" />
              {fmt(num(log.diesel_litres), 0)} L
            </span>
          )}
          {log && <NoPhotoTag missingStart={!log.start_photo_path} missingEnd={completed && !log.end_photo_path} />}
        </div>
      </Link>
      <PhotoThumb url={row.photoUrl} label={`${machine.name} meter photo`} />
    </div>
  );
}

/** One small grey tag: "No photo" (both missing), or "No start photo" / "No end photo". */
function NoPhotoTag({ missingStart, missingEnd }: { missingStart: boolean; missingEnd: boolean }) {
  if (!missingStart && !missingEnd) return null;
  const label = missingStart && missingEnd ? "No photo" : missingStart ? "No start photo" : "No end photo";
  return <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">{label}</span>;
}
