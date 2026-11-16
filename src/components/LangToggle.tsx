"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = lang === "hi" ? "en" : "hi";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setLang(next); router.refresh(); })}
      className="rounded-md border border-white/40 px-2.5 py-1 text-sm font-semibold hover:bg-white/10"
      aria-label={next === "en" ? "Switch to English" : "हिंदी में बदलें"}
    >
      {next === "en" ? "English" : "हिंदी"}
    </button>
  );
}
