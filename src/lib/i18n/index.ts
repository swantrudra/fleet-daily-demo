"use client";

import { useCallback, useSyncExternalStore } from "react";
import en from "./en.json";
import mr from "./mr.json";
import hi from "./hi.json";
import type { Lang } from "@/lib/types";

export type TKey = keyof typeof en;
const dictionaries: Record<Lang, Record<string, string>> = { en, mr, hi };
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "mr", label: "मराठी" },
  { code: "hi", label: "हिंदी" },
];

const STORAGE_KEY = "fleet-lang";
const EVENT = "fleet-lang-change";

function readLang(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "mr" || v === "hi" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode: language just won't be remembered */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Tiny translation hook. `fallback` is used until the user picks a language. */
export type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

export function useT(fallback: Lang = "en"): { t: TFn; lang: Lang; hasChosen: boolean } {
  const stored = useSyncExternalStore(subscribe, readLang, () => null);
  const lang = stored ?? fallback;
  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let s = dictionaries[lang][key] ?? en[key] ?? key;
      for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );
  return { t, lang, hasChosen: stored !== null };
}

/** Locale for dates, always with Western digits (drivers read meters in 0-9). */
export const dateLocale = (lang: Lang) => ({ en: "en-IN", mr: "mr-IN-u-nu-latn", hi: "hi-IN-u-nu-latn" })[lang];
