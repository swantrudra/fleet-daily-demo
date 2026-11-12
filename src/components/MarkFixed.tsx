"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

/** Owner-only: closes an open breakdown (RLS policy breakdowns_update_owner). */
export function MarkFixedButton({ id, machineName, onDone }: { id: string; machineName: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markFixed() {
    if (!window.confirm(`Mark the ${machineName} breakdown as fixed?`)) return;
    setBusy(true);
    setFailed(false);
    const { data, error } = await supabase()
      .from("breakdowns")
      .update({ status: "closed" })
      .eq("id", id)
      .select("id");
    setBusy(false);
    // RLS silently updates 0 rows when not allowed, so check the result too.
    if (error || !data?.length) return setFailed(true);
    onDone();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={markFixed}
        disabled={busy}
        className="h-12 rounded-xl bg-green-700 px-4 text-base font-bold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "✓ Mark fixed"}
      </button>
      {failed && <p className="mt-1 text-sm font-semibold text-red-700">Could not update. Try again.</p>}
    </div>
  );
}
