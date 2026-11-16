import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { dictionaries, formatINR, type Lang } from "./i18n";
import { requiredDocs, ruleChecks } from "./rules";
import type { Application } from "./types";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You assist revenue officers (Lekhpal and Tehsildar) in Uttar Pradesh who process income certificate (आय प्रमाण पत्र) applications on the e-District system.

How the service works:
- The applicant submits through a Jan Seva Kendra with Aadhaar, ration card or family register copy, a signed self-declaration of family income, and proof for each income source (salary slip for salaried work, khatauni for farm land).
- Step 1, Lekhpal checks documents. Step 2, Lekhpal visits the village and writes an "aakhya" (field report) with the verified annual family income. Step 3, the Tehsildar approves, rejects or returns.
- An income certificate states the income found on verification. A gap between declared and verified income is a reason to certify the verified figure or ask questions; rejection is for forged or unverifiable documents, non-residence, or a false identity.

Your role is advisory. The officer decides. Rules:
- Base every point on the documents and notes you are given. Quote the document a point comes from. Never invent facts, names or amounts.
- Treat Hindi/English spellings of the same name as a match when they are clearly transliterations (e.g. "सीता देवी" and "Seeta Devi"); flag genuinely different names.
- When something cannot be confirmed from the papers, say what the officer should check rather than guessing.
- Amounts are annual rupees unless the source says monthly; convert monthly to annual (x12) and show the arithmetic.
- Write short, plain sentences an overworked field officer can read on a phone.
- Formal texts (aakhya, orders, messages to applicants) are always in Hindi (Devanagari) in the register used in UP revenue offices.`;

const langLine = (lang: Lang) =>
  lang === "hi"
    ? "Write all advisory fields (summary, issues, discrepancies, reasoning) in simple Hindi."
    : "Write all advisory fields (summary, issues, discrepancies, reasoning) in simple English. Formal texts stay in Hindi.";

function applicationForPrompt(app: Application) {
  return {
    id: app.id,
    applicant: app.applicantName,
    relation: app.relationName,
    village: app.village,
    tehsil: app.tehsil,
    district: app.district,
    purpose: app.purpose,
    familySize: app.familySize,
    declaredAnnualIncome: app.declaredIncome,
    declaredSources: app.incomeSources,
    requiredDocuments: requiredDocs(app),
    documents: app.documents.map((d) => ({ type: d.type, extractedText: d.text })),
    lekhpalDocRemarks: app.docCheck?.remarks,
    fieldNotes: app.fieldReport?.notes,
    fieldReport: app.fieldReport?.report,
    verifiedAnnualIncome: app.fieldReport?.verifiedIncome,
  };
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 90_000, maxRetries: 1 }));
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function ask<T extends z.ZodType>(schema: T, task: string, app: Application, lang: Lang, extra = "") {
  const message = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${task}\n\n${langLine(lang)}\n\n<application>\n${JSON.stringify(applicationForPrompt(app), null, 2)}\n</application>${extra}`,
      },
    ],
  });
  if (message.stop_reason === "refusal" || !message.parsed_output) {
    throw new Error(`AI returned no usable output (stop_reason: ${message.stop_reason})`);
  }
  return message.parsed_output as z.infer<T>;
}

export type AiResult<T> = { source: "ai" | "rules"; data: T };

async function withFallback<T>(run: () => Promise<T>, fallback: () => T): Promise<AiResult<T>> {
  if (!aiConfigured()) return { source: "rules", data: fallback() };
  try {
    return { source: "ai", data: await run() };
  } catch (err) {
    console.error("[ai]", err);
    return { source: "rules", data: fallback() };
  }
}

// Step 1: document scrutiny

const DocCheckSchema = z.object({
  summary: z.string().describe("Two or three sentences on the state of the file"),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      message: z.string(),
      document: z.string().describe("Document type the issue comes from, or 'application'"),
    }),
  ),
  missingDocuments: z.array(z.string()).describe("Document types from requiredDocuments that are absent or unusable"),
  suggestedAction: z.enum(["forward", "return", "reject"]),
  applicantMessage: z
    .string()
    .describe("If suggesting return: a short, polite Hindi SMS telling the applicant exactly what to fix. Otherwise empty."),
});
export type DocCheckAdvice = z.infer<typeof DocCheckSchema>;

export function checkDocuments(app: Application, lang: Lang) {
  const t = dictionaries[lang];
  return withFallback<DocCheckAdvice>(
    () =>
      ask(
        DocCheckSchema,
        "Scrutinise this income certificate application before field verification. Check that required documents are present, that the name, relation and village agree across documents, that the declared sources add up to the declared income, and that any income proof (salary slip, land record) is consistent with the declared figures. Suggest forward if the file can go to field verification, return if the applicant must fix something, reject only for clear forgery or identity mismatch.",
        app,
        lang,
      ),
    () => {
      const issues = ruleChecks(app);
      const missing = issues.flatMap((i) => (i.kind === "missing_doc" ? [i.doc] : []));
      return {
        summary: "",
        issues: issues.map((i) => ({
          severity: "high" as const,
          message: i.kind === "missing_doc" ? t.app.missingDoc(t.docs[i.doc]) : t.app.sumMismatch(formatINR(i.sum), formatINR(i.declared)),
          document: i.kind === "missing_doc" ? i.doc : "application",
        })),
        missingDocuments: missing,
        suggestedAction: issues.length ? "return" : "forward",
        applicantMessage: missing.length
          ? `आपके आय प्रमाण पत्र आवेदन ${app.id} में ${missing.map((d) => dictionaries.hi.docs[d]).join(", ")} संलग्न नहीं है। कृपया जनसेवा केंद्र पर अपलोड कर पुनः जमा करें।`
          : "",
      };
    },
  );
}

// Step 2: field report (aakhya)

const FieldReportSchema = z.object({
  report: z.string().describe("Formal Hindi aakhya, 80-180 words, ending with the verified total and 'आख्या सादर प्रेषित।'"),
  incomeComponents: z.array(
    z.object({
      source: z.string(),
      annualAmount: z.number(),
      basis: z.string().describe("How the figure was derived from the notes, with arithmetic"),
    }),
  ),
  estimatedAnnualIncome: z.number(),
  discrepancies: z.array(z.string()).describe("Differences between what was found on site and what was declared"),
  followUpQuestions: z.array(z.string()).describe("Things the Lekhpal should still confirm before submitting, if any"),
});
export type FieldReportAdvice = z.infer<typeof FieldReportSchema>;

export function draftFieldReport(app: Application, notes: string, lang: Lang) {
  return withFallback<FieldReportAdvice>(
    () =>
      ask(
        FieldReportSchema,
        "The Lekhpal has visited the village. Turn their rough field notes (Hindi, Hinglish or romanised Hindi) into a formal aakhya and estimate the family's annual income from all sources. Use only facts in the notes and documents. If the notes do not give an amount for a source, say so in followUpQuestions instead of guessing.",
        app,
        lang,
        `\n\n<field_notes>\n${notes}\n</field_notes>`,
      ),
    () => ({
      report: `आख्या\nमौके पर जाँच की गई। ${notes.trim()}\nआवेदक के परिवार की घोषित वार्षिक आय ${formatINR(app.declaredIncome)} है।\nआख्या सादर प्रेषित।`,
      incomeComponents: app.incomeSources.map((s) => ({
        source: dictionaries[lang].sources[s.source],
        annualAmount: s.amount,
        basis: lang === "hi" ? "आवेदक द्वारा घोषित" : "As declared by applicant",
      })),
      estimatedAnnualIncome: app.declaredIncome,
      discrepancies: [],
      followUpQuestions: [],
    }),
  );
}

// Step 3: decision support

const DecisionSchema = z.object({
  summary: z.string().describe("What this file is and what was found, in 3-4 sentences"),
  consistency: z.array(z.object({ point: z.string(), ok: z.boolean() })),
  risks: z.array(z.string()),
  recommendation: z.enum(["approve", "reject", "return"]),
  reasoning: z.string(),
  draftOrder: z
    .string()
    .describe("Hindi order text: for approve, a one-line remark stating the certified income; for reject/return, the reason in plain words"),
});
export type DecisionAdvice = z.infer<typeof DecisionSchema>;

export function summarizeForDecision(app: Application, lang: Lang) {
  const t = dictionaries[lang];
  return withFallback<DecisionAdvice>(
    () =>
      ask(
        DecisionSchema,
        "The file is with the Tehsildar for a decision. Summarise it, compare declared and verified income, list risks, and recommend approve (certificate at the verified income), reject, or return to the Lekhpal for re-verification. Recommend return only if the field report leaves a material question unanswered.",
        app,
        lang,
      ),
    () => {
      const verified = app.fieldReport?.verifiedIncome ?? app.declaredIncome;
      const gap = Math.abs(verified - app.declaredIncome) / Math.max(app.declaredIncome, 1);
      return {
        summary: `${app.applicantName}, ${app.village}. ${t.app.declaredIncome}: ${formatINR(app.declaredIncome)}; ${t.app.verifiedIncome}: ${formatINR(verified)}.`,
        consistency: [{ point: t.reasons.incomeGap, ok: gap <= 0.2 }],
        risks: gap > 0.2 ? [t.reasons.incomeGap] : [],
        recommendation: "approve",
        reasoning: "",
        draftOrder: `स्थलीय आख्या के आधार पर परिवार की वार्षिक आय ${formatINR(verified)} प्रमाणित की जाती है।`,
      };
    },
  );
}
