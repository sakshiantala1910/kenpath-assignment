"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkDocuments, draftFieldReport, summarizeForDecision } from "@/lib/ai";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { dictionaries } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { findUser, getApplication, saveWithEvent } from "@/lib/repo";
import { requiredDocs } from "@/lib/rules";
import { STAGE_OWNER, toSlug, type AiUse, type Application, type DocType, type SessionUser, type Stage } from "@/lib/types";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = await findUser(str(fd, "username").toLowerCase());
  if (!user || !(await bcrypt.compare(str(fd, "password"), user.passwordHash))) {
    return { error: dictionaries[await getLang()].loginError };
  }
  await createSession({ id: user.id, username: user.username, name: user.name, role: user.role });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLang(lang: "hi" | "en") {
  (await cookies()).set("lang", lang, { path: "/", maxAge: 365 * 24 * 60 * 60 });
}

// Loads the file and confirms the signed-in officer owns its current step
async function authorize(id: string, stage: Stage): Promise<{ user: SessionUser; app: Application }> {
  const user = await getSession();
  if (!user) redirect("/login");
  const app = await getApplication(id);
  if (!app) throw new Error("Application not found");
  if (app.stage !== stage || STAGE_OWNER[stage] !== user.role) throw new Error("Not allowed at this step");
  return { user, app };
}

const done = (app: Application) => redirect(`/applications/${toSlug(app.id)}`);

// How the officer's final text/decision relates to what the AI proposed
function aiUseFor(suggested: string, chosen: string, aiText?: string, finalText?: string): AiUse | null {
  if (!suggested) return null;
  if (suggested !== chosen) return "overridden";
  if (aiText === undefined || !aiText) return "accepted";
  return aiText.trim() === (finalText ?? "").trim() ? "accepted" : "edited";
}

// ---- AI assistance (advisory, nothing is saved) ----

export async function aiCheckDocuments(id: string) {
  const { app } = await authorize(id, "doc_check");
  return checkDocuments(app, await getLang());
}

export async function aiDraftReport(id: string, notes: string) {
  const { app } = await authorize(id, "field_verification");
  return draftFieldReport(app, notes, await getLang());
}

export async function aiSummarize(id: string) {
  const { app } = await authorize(id, "decision");
  return summarizeForDecision(app, await getLang());
}

// ---- Step 1: document check ----

export async function submitDocCheck(_: FormState, fd: FormData): Promise<FormState> {
  const { user, app } = await authorize(str(fd, "id"), "doc_check");
  const t = dictionaries[await getLang()];
  const outcome = str(fd, "outcome");
  const checked = new Set(fd.getAll("checklist").map(String) as DocType[]);
  const remarks = str(fd, "remarks");
  const returnReason = str(fd, "returnReason");
  const aiSuggested = str(fd, "aiSuggested");

  app.docCheck = {
    checklist: Object.fromEntries(app.documents.map((d) => [d.type, checked.has(d.type)])),
    remarks,
  };

  if (outcome === "forward") {
    if (requiredDocs(app).some((d) => !checked.has(d))) return { error: t.docCheck.needAllChecked };
    app.stage = "field_verification";
    await saveWithEvent(app, {
      actorName: user.name,
      actorRole: user.role,
      action: "doc_check_passed",
      fromStage: "doc_check",
      toStage: app.stage,
      note: remarks,
      aiUse: aiUseFor(aiSuggested, "forward"),
    });
  } else if (outcome === "return" || outcome === "reject") {
    if (!returnReason) return { error: t.decision.reasonRequired };
    if (outcome === "return") {
      app.stage = "returned";
      app.returnReason = returnReason;
    } else {
      app.stage = "rejected";
      app.decision = { outcome: "rejected", reason: returnReason, at: new Date().toISOString(), by: user.name };
    }
    await saveWithEvent(app, {
      actorName: user.name,
      actorRole: user.role,
      action: outcome === "return" ? "returned_to_applicant" : "rejected",
      fromStage: "doc_check",
      toStage: app.stage,
      note: returnReason,
      aiUse: aiUseFor(aiSuggested, outcome, str(fd, "aiMessage"), returnReason),
    });
  } else {
    return { error: "Unknown action" };
  }
  done(app);
}

// ---- Step 2: field verification ----

export async function submitFieldReport(_: FormState, fd: FormData): Promise<FormState> {
  const { user, app } = await authorize(str(fd, "id"), "field_verification");
  const t = dictionaries[await getLang()];
  const outcome = str(fd, "outcome");
  const notes = str(fd, "notes");
  const report = str(fd, "report");
  const aiReport = str(fd, "aiReport");

  if (outcome === "return") {
    const reason = str(fd, "returnReason");
    if (!reason) return { error: t.decision.reasonRequired };
    app.stage = "returned";
    app.returnReason = reason;
    await saveWithEvent(app, {
      actorName: user.name,
      actorRole: user.role,
      action: "returned_to_applicant",
      fromStage: "field_verification",
      toStage: "returned",
      note: reason,
      aiUse: null,
    });
    done(app);
  }

  const verifiedIncome = Number(str(fd, "verifiedIncome").replace(/[,₹\s]/g, ""));
  if (!report || !Number.isFinite(verifiedIncome) || verifiedIncome <= 0) {
    return { error: `${t.field.report} / ${t.field.verifiedIncome}` };
  }
  app.fieldReport = { notes, report, verifiedIncome, visitedOn: str(fd, "visitedOn") || new Date().toISOString() };
  app.stage = "decision";
  await saveWithEvent(app, {
    actorName: user.name,
    actorRole: user.role,
    action: "field_report_submitted",
    fromStage: "field_verification",
    toStage: "decision",
    note: `${t.app.verifiedIncome}: ₹${verifiedIncome.toLocaleString("en-IN")}`,
    aiUse: aiReport ? aiUseFor("draft", "draft", aiReport, report) : null,
  });
  done(app);
}

// ---- Step 3: Tehsildar decision ----

export async function submitDecision(_: FormState, fd: FormData): Promise<FormState> {
  const { user, app } = await authorize(str(fd, "id"), "decision");
  const t = dictionaries[await getLang()];
  const outcome = str(fd, "outcome");
  const reason = str(fd, "reason");
  const aiUse = aiUseFor(str(fd, "aiRecommendation"), outcome, str(fd, "aiOrder"), reason);
  const now = new Date().toISOString();

  if (outcome !== "approve" && !reason) return { error: t.decision.reasonRequired };

  if (outcome === "approve") {
    app.stage = "approved";
    app.decision = {
      outcome: "approved",
      reason,
      at: now,
      by: user.name,
      certificateNo: `UP-BBK-IC-${new Date().getFullYear()}${app.id.split("/").pop()}`,
    };
  } else if (outcome === "reject") {
    app.stage = "rejected";
    app.decision = { outcome: "rejected", reason, at: now, by: user.name };
  } else if (outcome === "return") {
    app.stage = "field_verification";
  } else {
    return { error: "Unknown action" };
  }

  await saveWithEvent(app, {
    actorName: user.name,
    actorRole: user.role,
    action: outcome === "approve" ? "approved" : outcome === "reject" ? "rejected" : "returned_to_lekhpal",
    fromStage: "decision",
    toStage: app.stage,
    note: reason,
    aiUse,
  });
  done(app);
}

// ---- Demo only: the applicant fixes the gap and resubmits ----

export async function simulateResubmit(fd: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const app = await getApplication(str(fd, "id"));
  if (!app || app.stage !== "returned") throw new Error("Not returned");
  const attached = new Set(app.documents.map((d) => d.type));
  for (const doc of requiredDocs(app)) {
    if (!attached.has(doc)) {
      app.documents.push({
        type: doc,
        text: `${dictionaries.hi.docs[doc]}\nमैं ${app.applicantName}, ${app.relationName}, निवासी ग्राम ${app.village}, घोषणा करती/करता हूँ कि मेरे परिवार की वार्षिक आय ₹${app.declaredIncome.toLocaleString("en-IN")} है।\n(पुनः जमा के साथ संलग्न)`,
      });
    }
  }
  app.stage = "doc_check";
  app.round += 1;
  app.returnReason = undefined;
  await saveWithEvent(app, {
    actorName: "जनसेवा केंद्र",
    actorRole: "applicant",
    action: "resubmitted",
    fromStage: "returned",
    toStage: "doc_check",
    note: "",
  });
  done(app);
}
