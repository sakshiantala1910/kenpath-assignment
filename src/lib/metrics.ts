import type { AiUse, AppEvent, Application, Stage } from "./types";

const DAY = 86_400_000;
const STEPS: Stage[] = ["doc_check", "field_verification", "decision"];

export interface Metrics {
  closed: number;
  open: number;
  avgDaysToDecision: number;
  withinSlaPct: number;
  returnedPct: number;
  stageDays: Record<string, number>;
  aiUse: Record<AiUse | "none", number>;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeMetrics(apps: Application[], events: AppEvent[]): Metrics {
  const byApp = new Map<string, AppEvent[]>();
  for (const e of events) byApp.set(e.applicationId, [...(byApp.get(e.applicationId) ?? []), e]);

  const closedApps = apps.filter((a) => a.stage === "approved" || a.stage === "rejected");
  const turnaround = closedApps.map((a) => (new Date(a.decision?.at ?? a.updatedAt).getTime() - new Date(a.submittedAt).getTime()) / DAY);

  // Time spent in each step: from the event that entered it to the event that left it
  const stageSpans: Record<string, number[]> = Object.fromEntries(STEPS.map((s) => [s, []]));
  for (const evs of byApp.values()) {
    for (let i = 0; i < evs.length; i++) {
      const stage = evs[i].toStage;
      if (!stage || !(stage in stageSpans)) continue;
      const exit = evs.slice(i + 1).find((e) => e.fromStage === stage);
      if (exit) stageSpans[stage].push((new Date(exit.at).getTime() - new Date(evs[i].at).getTime()) / DAY);
    }
  }

  const processed = apps.filter((a) => byApp.get(a.id)?.some((e) => e.fromStage === "doc_check"));
  const returned = processed.filter((a) => byApp.get(a.id)?.some((e) => e.action === "returned_to_applicant"));

  const aiUse: Metrics["aiUse"] = { accepted: 0, edited: 0, overridden: 0, ignored: 0, none: 0 };
  for (const e of events) {
    if (e.actorRole !== "lekhpal" && e.actorRole !== "tehsildar") continue;
    aiUse[e.aiUse ?? "none"]++;
  }

  return {
    closed: closedApps.length,
    open: apps.length - closedApps.length,
    avgDaysToDecision: avg(turnaround),
    withinSlaPct: closedApps.length ? (100 * turnaround.filter((d, i) => d <= closedApps[i].slaDays).length) / closedApps.length : 0,
    returnedPct: processed.length ? (100 * returned.length) / processed.length : 0,
    stageDays: Object.fromEntries(STEPS.map((s) => [s, avg(stageSpans[s])])),
    aiUse,
  };
}
