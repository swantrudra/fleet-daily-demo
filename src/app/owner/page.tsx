"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { addDays, formatDate, formatTime, todayIST, yesterdayIST } from "@/lib/date";
import { loadReport, useClientValue, whatsappUrl, type MachineRow, type Report } from "@/lib/owner";
import { num } from "@/lib/types";
import { Badge, Notice, Spinner, TopBar, fmt } from "@/components/ui";
import { PhotoThumb } from "@/components/Photo";
import { MarkFixedButton } from "@/components/MarkFixed";

const TYPE_LABEL = { excavator: "Excavator", jcb: "JCB / Backhoe", tipper: "Tipper", roller: "Roller", other: "Other" };
const STATUS_LABEL = { worked: "Worked", idle: "Idle", breakdown: "Breakdown", missing: "Missing", inactive: "Inactive" };

export default function MorningReport() {
  const router = useRouter();
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

  async function logout() {
    await supabase().auth.signOut();
    router.replace("/login");
  }

  const report = result?.report;

  return (
    <>
      <TopBar
        title="Morning Report"
        right={
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            aria-label="Refresh"
            className="h-12 w-12 rounded-lg text-2xl disabled:animate-spin disabled:opacity-60"
          >
            ↻
          </button>
        }
      />

      <main className="flex flex-col gap-4 p-4">
        {date && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPicked(addDays(date, -1))}
              aria-label="Previous day"
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-xl font-bold"
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              max={today ?? undefined}
              onChange={(e) => e.target.value && setPicked(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-white px-3 text-lg font-bold"
            />
            <button
              onClick={() => setPicked(addDays(date, 1))}
              disabled={!!today && date >= today}
              aria-label="Next day"
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-slate-300 bg-white text-xl font-bold disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}

        {!report && loading && <Spinner label="Loading report…" />}
        {result?.error && !loading && <Notice kind="error">Could not load the report. Check the network and tap ↻.</Notice>}

        {report && (
          <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
            <p className="text-center text-base font-semibold text-slate-600">{formatDate(report.date)}</p>
            <OpenBreakdowns report={report} onFixed={() => setRefreshKey((k) => k + 1)} />
            <Summary report={report} />
            <a
              href={whatsappUrl(report)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-lg font-extrabold text-ink shadow"
            >
              <span aria-hidden>💬</span> Share on WhatsApp
            </a>
            <MissingList rows={report.rows.filter((r) => r.status === "missing")} />
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">All machines ({report.rows.length})</h2>
              {report.rows.map((row) => (
                <MachineCard key={row.machine.id} row={row} />
              ))}
            </section>
          </div>
        )}

        <button onClick={logout} className="mt-4 h-12 text-base font-semibold text-slate-600 underline">
          Log out
        </button>
      </main>
    </>
  );
}

function OpenBreakdowns({ report, onFixed }: { report: Report; onFixed: () => void }) {
  if (report.openBreakdowns.length === 0) return null;
  return (
    <section className="rounded-2xl border-4 border-red-600 bg-red-50 p-3">
      <h2 className="mb-2 text-lg font-extrabold text-red-700">⚠️ Open breakdowns ({report.openBreakdowns.length})</h2>
      <ul className="flex flex-col gap-2">
        {report.openBreakdowns.map((b) => (
          <li key={b.id} className="flex gap-3 rounded-xl bg-white p-3">
            <PhotoThumb url={b.photoUrl} label={`${b.machineName} breakdown photo`} />
            <div className="min-w-0 flex-1">
              <Link href={`/owner/machine/${b.machine_id}`} className="text-xl font-extrabold underline">
                {b.machineName}
              </Link>
              <p className="text-sm text-slate-600">
                {formatDate(todayIST(new Date(b.reported_at)))} · {formatTime(b.reported_at)}
              </p>
              {b.note && <p className="mt-1 text-base">{b.note}</p>}
              {b.driver && (
                <a href={`tel:${b.driver.mobile}`} className="mt-1 inline-block font-bold text-red-700 underline">
                  📞 {b.driver.full_name}
                </a>
              )}
              <MarkFixedButton id={b.id} machineName={b.machineName} onDone={onFixed} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ report }: { report: Report }) {
  const { counts, totals } = report;
  const tiles = [
    { label: "Worked", value: counts.worked, cls: "bg-green-600 text-white" },
    { label: "Idle", value: counts.idle, cls: "bg-amber-400 text-ink" },
    { label: "Breakdown", value: counts.breakdown, cls: "bg-red-600 text-white" },
    { label: "Missing", value: counts.missing, cls: counts.missing ? "bg-red-600 text-white ring-4 ring-red-300" : "bg-white text-ink" },
  ];
  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl p-2 text-center ${t.cls}`}>
            <p className="text-3xl font-extrabold tabular-nums">{t.value}</p>
            <p className="text-xs font-bold">{t.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Total label="Engine hours" value={fmt(totals.hours)} unit="hrs" />
        <Total label="Distance" value={fmt(totals.km, 0)} unit="km" />
        <Total label="Diesel" value={fmt(totals.diesel, 0)} unit="L" />
      </div>
    </section>
  );
}

function Total({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border-2 border-slate-300 bg-white p-2 text-center">
      <p className="text-xl font-extrabold tabular-nums">
        {value} <span className="text-sm">{unit}</span>
      </p>
      <p className="text-xs font-bold text-slate-600">{label}</p>
    </div>
  );
}

function MissingList({ rows }: { rows: MachineRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-2xl border-4 border-red-600 bg-white p-3">
      <h2 className="mb-2 text-lg font-extrabold text-red-700">❗ Missing entries ({rows.length})</h2>
      <ul className="divide-y divide-slate-200">
        {rows.map((r) => (
          <li key={r.machine.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-lg font-extrabold">{r.machine.name}</p>
              <p className="truncate text-sm text-slate-600">
                {r.driver?.full_name ?? "No driver assigned"}
                {r.running && " · shift not ended"}
              </p>
            </div>
            {r.driver && (
              <a
                href={`tel:${r.driver.mobile}`}
                className="flex h-12 shrink-0 items-center gap-1 rounded-xl bg-red-600 px-4 font-bold text-white"
              >
                📞 {r.driver.mobile}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MachineCard({ row }: { row: MachineRow }) {
  const { machine, log, driver, site, status } = row;
  const unit = machine.reading_type === "hours" ? "hrs" : "km";
  const border = { worked: "border-green-600", idle: "border-amber-400", breakdown: "border-red-600", missing: "border-red-600", inactive: "border-slate-300" }[status];
  const completed = log?.closing_reading != null;

  return (
    <article className={`flex gap-3 rounded-2xl border-l-8 bg-white p-3 shadow-sm ${border}`}>
      <Link href={`/owner/machine/${machine.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xl font-extrabold">{machine.name}</p>
          <Badge status={status} label={STATUS_LABEL[status]} />
        </div>
        <p className="text-sm text-slate-600">
          {TYPE_LABEL[machine.type]} · {site?.name ?? "No site"}
        </p>
        <p className="truncate text-sm text-slate-600">{driver?.full_name ?? "No driver"}</p>
        <p className="mt-1 text-base font-bold tabular-nums">
          {completed ? `${fmt(num(log.worked))} ${unit}` : row.running ? "Shift running" : "—"}
          {completed && <span className="font-semibold text-slate-600"> · ⛽ {fmt(num(log.diesel_litres), 0)} L</span>}
        </p>
        {log && (!log.start_photo_path || (completed && !log.end_photo_path)) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {!log.start_photo_path && <NoPhotoTag which="start" />}
            {completed && !log.end_photo_path && <NoPhotoTag which="end" />}
          </div>
        )}
      </Link>
      <PhotoThumb url={row.photoUrl} label={`${machine.name} meter photo`} />
    </article>
  );
}

function NoPhotoTag({ which }: { which: "start" | "end" }) {
  return (
    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">No photo · {which}</span>
  );
}
