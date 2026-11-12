"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Owner-only: closes an open breakdown (RLS policy breakdowns_update_owner). */
export function MarkFixedButton({ id, machineName, onDone }: { id: string; machineName: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markFixed() {
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
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg px-3 text-[13px]">
          <Check className="size-3.5 text-green-600" />
          Mark fixed
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {machineName} as fixed?</DialogTitle>
          <DialogDescription>The breakdown will be closed and removed from the open list.</DialogDescription>
        </DialogHeader>
        {failed && <p className="text-sm font-medium text-red-700">Could not update. Try again.</p>}
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="h-11 rounded-xl">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={markFixed} disabled={busy} className="h-11 rounded-xl">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Mark fixed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
