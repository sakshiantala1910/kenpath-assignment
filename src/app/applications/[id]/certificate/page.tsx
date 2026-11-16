import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/i18n";
import { getDict } from "@/lib/lang";
import { getApplication } from "@/lib/repo";
import { fromSlug, toSlug } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export default async function CertificatePage({ params }: PageProps<"/applications/[id]/certificate">) {
  await requireUser();
  const { lang, t } = await getDict();
  const app = await getApplication(fromSlug((await params).id));
  if (!app || app.stage !== "approved" || !app.decision || !app.fieldReport) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/applications/${toSlug(app.id)}`} className="text-sm font-semibold text-indigo-700 hover:underline">
          ← {app.applicantName}
        </Link>
        <PrintButton label={t.cert.print} />
      </div>

      <article className="relative border-4 border-double border-slate-700 bg-white p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold text-slate-100 -rotate-12 select-none">
          DEMO
        </div>
        <div className="relative">
          <p className="text-center text-sm font-semibold">{t.cert.gov}</p>
          <h1 className="my-4 text-center text-3xl font-bold">{t.cert.title}</h1>
          <p className="mb-6 text-center text-sm">
            {t.cert.no}: <b>{app.decision.certificateNo}</b> · {t.cert.date}: {formatDate(app.decision.at, lang)}
          </p>
          <p className="text-lg leading-loose">
            {t.cert.body(app.applicantName, app.relationName, app.village, app.tehsil, app.district, formatINR(app.fieldReport.verifiedIncome))}
          </p>
          <p className="mt-4 text-sm text-slate-600">{t.cert.validity}</p>
          <div className="mt-12 flex justify-between text-sm">
            <div>{app.id}</div>
            <div className="text-right">
              <div className="font-semibold">{app.decision.by}</div>
              <div>{t.roles.tehsildar}, {app.tehsil}</div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-red-700">{t.cert.demo}</p>
        </div>
      </article>
    </main>
  );
}
