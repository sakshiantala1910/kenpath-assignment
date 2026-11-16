import type { Application, DocType, Purpose } from "./types";

const DAY = 86_400_000;

// Documents the tehsil asks for, based on the income sources the applicant declared
export function requiredDocs(app: Application): DocType[] {
  const docs: DocType[] = ["aadhaar", "self_declaration"];
  const hasFamilyProof = app.documents.some((d) => d.type === "family_register");
  docs.push(hasFamilyProof ? "family_register" : "ration_card");
  const sources = new Set(app.incomeSources.map((s) => s.source));
  if (sources.has("salary")) docs.push("salary_slip");
  if (sources.has("agriculture")) docs.push("khatauni");
  return docs;
}

export type RuleIssue =
  | { kind: "missing_doc"; doc: DocType }
  | { kind: "sum_mismatch"; sum: number; declared: number };

// Deterministic checks that run on every file, with or without AI
export function ruleChecks(app: Application): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const attached = new Set(app.documents.map((d) => d.type));
  for (const doc of requiredDocs(app)) {
    if (!attached.has(doc)) issues.push({ kind: "missing_doc", doc });
  }
  const sum = app.incomeSources.reduce((a, s) => a + s.amount, 0);
  if (sum !== app.declaredIncome) issues.push({ kind: "sum_mismatch", sum, declared: app.declaredIncome });
  return issues;
}

export type Reason =
  | { kind: "overdue"; days: number }
  | { kind: "daysLeft"; days: number }
  | { kind: "neededBy"; purpose: Purpose; days: number }
  | { kind: "missingDocs"; count: number }
  | { kind: "incomeMismatch" }
  | { kind: "incomeGap" }
  | { kind: "resubmitted" };

export interface Priority {
  score: number; // lower = more urgent
  daysLeft: number;
  reasons: Reason[];
}

const daysBetween = (from: number, to: number) => Math.floor((to - from) / DAY);

// Ranks files by the earlier of the service deadline and the applicant's own deadline
export function priority(app: Application, now = Date.now()): Priority {
  const elapsed = daysBetween(new Date(app.submittedAt).getTime(), now);
  const daysLeft = app.slaDays - elapsed;
  const reasons: Reason[] = [];

  reasons.push(daysLeft < 0 ? { kind: "overdue", days: -daysLeft } : { kind: "daysLeft", days: daysLeft });

  let urgency = daysLeft;
  if (app.neededBy) {
    const until = Math.ceil((new Date(app.neededBy).getTime() - now) / DAY);
    if (until <= 10) reasons.push({ kind: "neededBy", purpose: app.purpose, days: until });
    urgency = Math.min(urgency, until);
  }

  if (app.stage === "doc_check") {
    const issues = ruleChecks(app);
    const missing = issues.filter((i) => i.kind === "missing_doc").length;
    if (missing) reasons.push({ kind: "missingDocs", count: missing });
    if (issues.some((i) => i.kind === "sum_mismatch")) reasons.push({ kind: "incomeMismatch" });
  }
  if (app.fieldReport && app.stage === "decision") {
    const gap = Math.abs(app.fieldReport.verifiedIncome - app.declaredIncome) / Math.max(app.declaredIncome, 1);
    if (gap > 0.2) reasons.push({ kind: "incomeGap" });
  }
  if (app.round > 1) reasons.push({ kind: "resubmitted" });

  return { score: urgency, daysLeft, reasons };
}
