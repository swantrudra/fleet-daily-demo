"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { signedUrls } from "@/lib/photos";
import { formatDate } from "@/lib/date";
import { num, type Breakdown, type LogStatus, type Machine, type Profile, type ShiftLog, type Site } from "@/lib/types";

export type RowStatus = LogStatus | "missing" | "inactive";

export interface MachineRow {
  machine: Machine;
  driver: Profile | null;
  site: Site | null;
  log: ShiftLog | null;
  status: RowStatus;
  /** Log exists but shift not ended yet (still counts as missing). */
  running: boolean;
  photoUrl: string | null;
}

export interface OpenBreakdown extends Breakdown {
  machineName: string;
  driver: Profile | null;
  photoUrl: string | null;
}

export interface Report {
  date: string;
  rows: MachineRow[];
  openBreakdowns: OpenBreakdown[];
  counts: Record<LogStatus | "missing", number>;
  totals: { hours: number; km: number; diesel: number };
}

/** Value that only exists in the browser (e.g. "today"), null during server render. */
export function useClientValue<T extends string | number>(get: () => T): T | null {
  return useSyncExternalStore(noopSubscribe, get, () => null);
}
const noopSubscribe = () => () => {};

/** Everything for the Morning Report of one date. RLS scopes it to the owner's company. */
export async function loadReport(date: string): Promise<Report> {
  const sb = supabase();
  const [machinesRes, driversRes, sitesRes, logsRes, bdRes] = await Promise.all([
    sb.from("machines").select("*").order("name"),
    sb.from("profiles").select("*").eq("role", "driver"),
    sb.from("sites").select("*"),
    sb.from("shift_logs").select("*").eq("log_date", date),
    sb.from("breakdowns").select("*").eq("status", "open").order("reported_at", { ascending: false }),
  ]);
  const err = machinesRes.error || driversRes.error || sitesRes.error || logsRes.error || bdRes.error;
  if (err) throw err;

  const machines = machinesRes.data as Machine[];
  const drivers = driversRes.data as Profile[];
  const sites = sitesRes.data as Site[];
  const logs = logsRes.data as ShiftLog[];
  const breakdowns = bdRes.data as Breakdown[];

  const driverOf = (machineId: string) => drivers.find((d) => d.machine_id === machineId) ?? null;
  const urls = await signedUrls([
    ...logs.map((l) => l.end_photo_path ?? l.start_photo_path),
    ...breakdowns.map((b) => b.photo_path),
  ]);

  const counts = { worked: 0, idle: 0, breakdown: 0, missing: 0 };
  const totals = { hours: 0, km: 0, diesel: 0 };

  const rows: MachineRow[] = machines.map((machine) => {
    const log = logs.find((l) => l.machine_id === machine.id) ?? null;
    const completed = log && log.closing_reading != null;
    let status: RowStatus;
    if (machine.status === "inactive") status = "inactive";
    else if (completed) status = log.status ?? "worked";
    else status = "missing";

    if (status !== "inactive") counts[status]++;
    if (completed) {
      if (machine.reading_type === "hours") totals.hours += num(log.worked);
      else totals.km += num(log.worked);
      totals.diesel += num(log.diesel_litres);
    }

    const photoPath = log?.end_photo_path ?? log?.start_photo_path;
    return {
      machine,
      driver: driverOf(machine.id),
      site: sites.find((s) => s.id === (log?.site_id ?? machine.current_site_id)) ?? null,
      log,
      status,
      running: !!log && !completed,
      photoUrl: photoPath ? (urls[photoPath] ?? null) : null,
    };
  });

  const openBreakdowns = breakdowns.map((b) => ({
    ...b,
    machineName: machines.find((m) => m.id === b.machine_id)?.name ?? "?",
    driver: drivers.find((d) => d.id === b.driver_id) ?? null,
    photoUrl: b.photo_path ? (urls[b.photo_path] ?? null) : null,
  }));

  return { date, rows, openBreakdowns, counts, totals };
}

const n = (v: number, d = 1) => Number(v.toFixed(d)).toLocaleString("en-IN");

/** Plain-text summary for WhatsApp. */
export function whatsappText(r: Report): string {
  const missing = r.rows.filter((x) => x.status === "missing");
  const bdNames = new Set([
    ...r.rows.filter((x) => x.status === "breakdown").map((x) => x.machine.name),
    ...r.openBreakdowns.map((b) => b.machineName),
  ]);
  const lines = [
    `*Fleet Daily – Morning Report*`,
    formatDate(r.date),
    ``,
    `✅ Worked: ${r.counts.worked}`,
    `⏸ Idle: ${r.counts.idle}`,
    `⚠️ Breakdown: ${r.counts.breakdown}`,
    `❗ Missing: ${r.counts.missing}`,
    ``,
    `Engine hours: ${n(r.totals.hours)} hrs`,
    `Distance: ${n(r.totals.km, 0)} km`,
    `Diesel: ${n(r.totals.diesel, 0)} L`,
  ];
  if (missing.length) {
    lines.push(``, `*Missing entries:*`);
    for (const m of missing) {
      lines.push(`- ${m.machine.name}${m.driver ? ` (${m.driver.full_name}, ${m.driver.mobile})` : ""}`);
    }
  }
  if (bdNames.size) {
    lines.push(``, `*Breakdown:*`);
    for (const name of bdNames) {
      const open = r.openBreakdowns.find((b) => b.machineName === name);
      lines.push(`- ${name}${open?.note ? `: ${open.note}` : ""}`);
    }
  }
  return lines.join("\n");
}

export function whatsappUrl(r: Report): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsappText(r))}`;
}
