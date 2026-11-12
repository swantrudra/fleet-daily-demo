"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Fuel, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { signedUrls } from "@/lib/photos";
import { addDays, formatDate, formatTime, todayIST } from "@/lib/date";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { num, type Breakdown, type Machine, type Profile, type ShiftLog } from "@/lib/types";
import { AppHeader, ListSkeleton, Notice, SectionTitle, StatusBadge } from "@/components/common";
import { PhotoThumb } from "@/components/Photo";
import { MarkFixedButton } from "@/components/MarkFixed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABEL = { excavator: "Excavator", jcb: "JCB / Backhoe", tipper: "Tipper", roller: "Roller", other: "Other" };

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
      <AppHeader
        title={h ? h.machine.name : "Machine history"}
        subtitle={h ? `${TYPE_LABEL[h.machine.type]} · last 30 days` : undefined}
        back="/owner"
      />
      <main className="flex flex-col gap-6 p-4">
        {!ready && (
          <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
            <Skeleton className="h-[132px] rounded-xl" />
            <ListSkeleton rows={6} />
          </div>
        )}
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
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{h.machine.site?.name ?? "No site"}</p>
            <p className="truncate text-xs text-muted-foreground">{h.driver?.full_name ?? "No driver assigned"}</p>
          </div>
          {h.driver && (
            <Button asChild variant="outline" size="sm" className="h-10 shrink-0 gap-1.5 rounded-lg px-3 text-[13px] tabular-nums">
              <a href={`tel:${h.driver.mobile}`}>
                <Phone className="size-3.5" />
                {h.driver.mobile}
              </a>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x">
          <Stat label="Days worked" value={String(daysWorked)} />
          <Stat label={`Total ${unit}`} value={fmt(totalWorked, unit === "km" ? 0 : 1)} />
          <Stat label="Diesel L" value={fmt(totalDiesel, 0)} />
        </div>
      </Card>

      {h.breakdowns.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Breakdowns · {h.breakdowns.length}</SectionTitle>
          <Card className="gap-0 py-0">
            {h.breakdowns.map((b) => (
              <div key={b.id} className={cn("flex gap-3 border-b p-3 last:border-0", b.status === "open" && "bg-red-50/40")}>
                <PhotoThumb url={url(b.photo_path)} label="Breakdown photo" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {formatDate(todayIST(new Date(b.reported_at)))}
                      <span className="font-normal text-muted-foreground"> · {formatTime(b.reported_at)}</span>
                    </p>
                    <StatusBadge status={b.status === "open" ? "breakdown" : "inactive"} label={b.status === "open" ? "Open" : "Closed"} />
                  </div>
                  {b.note && <p className="mt-0.5 text-sm text-zinc-700">{b.note}</p>}
                  {b.status === "open" && (
                    <div className="mt-2">
                      <MarkFixedButton id={b.id} machineName={h.machine.name} onDone={onChanged} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionTitle>Daily logs · {h.logs.length}</SectionTitle>
        <Card className="gap-0 py-0">
          {h.logs.length === 0 && <p className="p-4 text-sm text-muted-foreground">No logs in the last 30 days.</p>}
          {h.logs.map((l) => {
            const status = l.closing_reading == null ? "running" : (l.status ?? "worked");
            return (
              <div key={l.id} className="flex items-center gap-3 border-b px-3 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{formatDate(l.log_date)}</p>
                    <StatusBadge status={status} label={status === "running" ? "Running" : status[0].toUpperCase() + status.slice(1)} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {fmt(num(l.opening_reading))} → {l.closing_reading == null ? "…" : fmt(num(l.closing_reading))}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs tabular-nums">
                    <span className="font-semibold">{l.worked == null ? "—" : `${fmt(num(l.worked))} ${unit}`}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Fuel className="size-3" />
                      {fmt(num(l.diesel_litres), 0)} L
                    </span>
                  </div>
                  {l.notes && <p className="mt-0.5 text-xs text-muted-foreground">{l.notes}</p>}
                </div>
                <div className="flex gap-1.5">
                  <PhotoThumb url={url(l.start_photo_path)} label="Start meter photo" size={40} />
                  <PhotoThumb url={url(l.end_photo_path)} label="End meter photo" size={40} />
                </div>
              </div>
            );
          })}
        </Card>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
