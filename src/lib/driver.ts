"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { todayIST } from "@/lib/date";
import type { Machine, Profile, ShiftLog } from "@/lib/types";

export interface DriverContext {
  profile: Profile;
  machine: Machine;
  siteName: string | null;
  today: string;
  /** Latest shift that has no closing reading yet (normally today's). */
  openLog: ShiftLog | null;
  todayLog: ShiftLog | null;
  /** Last 3 logs, newest first. */
  recent: ShiftLog[];
}

type State =
  | { status: "loading" }
  | { status: "no-machine"; profile: Profile | null }
  | { status: "error" }
  | { status: "ready"; ctx: DriverContext };

/** Loads everything the driver screens need. RLS limits it to the driver's own machine. */
export function useDriver(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const sb = supabase();
      const today = todayIST();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return alive && setState({ status: "error" });

      const { data: profile, error } = await sb
        .from("profiles")
        .select("*, machine:machines(*, site:sites(name))")
        .eq("id", auth.user.id)
        .single();
      if (!alive) return;
      if (error || !profile) return setState({ status: "error" });
      if (!profile.machine) return setState({ status: "no-machine", profile });

      const machine = profile.machine as Machine & { site: { name: string } | null };
      const [recentRes, openRes] = await Promise.all([
        sb.from("shift_logs").select("*").eq("machine_id", machine.id).order("log_date", { ascending: false }).limit(3),
        sb
          .from("shift_logs")
          .select("*")
          .eq("machine_id", machine.id)
          .is("closing_reading", null)
          .order("log_date", { ascending: false })
          .limit(1),
      ]);
      if (!alive) return;
      if (recentRes.error || openRes.error) return setState({ status: "error" });

      const recent = recentRes.data as ShiftLog[];
      setState({
        status: "ready",
        ctx: {
          profile: profile as Profile,
          machine,
          siteName: machine.site?.name ?? null,
          today,
          openLog: (openRes.data[0] as ShiftLog | undefined) ?? null,
          todayLog: recent.find((l) => l.log_date === today) ?? null,
          recent,
        },
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
