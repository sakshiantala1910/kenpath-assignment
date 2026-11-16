import { formatDateTime, type Dict, type Lang } from "@/lib/i18n";
import type { AppEvent } from "@/lib/types";

const DOT: Record<AppEvent["action"], string> = {
  submitted: "bg-slate-400",
  resubmitted: "bg-sky-500",
  doc_check_passed: "bg-sky-600",
  field_report_submitted: "bg-amber-500",
  approved: "bg-emerald-600",
  rejected: "bg-red-600",
  returned_to_applicant: "bg-slate-500",
  returned_to_lekhpal: "bg-orange-500",
};

export function Timeline({ events, t, lang }: { events: AppEvent[]; t: Dict; lang: Lang }) {
  return (
    <ol className="relative ml-2 border-l-2 border-slate-200">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="relative pb-5 pl-5 last:pb-0">
          <span className={`absolute -left-[7px] top-1.5 size-3 rounded-full ring-4 ring-white ${DOT[e.action]}`} />
          <div className="font-semibold">{t.events[e.action]}</div>
          <div className="text-xs text-slate-500">
            {formatDateTime(e.at, lang)} · {e.actorName}
            {e.actorRole === "lekhpal" || e.actorRole === "tehsildar" ? ` (${t.roles[e.actorRole]})` : ""}
          </div>
          {e.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{e.note}</p>}
          {e.aiUse && (
            <span className="chip mt-1 bg-violet-50 text-violet-800 ring-1 ring-violet-200">✦ {t.aiUse[e.aiUse]}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
