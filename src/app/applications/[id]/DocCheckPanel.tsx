"use client";

import { useActionState, useState } from "react";
import { aiCheckDocuments, submitDocCheck } from "@/app/actions";
import { dictionaries, formatINR, type Lang } from "@/lib/i18n";
import type { RuleIssue } from "@/lib/rules";
import type { Application, DocType } from "@/lib/types";
import { AiCard, Severity, useAi } from "./AiCard";

interface Props {
  app: Application;
  lang: Lang;
  canAct: boolean;
  required: DocType[];
  ruleIssues: RuleIssue[];
}

export function DocCheckPanel({ app, lang, canAct, required, ruleIssues }: Props) {
  const t = dictionaries[lang];
  const [state, formAction, submitting] = useActionState(submitDocCheck, undefined);
  const [checked, setChecked] = useState<Set<DocType>>(new Set());
  const [mode, setMode] = useState<"forward" | "return" | "reject">("forward");
  const [reason, setReason] = useState("");
  const ai = useAi(() => aiCheckDocuments(app.id));
  const advice = ai.result?.data;

  const attached = new Map(app.documents.map((d) => [d.type, d]));
  const allTypes = [...new Set<DocType>([...required, ...app.documents.map((d) => d.type)])];
  const requiredOk = required.every((d) => checked.has(d));

  const toggle = (d: DocType) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  return (
    <form action={formAction} className="card space-y-5 p-5">
      <input type="hidden" name="id" value={app.id} />
      <input type="hidden" name="outcome" value={mode} />
      <input type="hidden" name="aiSuggested" value={ai.result?.source === "ai" ? advice?.suggestedAction : ""} />
      <input type="hidden" name="aiMessage" value={ai.result?.source === "ai" ? advice?.applicantMessage : ""} />

      <div>
        <h2 className="text-lg font-bold">{t.docCheck.title}</h2>
        <p className="text-sm text-slate-600">{t.docCheck.intro}</p>
      </div>

      <div className={`rounded-lg p-3 text-sm ${ruleIssues.length ? "bg-yellow-50 text-yellow-900" : "bg-emerald-50 text-emerald-900"}`}>
        <div className="font-semibold">{t.app.ruleChecks}</div>
        {ruleIssues.length === 0 ? (
          <p>✓ {t.app.noRuleIssues}</p>
        ) : (
          <ul className="list-inside list-disc">
            {ruleIssues.map((i, n) => (
              <li key={n}>
                {i.kind === "missing_doc" ? t.app.missingDoc(t.docs[i.doc]) : t.app.sumMismatch(formatINR(i.sum), formatINR(i.declared))}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="space-y-2">
        {allTypes.map((type) => {
          const doc = attached.get(type);
          return (
            <li key={type} className={`rounded-lg border p-3 ${doc ? "border-slate-200" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="checklist"
                  value={type}
                  id={`doc-${type}`}
                  className="size-6 accent-emerald-700"
                  disabled={!doc || !canAct}
                  checked={checked.has(type)}
                  onChange={() => toggle(type)}
                />
                <label htmlFor={`doc-${type}`} className="flex-1 font-semibold">
                  {t.docs[type]}
                  {required.includes(type) && <span className="chip ml-2 bg-slate-100 text-slate-600">{t.docCheck.required}</span>}
                </label>
                {!doc && <span className="text-sm font-semibold text-red-700">{t.app.notAttached}</span>}
              </div>
              {doc && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-indigo-700">{t.dash.open}</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 font-sans text-sm text-slate-800">{doc.text}</pre>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {canAct && (
        <AiCard
          lang={lang}
          title={t.ai.checkDocs}
          hint={t.ai.checkDocsHint}
          pending={ai.pending}
          error={ai.error}
          fallback={ai.result?.source === "rules"}
          onRun={ai.trigger}
        >
          {advice && (
            <>
              {advice.summary && <p className="font-medium">{advice.summary}</p>}
              <div>
                <div className="font-semibold">{t.ai.issues}</div>
                {advice.issues.length === 0 ? (
                  <p className="text-emerald-800">✓ {t.ai.noIssues}</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {advice.issues.map((i, n) => (
                      <li key={n} className="flex gap-2">
                        <Severity level={i.severity} lang={lang} />
                        <span>{i.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {advice.missingDocuments.length > 0 && (
                <p>
                  <span className="font-semibold">{t.ai.missing}: </span>
                  {advice.missingDocuments.map((d) => t.docs[d as DocType] ?? d).join(", ")}
                </p>
              )}
              <p>
                <span className="font-semibold">{t.ai.suggests}: </span>
                <span className="chip bg-violet-100 text-violet-900">{t.ai.actions[advice.suggestedAction]}</span>
              </p>
              {advice.applicantMessage && (
                <div>
                  <div className="font-semibold">{t.ai.applicantMsg}</div>
                  <p className="mt-1 rounded bg-white p-2 ring-1 ring-slate-200">{advice.applicantMessage}</p>
                  <button
                    type="button"
                    className="btn btn-ghost mt-2 text-sm"
                    onClick={() => {
                      setMode("return");
                      setReason(advice.applicantMessage);
                    }}
                  >
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
            <label className="label" htmlFor="remarks">{t.docCheck.remarks}</label>
            <textarea id="remarks" name="remarks" rows={2} className="input" placeholder={t.docCheck.remarksPh} />
          </div>

          {mode !== "forward" && (
            <div>
              <label className="label" htmlFor="returnReason">{t.docCheck.returnReason}</label>
              <textarea
                id="returnReason"
                name="returnReason"
                rows={3}
                className="input"
                placeholder={t.docCheck.returnReasonPh}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          )}

          {state?.error && <p className="text-sm font-semibold text-red-700" role="alert">{state.error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {mode === "forward" ? (
              <>
                <button className="btn btn-primary sm:flex-1" disabled={submitting || !requiredOk} title={requiredOk ? "" : t.docCheck.needAllChecked}>
                  {t.docCheck.forward}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode("return")}>{t.docCheck.returnBtn}</button>
                <button type="button" className="btn btn-danger" onClick={() => setMode("reject")}>{t.docCheck.reject}</button>
              </>
            ) : (
              <>
                <button className={`btn sm:flex-1 ${mode === "reject" ? "btn-danger" : "btn-primary"}`} disabled={submitting || !reason.trim()}>
                  {mode === "reject" ? t.docCheck.reject : t.docCheck.returnBtn}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode("forward")}>✕</button>
              </>
            )}
          </div>
          {mode === "forward" && !requiredOk && <p className="text-xs text-slate-500">{t.docCheck.needAllChecked}</p>}
        </>
      )}
    </form>
  );
}
