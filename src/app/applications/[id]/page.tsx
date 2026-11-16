import Link from "next/link";
import { notFound } from "next/navigation";
import { simulateResubmit } from "@/app/actions";
import { ReasonChips, StageChip } from "@/components/Chips";
import { Header } from "@/components/Header";
import { Timeline } from "@/components/Timeline";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR, type Dict } from "@/lib/i18n";
import { getDict } from "@/lib/lang";
import { getApplication, listEvents } from "@/lib/repo";
import { priority, requiredDocs, ruleChecks } from "@/lib/rules";
import { ACTIVE_STAGES, STAGE_OWNER, fromSlug, toSlug, type AppEvent, type Application, type Stage } from "@/lib/types";
import { DecisionPanel } from "./DecisionPanel";
import { DocCheckPanel } from "./DocCheckPanel";
import { FieldPanel } from "./FieldPanel";

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const { id } = await params;
  const app = await getApplication(fromSlug(id));
  if (!app) notFound();
  const events = await listEvents(app.id);

  const owner = STAGE_OWNER[app.stage];
  const canAct = owner === user.role;
  const active = ACTIVE_STAGES.includes(app.stage);

  return (
    <>
      <Header user={user} t={t} lang={lang} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <Link href="/" className="text-sm font-semibold text-indigo-700 hover:underline">{t.app.back}</Link>

        <div className="mt-2 mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{app.applicantName}</h1>
            <p className="text-sm text-slate-600">
              {app.id} · {t.app.submitted} {formatDate(app.submittedAt, lang)}
              {app.round > 1 && ` · ${t.app.round(app.round)}`}
            </p>
          </div>
          <StageChip stage={app.stage} t={t} />
        </div>

        {active && (
          <div className="mb-4">
            <ReasonChips reasons={priority(app).reasons} t={t} />
          </div>
        )}

        <Stepper stage={app.stage} events={events} t={t} />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <aside className="space-y-5 lg:order-1">
            <Details app={app} t={t} lang={lang} />
            {app.stage !== "doc_check" && <Documents app={app} t={t} />}
          </aside>

          <section className="space-y-5 lg:order-2">
            {active && !canAct && owner && (
              <p className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t.app.notYourStep(t.roles[owner])}</p>
            )}

            {app.stage === "doc_check" && (
              <DocCheckPanel
                app={app}
                lang={lang}
                canAct={canAct}
                required={requiredDocs(app)}
                ruleIssues={ruleChecks(app)}
              />
            )}
            {app.stage === "field_verification" && <FieldPanel app={app} lang={lang} canAct={canAct} />}
            {app.stage === "decision" && <DecisionPanel app={app} lang={lang} canAct={canAct} />}

            {app.stage === "returned" && (
              <div className="card p-5">
                <h2 className="mb-2 text-lg font-bold">{t.returned.title}</h2>
                <p className="label">{t.returned.reason}</p>
                <p className="mb-4 whitespace-pre-line rounded-lg bg-slate-50 p-3">{app.returnReason}</p>
                <form action={simulateResubmit}>
                  <input type="hidden" name="id" value={app.id} />
                  <button className="btn btn-ghost">{t.returned.simulate}</button>
                </form>
                <p className="mt-2 text-xs text-slate-500">{t.returned.simulateHint}</p>
              </div>
            )}

            {(app.stage === "approved" || app.stage === "rejected") && app.decision && (
              <div className={`card p-5 ${app.stage === "approved" ? "border-emerald-200" : "border-red-200"}`}>
                <h2 className="mb-1 text-lg font-bold">{t.stages[app.stage]}</h2>
                <p className="text-sm text-slate-600">{t.app.closedNote}</p>
                {app.decision.reason && <p className="mt-3 whitespace-pre-line">{app.decision.reason}</p>}
                {app.stage === "approved" && (
                  <Link href={`/applications/${toSlug(app.id)}/certificate`} className="btn btn-success mt-4">
                    {t.app.viewCertificate}
                  </Link>
                )}
              </div>
            )}

            <div className="card p-5">
              <h2 className="mb-4 text-lg font-bold">{t.app.history}</h2>
              <Timeline events={events} t={t} lang={lang} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

const COMPLETES_STEP = new Set<AppEvent["action"]>(["doc_check_passed", "field_report_submitted", "approved", "rejected"]);

function Stepper({ stage, events, t }: { stage: Stage; events: AppEvent[]; t: Dict }) {
  const steps: Stage[] = ["doc_check", "field_verification", "decision"];
  const completed = new Set(events.filter((e) => COMPLETES_STEP.has(e.action)).map((e) => e.fromStage));
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => {
        const isCurrent = stage === s;
        const done = !isCurrent && completed.has(s);
        return (
          <li
            key={s}
            className={`rounded-lg border-2 px-3 py-2 text-sm ${
              isCurrent ? "border-indigo-600 bg-indigo-50" : done ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-xs text-slate-500">{t.stepOf(i + 1)}</div>
            <div className="font-semibold">
              {done && "✓ "}
              {t.stages[s]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Details({ app, t, lang }: { app: Application; t: Dict; lang: "hi" | "en" }) {
  const rows: [string, string][] = [
    [t.app.relation, app.relationName],
    [t.app.village, `${app.village}, ${app.tehsil}, ${app.district}`],
    [t.app.mobile, app.mobile],
    [t.app.purpose, t.purposes[app.purpose] + (app.neededBy ? ` (${formatDate(app.neededBy, lang)})` : "")],
    [t.app.familySize, String(app.familySize)],
  ];
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-lg font-bold">{t.app.applicant}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">{t.app.declaredIncome}</span>
          <span className="font-bold">{formatINR(app.declaredIncome)}</span>
        </div>
        <ul className="mt-1 text-sm text-slate-600">
          {app.incomeSources.map((s) => (
            <li key={s.source} className="flex justify-between">
              <span>· {t.sources[s.source]}</span>
              <span>{formatINR(s.amount)}</span>
            </li>
          ))}
        </ul>
        {app.fieldReport && (
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="text-slate-600">{t.app.verifiedIncome}</span>
            <span className="font-bold text-indigo-800">{formatINR(app.fieldReport.verifiedIncome)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Documents({ app, t }: { app: Application; t: Dict }) {
  if (app.documents.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-lg font-bold">{t.app.documents}</h2>
      <ul className="space-y-2">
        {app.documents.map((d) => (
          <li key={d.type}>
            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer font-semibold">
                {app.docCheck?.checklist[d.type] ? "✓ " : ""}
                {t.docs[d.type]}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-700">{d.text}</pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
