"use client";

import { useActionState, useState } from "react";
import { aiSummarize, submitDecision } from "@/app/actions";
import { dictionaries, formatDate, formatINR, type Lang } from "@/lib/i18n";
import type { Application } from "@/lib/types";
import { AiCard, useAi } from "./AiCard";

export function DecisionPanel({ app, lang, canAct }: { app: Application; lang: Lang; canAct: boolean }) {
  const t = dictionaries[lang];
  const [state, formAction, submitting] = useActionState(submitDecision, undefined);
  const [reason, setReason] = useState("");
  const ai = useAi(() => aiSummarize(app.id));
  const advice = ai.result?.data;
  const report = app.fieldReport;
  const verified = report?.verifiedIncome ?? app.declaredIncome;
  const gapPct = Math.round(((verified - app.declaredIncome) / Math.max(app.declaredIncome, 1)) * 100);

  const confirmSubmit = (e: React.MouseEvent<HTMLButtonElement>, needsReason: boolean) => {
    if (needsReason && !reason.trim()) {
      e.preventDefault();
      alert(t.decision.reasonRequired);
      return;
    }
    if (!confirm(t.decision.confirm)) e.preventDefault();
  };

  return (
    <form action={formAction} className="card space-y-5 p-5">
      <input type="hidden" name="id" value={app.id} />
      <input type="hidden" name="aiRecommendation" value={advice && ai.result?.source === "ai" ? advice.recommendation : ""} />
      <input type="hidden" name="aiOrder" value={advice && ai.result?.source === "ai" ? advice.draftOrder : ""} />

      <div>
        <h2 className="text-lg font-bold">{t.decision.title}</h2>
        <p className="text-sm text-slate-600">{t.decision.intro}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-500">{t.app.declaredIncome}</div>
          <div className="text-xl font-bold">{formatINR(app.declaredIncome)}</div>
        </div>
        <div className={`rounded-lg p-3 ${Math.abs(gapPct) > 20 ? "bg-yellow-50 ring-1 ring-yellow-300" : "bg-emerald-50"}`}>
          <div className="text-xs text-slate-500">{t.app.verifiedIncome}</div>
          <div className="text-xl font-bold">{formatINR(verified)}</div>
          {gapPct !== 0 && <div className="text-xs font-semibold">{gapPct > 0 ? "+" : ""}{gapPct}%</div>}
        </div>
      </div>

      {report && (
        <div>
          <div className="label">
            {t.field.report} — {formatDate(report.visitedOn, lang)}
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-amber-50/60 p-3 font-sans text-[15px] ring-1 ring-amber-200">{report.report}</pre>
        </div>
      )}

      {canAct && (
        <AiCard
          lang={lang}
          title={t.ai.summarize}
          hint={t.ai.summarizeHint}
          pending={ai.pending}
          error={ai.error}
          fallback={ai.result?.source === "rules"}
          onRun={ai.trigger}
        >
          {advice && (
            <>
              <p className="font-medium">{advice.summary}</p>
              {advice.consistency.length > 0 && (
                <div>
                  <div className="font-semibold">{t.ai.consistency}</div>
                  <ul className="mt-1 space-y-1">
                    {advice.consistency.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={c.ok ? "text-emerald-700" : "text-red-700"}>{c.ok ? "✓" : "✗"}</span>
                        <span>{c.point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {advice.risks.length > 0 && (
                <div className="rounded bg-yellow-50 p-2 text-yellow-900">
                  <div className="font-semibold">{t.ai.risks}</div>
                  <ul className="list-inside list-disc">{advice.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              <p>
                <span className="font-semibold">{t.ai.recommendation}: </span>
                <span className="chip bg-violet-100 text-violet-900">
                  {advice.recommendation === "approve" ? t.ai.actions.approve : advice.recommendation === "reject" ? t.ai.actions.reject : t.decision.backToLekhpal}
                </span>
              </p>
              {advice.reasoning && <p className="text-slate-700">{advice.reasoning}</p>}
              {advice.draftOrder && (
                <div>
                  <div className="font-semibold">{t.ai.draftOrder}</div>
                  <p className="mt-1 rounded bg-white p-2 ring-1 ring-slate-200">{advice.draftOrder}</p>
                  <button type="button" className="btn btn-ghost mt-2 text-sm" onClick={() => setReason(advice.draftOrder)}>
                    {t.ai.useDraft}
                  </button>
                </div>
              )}
            </>
          )}
        </AiCard>
      )}

      {canAct && (
        <>
          <div>
            <label className="label" htmlFor="reason">{t.decision.reason}</label>
            <textarea id="reason" name="reason" rows={3} className="input" placeholder={t.decision.reasonPh} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">
              {t.decision.certificateIncome}: <b>{formatINR(verified)}</b>
            </p>
          </div>

          {state?.error && <p className="text-sm font-semibold text-red-700" role="alert">{state.error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button name="outcome" value="approve" className="btn btn-success sm:flex-1" disabled={submitting} onClick={(e) => confirmSubmit(e, false)}>
              {t.decision.approve}
            </button>
            <button name="outcome" value="return" className="btn btn-ghost" disabled={submitting} onClick={(e) => confirmSubmit(e, true)}>
              {t.decision.backToLekhpal}
            </button>
            <button name="outcome" value="reject" className="btn btn-danger" disabled={submitting} onClick={(e) => confirmSubmit(e, true)}>
              {t.decision.reject}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
