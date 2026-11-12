"use client";

import Link from "next/link";
import type { TFn } from "@/lib/i18n";
import { AppHeader, DriverSkeleton, Notice } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

export function DriverFallback({ status, t, back }: { status: "loading" | "error" | "no-machine"; t: TFn; back?: string }) {
  if (status === "loading") {
    return (
      <>
        <AppHeader back={back} actions={<Skeleton className="mr-2 size-6 rounded-md" />} />
        <DriverSkeleton />
      </>
    );
  }
  return (
    <>
      <AppHeader back={back} />
      <main className="flex flex-col gap-4 p-4">
        <Notice kind="error">{status === "no-machine" ? t("home.noMachine") : t("common.error")}</Notice>
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
          {t("login.title")}
        </Link>
      </main>
    </>
  );
}
