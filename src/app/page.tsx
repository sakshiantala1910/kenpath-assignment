import Link from "next/link";
import { ReasonChips, StageChip } from "@/components/Chips";
import { Header } from "@/components/Header";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/i18n";
import { getDict } from "@/lib/lang";
import { listApplications } from "@/lib/repo";
import { priority } from "@/lib/rules";
import { ACTIVE_STAGES, STAGE_OWNER, toSlug, type Application } from "@/lib/types";

const TABS = ["mine", "active", "returned", "closed"] as const;
type Tab = (typeof TABS)[number];

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { lang, t } = await getDict();
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "mine";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const all = (await listApplications()).map((app) => ({ app, p: priority(app) }));
  const isMine = (a: Application) => STAGE_OWNER[a.stage] === user.role;
  const mine = all.filter(({ app }) => isMine(app));

  const tiles = [
    { label: t.dash.myQueue, value: mine.length, tone: "text-indigo-800" },
    { label: t.dash.overdue, value: mine.filter(({ p }) => p.daysLeft < 0).length, tone: "text-red-700" },
    { label: t.dash.dueSoon, value: mine.filter(({ p }) => p.daysLeft >= 0 && p.daysLeft <= 3).length, tone: "text-amber-700" },
    { label: t.dash.returned, value: all.filter(({ app }) => app.stage === "returned").length, tone: "text-slate-700" },
  ];

  const tabLabels: Record<Tab, string> = {
    mine: t.dash.attentionFirst,
    active: t.dash.allFiles,
    returned: t.dash.returned,
    closed: t.dash.closed,
  };

  let rows = all.filter(({ app }) => {
    if (tab === "mine") return isMine(app);
    if (tab === "active") return ACTIVE_STAGES.includes(app.stage);
    if (tab === "returned") return app.stage === "returned";
    return app.stage === "approved" || app.stage === "rejected";
  });
  if (q) {
    const needle = q.toLowerCase();
    rows = all.filter(({ app }) => app.id.toLowerCase().includes(needle) || app.applicantName.includes(q) || app.village.includes(q));
  }
  rows.sort((a, b) =>
    tab === "closed" ? b.app.updatedAt.localeCompare(a.app.updatedAt) : a.p.score - b.p.score || a.app.submittedAt.localeCompare(b.app.submittedAt),
  );

  return (
    <>
      <Header user={user} t={t} lang={lang} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <h1 className="mb-4 text-xl font-bold">{t.dash.greeting(user.name)}</h1>

        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="card p-4">
              <div className={`text-3xl font-bold ${tile.tone}`}>{tile.value}</div>
              <div className="text-sm text-slate-600">{tile.label}</div>
            </div>
          ))}
        </section>

        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {TABS.map((key) => (
              <Link
                key={key}
                href={key === "mine" ? "/" : `/?tab=${key}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
                  tab === key && !q ? "bg-indigo-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {tabLabels[key]}
              </Link>
            ))}
          </nav>
          <form className="md:w-72">
            <input name="q" defaultValue={q} placeholder={t.dash.search} className="input" aria-label={t.dash.search} />
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="card p-8 text-center text-slate-500">{t.dash.empty}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ app, p }) => {
              const owner = STAGE_OWNER[app.stage];
              const active = ACTIVE_STAGES.includes(app.stage);
              return (
                <li key={app.id}>
                  <Link
                    href={`/applications/${toSlug(app.id)}`}
                    className={`card block p-4 transition hover:border-indigo-300 hover:shadow-md ${
                      active && p.daysLeft < 0 ? "border-l-4 border-l-red-600" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold">{app.applicantName}</div>
                        <div className="text-sm text-slate-600">
                          {app.id} · {app.village} · {t.purposes[app.purpose]} · {formatINR(app.declaredIncome)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StageChip stage={app.stage} t={t} />
                        {owner && (
                          <span className={`text-xs font-semibold ${owner === user.role ? "text-indigo-700" : "text-slate-500"}`}>
                            {owner === user.role ? t.dash.yourTurn : t.dash.waitingFor(t.roles[owner])}
                          </span>
                        )}
                      </div>
                    </div>
                    {active && (
                      <div className="mt-3">
                        <ReasonChips reasons={p.reasons} t={t} />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
