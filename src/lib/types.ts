export type Role = "lekhpal" | "tehsildar";

export type Stage =
  | "doc_check"
  | "field_verification"
  | "decision"
  | "approved"
  | "rejected"
  | "returned";

export const ACTIVE_STAGES: Stage[] = ["doc_check", "field_verification", "decision"];

// Which role works on which stage
export const STAGE_OWNER: Partial<Record<Stage, Role>> = {
  doc_check: "lekhpal",
  field_verification: "lekhpal",
  decision: "tehsildar",
};

export type DocType =
  | "aadhaar"
  | "ration_card"
  | "family_register"
  | "self_declaration"
  | "salary_slip"
  | "khatauni"
  | "other";

export interface AppDocument {
  type: DocType;
  // Text as extracted from the scanned upload on the e-District portal
  text: string;
}

export type IncomeSourceType = "agriculture" | "wages" | "salary" | "business" | "pension" | "other";

export interface IncomeSource {
  source: IncomeSourceType;
  amount: number; // annual, INR
}

export type Purpose = "scholarship" | "ews" | "pension" | "admission" | "other";

export interface DocCheck {
  checklist: Partial<Record<DocType, boolean>>;
  remarks: string;
}

export interface FieldReport {
  notes: string;
  report: string;
  verifiedIncome: number;
  visitedOn: string;
}

export interface Decision {
  outcome: "approved" | "rejected";
  reason: string;
  certificateNo?: string;
  at: string;
  by: string;
}

export interface Application {
  id: string;
  applicantName: string;
  relationName: string; // father's / husband's name
  gender: "M" | "F";
  mobile: string;
  village: string;
  tehsil: string;
  district: string;
  purpose: Purpose;
  neededBy?: string; // ISO date, e.g. scholarship deadline
  declaredIncome: number;
  incomeSources: IncomeSource[];
  familySize: number;
  documents: AppDocument[];
  submittedAt: string;
  slaDays: number;
  stage: Stage;
  round: number; // increments each time the applicant resubmits
  docCheck?: DocCheck;
  fieldReport?: FieldReport;
  decision?: Decision;
  returnReason?: string;
  updatedAt: string;
}

export type EventAction =
  | "submitted"
  | "resubmitted"
  | "doc_check_passed"
  | "field_report_submitted"
  | "approved"
  | "rejected"
  | "returned_to_applicant"
  | "returned_to_lekhpal";

// Application ids contain slashes (IC/2026/1041); URLs use dashes
export const toSlug = (id: string) => id.replaceAll("/", "-");
export const fromSlug = (slug: string) => slug.replaceAll("-", "/");

export type AiUse = "accepted" | "edited" | "overridden" | "ignored";

export interface AppEvent {
  id: number;
  applicationId: string;
  at: string;
  actorName: string;
  actorRole: Role | "applicant" | "system";
  action: EventAction;
  fromStage: Stage | null;
  toStage: Stage | null;
  note: string;
  aiUse: AiUse | null;
}

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: Role;
}
