import type { Dict } from "@/lib/i18n";
import type { Reason } from "@/lib/rules";
import type { Stage } from "@/lib/types";

const STAGE_STYLE: Record<Stage, string> = {
  doc_check: "bg-sky-100 text-sky-900",
  field_verification: "bg-amber-100 text-amber-900",
  decision: "bg-violet-100 text-violet-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  returned: "bg-slate-200 text-slate-800",
};

export function StageChip({ stage, t }: { stage: Stage; t: Dict }) {
  return <span className={`chip ${STAGE_STYLE[stage]}`}>{t.stages[stage]}</span>;
}

export function reasonText(r: Reason, t: Dict): string {
  switch (r.kind) {
    case "overdue": return t.reasons.overdue(r.days);
    case "daysLeft": return t.reasons.daysLeft(r.days);
    case "neededBy": return t.reasons.neededBy(t.purposes[r.purpose], r.days);
    case "missingDocs": return t.reasons.missingDocs(r.count);
    case "incomeMismatch": return t.reasons.incomeMismatch;
    case "incomeGap": return t.reasons.incomeGap;
    case "resubmitted": return t.reasons.resubmitted;
  }
}

function reasonStyle(r: Reason): string {
  if (r.kind === "overdue") return "bg-red-600 text-white";
  if (r.kind === "daysLeft") return r.days <= 3 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700";
  if (r.kind === "neededBy") return r.days <= 5 ? "bg-orange-100 text-orange-900 ring-1 ring-orange-300" : "bg-slate-100 text-slate-700";
  if (r.kind === "resubmitted") return "bg-sky-50 text-sky-800";
  return "bg-yellow-100 text-yellow-900";
}

export function ReasonChips({ reasons, t }: { reasons: Reason[]; t: Dict }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        <span key={i} className={`chip ${reasonStyle(r)}`}>{reasonText(r, t)}</span>
      ))}
    </div>
  );
}
