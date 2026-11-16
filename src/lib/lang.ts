import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get("lang")?.value === "en" ? "en" : "hi";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
