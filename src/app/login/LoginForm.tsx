"use client";

import { useActionState, useRef } from "react";
import { login } from "@/app/actions";
import { dictionaries, type Lang } from "@/lib/i18n";

// Seeded demo accounts, so reviewers can switch roles in one tap
const DEMO = [
  { role: "lekhpal", username: "lekhpal", password: "Lekhpal@2026" },
  { role: "tehsildar", username: "tehsildar", password: "Tehsildar@2026" },
] as const;

export function LoginForm({ lang }: { lang: Lang }) {
  const t = dictionaries[lang];
  const [state, action, pending] = useActionState(login, undefined);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">{t.username}</label>
        <input ref={userRef} id="username" name="username" className="input" autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">{t.password}</label>
        <input ref={passRef} id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="text-sm font-semibold text-red-700" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{t.login}</button>

      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="mb-2 font-semibold text-slate-600">Demo</p>
        <div className="flex gap-2">
          {DEMO.map((d) => (
            <button
              key={d.role}
              type="button"
              className="btn btn-ghost flex-1 text-sm"
              onClick={() => {
                if (userRef.current && passRef.current) {
                  userRef.current.value = d.username;
                  passRef.current.value = d.password;
                }
              }}
            >
              {t.roles[d.role]}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
