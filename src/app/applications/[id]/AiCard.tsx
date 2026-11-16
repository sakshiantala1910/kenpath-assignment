"use client";

import { useState, useTransition, type ReactNode } from "react";
import { dictionaries, type Lang } from "@/lib/i18n";
import type { AiResult } from "@/lib/ai";

export function useAi<T>(run: () => Promise<AiResult<T>>) {
  const [result, setResult] = useState<AiResult<T> | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const trigger = () =>
    start(async () => {
      setError(false);
      try {
        setResult(await run());
      } catch {
        setError(true);
      }
    });
  return { result, error, pending, trigger };
}

interface Props {
  lang: Lang;
  title: string;
  hint: string;
  pending: boolean;
  error: boolean;
  fallback: boolean;
  disabled?: boolean;
  onRun: () => void;
  children?: ReactNode;
}

export function AiCard({ lang, title, hint, pending, error, fallback, disabled, onRun, children }: Props) {
  const t = dictionaries[lang];
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-wide text-violet-700 uppercase">✦ {t.ai.title}</div>
          <p className="text-sm text-slate-600">{hint}</p>
        </div>
        <button type="button" className="btn btn-ai" onClick={onRun} disabled={pending || disabled}>
          {pending ? t.ai.working : title}
        </button>
      </div>
      {pending && (
        <div className="mt-3 h-1.5 overflow-hidden rounded bg-violet-100">
          <div className="h-full w-1/3 animate-pulse rounded bg-violet-400" />
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{t.ai.error}</p>}
      {children && !pending && (
        <div className="mt-4 space-y-3 border-t border-violet-200 pt-4 text-sm">
          {fallback && <p className="rounded bg-amber-50 p-2 text-amber-900">{t.ai.fallback}</p>}
          {children}
          <p className="text-xs text-slate-500">{t.ai.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

export function Severity({ level, lang }: { level: "high" | "medium" | "low"; lang: Lang }) {
  const style = { high: "bg-red-100 text-red-800", medium: "bg-amber-100 text-amber-900", low: "bg-slate-100 text-slate-700" }[level];
  return <span className={`chip ${style}`}>{dictionaries[lang].ai.severity[level]}</span>;
}
