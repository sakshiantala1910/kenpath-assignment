import { Header } from "@/components/Header";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import { computeMetrics } from "@/lib/metrics";
import { listApplications, listEvents } from "@/lib/repo";
import type { Stage } from "@/lib/types";

export default async function ImpactPage() {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const m = computeMetrics(await listApplications(), await listEvents());

  const tiles = [
    { label: t.impact.closed, value: String(m.closed), sub: `${t.impact.open}: ${m.open}` },
    { label: t.impact.avgDays, value: m.avgDaysToDecision.toFixed(1), sub: t.impact.days },
    { label: t.impact.slaRate, value: `${Math.round(m.withinSlaPct)}%`, sub: "" },
    { label: t.impact.returnRate, value: `${Math.round(m.returnedPct)}%`, sub: "" },
  ];
  const maxStage = Math.max(...Object.values(m.stageDays), 1);
  const aiTotal = Object.values(m.aiUse).reduce((a, b) => a + b, 0) || 1;
  const aiRows = [
    { key: "accepted", label: t.aiUse.accepted, color: "bg-emerald-500" },
    { key: "edited", label: t.aiUse.edited, color: "bg-violet-500" },
    { key: "overridden", label: t.aiUse.overridden, color: "bg-amber-500" },
    { key: "ignored", label: t.aiUse.ignored, color: "bg-slate-400" },
    { key: "none", label: "—", color: "bg-slate-200" },
  ] as const;

  return (
    <>
      <Header user={user} t={t} lang={lang} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <h1 className="text-xl font-bold">{t.impact.title}</h1>
        <p className="mb-4 text-sm text-slate-600">{t.impact.intro}</p>

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="card p-4">
              <div className="text-3xl font-bold text-indigo-800">{tile.value}</div>
              <div className="text-sm text-slate-600">{tile.label}</div>
              {tile.sub && <div className="text-xs text-slate-400">{tile.sub}</div>}
            </div>
          ))}
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-4 font-bold">{t.impact.stageTime}</h2>
            <ul className="space-y-3">
              {Object.entries(m.stageDays).map(([stage, days]) => (
                <li key={stage}>
                  <div className="flex justify-between text-sm">
                    <span>{t.stages[stage as Stage]}</span>
                    <span className="font-semibold">{days.toFixed(1)} {t.impact.days}</span>
                  </div>
                  <div className="mt-1 h-3 rounded bg-slate-100">
                    <div className="h-3 rounded bg-indigo-600" style={{ width: `${(days / maxStage) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-bold">{t.impact.aiUsage}</h2>
            <div className="mb-3 flex h-4 overflow-hidden rounded">
              {aiRows.map((r) => (
                <div key={r.key} className={r.color} style={{ width: `${(m.aiUse[r.key] / aiTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-1 text-sm">
              {aiRows.filter((r) => r.key !== "none").map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span className={`size-3 rounded-sm ${r.color}`} />
                  <span className="flex-1">{r.label}</span>
                  <span className="font-semibold">{m.aiUse[r.key]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">{t.impact.aiNote}</p>
          </section>
        </div>
      </main>
    </>
  );
}
