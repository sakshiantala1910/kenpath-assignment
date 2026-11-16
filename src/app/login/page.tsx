import { redirect } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { getSession } from "@/lib/auth";
import { getDict } from "@/lib/lang";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const { lang, t } = await getDict();
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-800 to-indigo-950 px-4 py-10">
      <div className="mb-6 text-center text-white">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-white/10 text-2xl">₹</div>
        <h1 className="text-2xl font-bold">{t.appName}</h1>
        <p className="text-indigo-200">{t.appSub}</p>
      </div>
      <div className="card w-full max-w-sm p-6">
        <LoginForm lang={lang} />
      </div>
      <div className="mt-4 text-white"><LangToggle lang={lang} /></div>
    </main>
  );
}
