"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { aiDraftReport, submitFieldReport } from "@/app/actions";
import { dictionaries, formatINR, type Lang } from "@/lib/i18n";
import type { Application } from "@/lib/types";
import { AiCard, useAi } from "./AiCard";

// Minimal typing for the browser's (prefixed) Web Speech API
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const speechCtor = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const noopSubscribe = () => () => {};

function useDictation(onText: (text: string) => void) {
  const supported = useSyncExternalStore(noopSubscribe, () => Boolean(speechCtor()), () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "hi-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onText(e.results[i][0].transcript);
      }
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };
  return { supported, listening, toggle };
}

export function FieldPanel({ app, lang, canAct }: { app: Application; lang: Lang; canAct: boolean }) {
  const t = dictionaries[lang];
  const [state, formAction, submitting] = useActionState(submitFieldReport, undefined);
  const [notes, setNotes] = useState(app.fieldReport?.notes ?? "");
  const [report, setReport] = useState(app.fieldReport?.report ?? "");
  const [income, setIncome] = useState(app.fieldReport ? String(app.fieldReport.verifiedIncome) : "");
  const [returning, setReturning] = useState(false);
  const ai = useAi(() => aiDraftReport(app.id, notes));
  const draft = ai.result?.data;
  const dictation = useDictation((text) => setNotes((n) => (n ? `${n} ${text}` : text)));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card space-y-5 p-5">
      <input type="hidden" name="id" value={app.id} />
      <input type="hidden" name="outcome" value={returning ? "return" : "forward"} />
      <input type="hidden" name="aiReport" value={draft && ai.result?.source === "ai" ? draft.report : ""} />

      <div>
        <h2 className="text-lg font-bold">{t.field.title}</h2>
        <p className="text-sm text-slate-600">{t.field.intro}</p>
      </div>

      {app.docCheck?.remarks && (
        <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          <span className="font-semibold">{t.stages.doc_check}: </span>
          {app.docCheck.remarks}
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="label mb-0" htmlFor="notes">{t.field.notes}</label>
          {canAct &&
            (dictation.supported ? (
              <button
                type="button"
                onClick={dictation.toggle}
                className={`btn min-h-9 px-3 py-1 text-sm ${dictation.listening ? "bg-red-600 text-white" : "btn-ghost"}`}
              >
                {dictation.listening ? t.field.stop : t.field.speak}
              </button>
            ) : (
              <span className="text-xs text-slate-400">{t.field.speakUnsupported}</span>
            ))}
        </div>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          className="input"
          placeholder={t.field.notesPh}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          readOnly={!canAct}
        />
      </div>

      {canAct && (
        <AiCard
          lang={lang}
          title={t.ai.draftReport}
          hint={t.ai.draftReportHint}
          pending={ai.pending}
          error={ai.error}
          fallback={ai.result?.source === "rules"}
          disabled={!notes.trim()}
          onRun={ai.trigger}
        >
          {draft && (
            <>
              <pre className="whitespace-pre-wrap rounded bg-white p-3 font-sans ring-1 ring-slate-200">{draft.report}</pre>
              <div>
                <div className="font-semibold">{t.ai.incomeBreakup}</div>
                <table className="mt-1 w-full text-left">
                  <tbody>
                    {draft.incomeComponents.map((c, i) => (
                      <tr key={i} className="border-b border-violet-100 align-top">
                        <td className="py-1 pr-2 font-medium">{c.source}</td>
                        <td className="py-1 pr-2 text-slate-600">{c.basis}</td>
                        <td className="py-1 text-right font-semibold whitespace-nowrap">{formatINR(c.annualAmount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-1 font-bold" colSpan={2}>{t.ai.estimated}</td>
                      <td className="pt-1 text-right font-bold whitespace-nowrap">{formatINR(draft.estimatedAnnualIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {draft.discrepancies.length > 0 && (
                <div className="rounded bg-yellow-50 p-2 text-yellow-900">
                  <div className="font-semibold">{t.ai.discrepancies}</div>
                  <ul className="list-inside list-disc">{draft.discrepancies.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
              {draft.followUpQuestions.length > 0 && (
                <div>
                  <div className="font-semibold">{t.ai.followUps}</div>
                  <ul className="list-inside list-disc">{draft.followUpQuestions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => {
                  setReport(draft.report);
                  setIncome(String(draft.estimatedAnnualIncome));
                }}
              >
                {t.ai.useDraft}
              </button>
            </>
          )}
        </AiCard>
      )}

      {canAct && !returning && (
        <>
          <div>
            <label className="label" htmlFor="report">{t.field.report}</label>
            <textarea id="report" name="report" rows={8} className="input" placeholder={t.field.reportPh} value={report} onChange={(e) => setReport(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="verifiedIncome">{t.field.verifiedIncome}</label>
              <input id="verifiedIncome" name="verifiedIncome" inputMode="numeric" className="input text-lg font-semibold" value={income} onChange={(e) => setIncome(e.target.value)} />
              {income && Number(income) > 0 && Number(income) !== app.declaredIncome && (
                <p className="mt-1 text-xs text-amber-800">
                  {t.app.declaredIncome}: {formatINR(app.declaredIncome)}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="visitedOn">{t.field.visitedOn}</label>
              <input id="visitedOn" name="visitedOn" type="date" className="input" defaultValue={today} max={today} />
            </div>
          </div>
        </>
      )}

      {canAct && returning && (
        <div>
          <label className="label" htmlFor="returnReason">{t.docCheck.returnReason}</label>
          <textarea id="returnReason" name="returnReason" rows={3} className="input" placeholder={t.docCheck.returnReasonPh} required />
        </div>
      )}

      {state?.error && <p className="text-sm font-semibold text-red-700" role="alert">{state.error}</p>}

      {canAct && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {returning ? (
            <>
              <button className="btn btn-primary sm:flex-1" disabled={submitting}>{t.field.returnBtn}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setReturning(false)}>✕</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary sm:flex-1" disabled={submitting || !report.trim() || !income}>{t.field.forward}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setReturning(true)}>{t.field.returnBtn}</button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
