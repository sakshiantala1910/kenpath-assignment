import Link from "next/link";
import { logout } from "@/app/actions";
import type { Dict, Lang } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";
import { LangToggle } from "./LangToggle";

export function Header({ user, t, lang }: { user: SessionUser; t: Dict; lang: Lang }) {
  return (
    <header className="no-print bg-indigo-800 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-auto leading-tight">
          <div className="text-lg font-bold">{t.appName}</div>
          <div className="text-xs text-indigo-200">{t.appSub}</div>
        </Link>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/" className="hover:underline">{t.nav.queue}</Link>
          <Link href="/impact" className="hover:underline">{t.nav.impact}</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">
            {user.name} · <span className="text-indigo-200">{t.roles[user.role]}</span>
          </span>
          <LangToggle lang={lang} />
          <form action={logout}>
            <button className="rounded-md px-2 py-1 text-indigo-100 hover:bg-white/10">{t.logout}</button>
          </form>
        </div>
      </div>
    </header>
  );
}
