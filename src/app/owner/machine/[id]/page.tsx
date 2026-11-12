"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { signedUrls } from "@/lib/photos";
import { addDays, formatDate, formatTime, todayIST } from "@/lib/date";
import { num, type Breakdown, type Machine, type Profile, type ShiftLog } from "@/lib/types";
import { Badge, Notice, Spinner, TopBar, fmt } from "@/components/ui";
import { PhotoThumb } from "@/components/Photo";
import { MarkFixedButton } from "@/components/MarkFixed";

interface History {
  machine: Machine & { site: { name: string } | null };
  driver: Profile | null;
  logs: ShiftLog[];
  breakdowns: Breakdown[];
  urls: Record<string, string>;
}

async function loadHistory(id: string): Promise<History | null> {
  const sb = supabase();
  const since = addDays(todayIST(), -29);
  const [m, d, l, b] = await Promise.all([
    sb.from("machines").select("*, site:sites(name)").eq("id", id).maybeSingle(),
    sb.from("profiles").select("*").eq("machine_id", id).eq("role", "driver").maybeSingle(),
    sb.from("shift_logs").select("*").eq("machine_id", id).gte("log_date", since).order("log_date", { ascending: false }),
    sb.from("breakdowns").select("*").eq("machine_id", id).order("reported_at", { ascending: false }).limit(20),
  ]);
  if (m.error || d.error || l.error || b.error) throw new Error("load failed");
  if (!m.data) return null;
  const logs = l.data as ShiftLog[];
  const breakdowns = b.data as Breakdown[];
  const urls = await signedUrls([
    ...logs.flatMap((x) => [x.start_photo_path, x.end_photo_path]),
    ...breakdowns.map((x) => x.photo_path),
  ]);
  return { machine: m.data, driver: d.data, logs, breakdowns, urls };
}

export default function MachineHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{ id: string; data?: History | null; error?: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    loadHistory(id)
      .then((data) => alive && setState({ id, data }))
      .catch(() => alive && setState({ id, error: true }));
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  const ready = state?.id === id;
  const h = ready ? state.data : undefined;

  return (
    <>
      <TopBar title={h ? `${h.machine.name} · History` : "Machine history"} back="/owner" />
      <main className="flex flex-col gap-4 p-4">
        {!ready && <Spinner label="Loading…" />}
        {ready && state.error && <Notice kind="error">Could not load history. Check the network.</Notice>}
        {ready && !state.error && !h && <Notice kind="error">Machine not found.</Notice>}
        {h && <HistoryView h={h} onChanged={() => setReloadKey((k) => k + 1)} />}
      </main>
    </>
  );
}

function HistoryView({ h, onChanged }: { h: History; onChanged: () => void }) {
  const unit = h.machine.reading_type === "hours" ? "hrs" : "km";
  const done = h.logs.filter((l) => l.closing_reading != null);
  const totalWorked = done.reduce((s, l) => s + num(l.worked), 0);
  const totalDiesel = done.reduce((s, l) => s + num(l.diesel_litres), 0);
  const daysWorked = done.filter((l) => l.status === "worked").length;
  const url = (p: string | null) => (p ? (h.urls[p] ?? null) : null);

  return (
    <>
      <section className="rounded-2xl bg-ink p-4 text-white">
        <p className="text-3xl font-extrabold">{h.machine.name}</p>
        <p className="text-slate-300">
          {h.machine.type.toUpperCase()} · {h.machine.site?.name ?? "No site"}
        </p>
        {h.driver && (
          <a href={`tel:${h.driver.mobile}`} className="mt-1 inline-block font-semibold text-brand underline">
            📞 {h.driver.full_name} · {h.driver.mobile}
          </a>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Days worked" value={String(daysWorked)} />
          <Stat label={`Total ${unit}`} value={fmt(totalWorked, unit === "km" ? 0 : 1)} />
          <Stat label="Diesel (L)" value={fmt(totalDiesel, 0)} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Last 30 days</p>
      </section>

      {h.breakdowns.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-extrabold">Breakdowns</h2>
          <ul className="flex flex-col gap-2">
            {h.breakdowns.map((b) => (
              <li key={b.id} className={`flex gap-3 rounded-xl border-l-8 bg-white p-3 ${b.status === "open" ? "border-red-600" : "border-slate-300"}`}>
                <PhotoThumb url={url(b.photo_path)} label="Breakdown photo" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{formatDate(todayIST(new Date(b.reported_at)))}</p>
                    <Badge status={b.status === "open" ? "breakdown" : "worked"} label={b.status === "open" ? "Open" : "Closed"} />
                  </div>
                  <p className="text-sm text-slate-600">{formatTime(b.reported_at)}</p>
                  {b.note && <p className="mt-1">{b.note}</p>}
                  {b.status === "open" && <MarkFixedButton id={b.id} machineName={h.machine.name} onDone={onChanged} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-extrabold">Daily logs ({h.logs.length})</h2>
        {h.logs.length === 0 && <p className="text-slate-600">No logs in the last 30 days.</p>}
        <ul className="flex flex-col gap-2">
          {h.logs.map((l) => {
            const status = l.closing_reading == null ? "running" : (l.status ?? "worked");
            return (
              <li key={l.id} className="rounded-xl border border-slate-300 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{formatDate(l.log_date)}</p>
                  <Badge status={status} label={status === "running" ? "Running" : status[0].toUpperCase() + status.slice(1)} />
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="tabular-nums">
                    <p className="text-sm text-slate-600">
                      {fmt(num(l.opening_reading))} → {l.closing_reading == null ? "…" : fmt(num(l.closing_reading))}
                    </p>
                    <p className="text-xl font-extrabold">
                      {l.worked == null ? "—" : `${fmt(num(l.worked))} ${unit}`}
                      <span className="text-base font-semibold text-slate-600"> · ⛽ {fmt(num(l.diesel_litres), 0)} L</span>
                    </p>
                    {l.notes && <p className="text-sm text-slate-600">{l.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <PhotoThumb url={url(l.start_photo_path)} label="Start meter photo" size={52} />
                    <PhotoThumb url={url(l.end_photo_path)} label="End meter photo" size={52} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-2">
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-slate-300">{label}</p>
    </div>
  );
}
