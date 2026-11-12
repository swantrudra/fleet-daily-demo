"use client";

import Link from "next/link";
import type { TFn } from "@/lib/i18n";
import { Notice, Spinner, TopBar } from "@/components/ui";

export function DriverFallback({ status, t }: { status: "loading" | "error" | "no-machine"; t: TFn }) {
  if (status === "loading") return <Spinner label={t("common.loading")} />;
  return (
    <>
      <TopBar title={t("app.name")} />
      <main className="flex flex-col gap-4 p-4">
        <Notice kind="error">{status === "no-machine" ? t("home.noMachine") : t("common.error")}</Notice>
        <Link href="/login" className="text-center text-lg font-bold underline">
          {t("login.title")}
        </Link>
      </main>
    </>
  );
}
