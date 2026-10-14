// =====================================================================
// Continuous Assurance — review forms.
//
// How each kind of finding is resolved: the fields a reviewer fills in and
// what each outcome does (actions through the executor path, the decision
// recorded, the next lifecycle step).
//
// Same API as the Continuous Compliance Console's Review forms page
// (graph.keyforge.ai/console#/forms), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET  /compliance/review-forms                     library (full forms)
//   GET  /compliance/review-forms/{code}/versions     every version of a code
//   GET  /compliance/review-forms/{code}/usage        definitions naming it
//   GET  /compliance/review-forms/{code}/submissions
//   GET  /compliance/review-forms/{code}/audit        FORM_* ledger rows
//   POST /compliance/review-forms/{code}/render       preview for an event
//   POST /compliance/review-forms/{code}/test         dry run
//   POST /compliance/review-forms/{code}/clone | /versions | /activate | /deprecate
// The form page reads the form itself from the library response.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";

export const REVIEW_FORMS_BASE = "/assurance-events/review-forms";

export interface ApiFormField {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  help?: string;
  sensitive?: boolean;
  options?: { source?: string; [param: string]: unknown };
  prefill?: string;
  visibleWhen?: string;
  validate?: { enum?: unknown[]; [rule: string]: unknown };
  [key: string]: unknown;
}

export interface ApiFormOutcome {
  id: string;
  label?: string;
  when?: string;
  actions?: Array<{ action: string; mode?: string; executor?: string; params?: Record<string, unknown> }>;
  decision?: { type?: string; justification?: string; [k: string]: unknown } | null;
  then?: string;
  thenArgs?: { until?: string; [k: string]: unknown };
  evidenceRefs?: string[];
  [key: string]: unknown;
}

export interface ApiReviewForm {
  formId: string;
  code: string;
  title: string;
  intent?: string;
  appliesTo?: { subjectKinds?: string[]; eventTypeCodes?: string[] };
  submitAuthority?: string;
  tags?: string[];
  fields: ApiFormField[];
  outcomes: ApiFormOutcome[];
  version: number;
  state: string;
  system: boolean;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  [key: string]: unknown;
}

/** Body of PUT /compliance/review-forms/{code} (the console's editable part of a form). */
export interface ReviewFormRequest {
  code: string;
  title: string;
  intent?: string;
  appliesTo?: { subjectKinds?: string[]; eventTypeCodes?: string[] };
  fields: ApiFormField[];
  outcomes: ApiFormOutcome[];
  submitAuthority?: string;
  tags?: string[];
}

export const toReviewFormRequest = (f: ApiReviewForm): ReviewFormRequest => ({
  code: f.code,
  title: f.title,
  intent: f.intent ?? "",
  appliesTo: f.appliesTo ?? { subjectKinds: ["*"] },
  fields: f.fields ?? [],
  outcomes: f.outcomes ?? [],
  submitAuthority: f.submitAuthority,
  tags: f.tags ?? [],
});

export interface FormFieldType { code: string; displayName?: string; needsOptions?: boolean; validate?: string[] }
export interface FormOptionSource { code: string; description?: string; parameters?: string[] }

/** Lookup SUBJECT_KIND (the console's list), "*" = any. */
export const SUBJECT_KINDS = [
  "*", "ENTITLEMENT", "ENTITLEMENT_ASSIGNMENT", "USER_ACCOUNT", "SERVICE_ACCOUNT", "NHI", "APPLICATION", "CREDENTIAL", "CLOUD_RESOURCE",
];
export const SUBMIT_AUTHORITIES = ["REVIEWER_OR_DECIDER", "REVIEWER", "DECIDER"];

export interface FormUsage {
  latestActiveVersion?: number | null;
  definitions?: Array<{ definitionId: string; code: string; version: number; state: string; asDefault?: boolean; rules?: string[] }>;
  byVersion?: unknown;
}

export interface FormSubmission {
  submissionId: string;
  submittedAt: string;
  eventId: string;
  formVersion: number;
  outcome?: string;
  result: string;
  submittedBy?: string;
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FormAuditRow {
  at: string;
  action: string;
  actor: { kind: string; ref?: string; principalId?: string };
  from?: string | null;
  to?: string | null;
  detail?: { version?: number; [k: string]: unknown };
  [key: string]: unknown;
}

/** React Query key shared by the list and the form page, so opening a form reuses the list response. */
export const REVIEW_FORMS_KEY = ["continuouscompliance", "review-forms"] as const;

const formPath = (code: string) => `/compliance/review-forms/${encodeURIComponent(code)}`;
const list = <T,>(v: T[] | unknown): T[] => (Array.isArray(v) ? v : []);

export const ReviewForms = {
  /** GET /compliance/review-forms — every form in full (fields and outcomes included). */
  fetchAll: async (): Promise<ApiReviewForm[]> => list(await ccRequest<ApiReviewForm[]>("GET", "/compliance/review-forms")),
  /** One form from the library response: the requested version, else the ACTIVE one, else the newest. */
  pick: (forms: ApiReviewForm[], code: string, version?: number): ApiReviewForm | undefined => {
    const same = forms.filter((f) => f.code === code);
    return (version ? same.find((x) => x.version === version) : undefined)
      ?? same.find((x) => x.state === "ACTIVE")
      ?? [...same].sort((x, y) => y.version - x.version)[0];
  },
  versions: async (code: string) => list<ApiReviewForm>(await ccRequest("GET", `${formPath(code)}/versions`)),
  usage: (code: string) => ccRequest<FormUsage>("GET", `${formPath(code)}/usage`),
  submissions: async (code: string) => list<FormSubmission>(await ccRequest("GET", `${formPath(code)}/submissions`)),
  audit: async (code: string) => list<FormAuditRow>(await ccRequest("GET", `${formPath(code)}/audit`)),
  clone: (code: string, body: { code: string; title?: string }) =>
    ccRequest<ApiReviewForm>("POST", `${formPath(code)}/clone`, { body }),
  /** PUT /compliance/review-forms/{code} — saves the tenant DRAFT of the code. */
  update: (code: string, body: ReviewFormRequest) => ccRequest<ApiReviewForm>("PUT", formPath(code), { body }),
  /** GET /compliance/review-forms/field-types — what a field may be, and the validate rules each type takes. */
  fieldTypes: async () => list<FormFieldType>(await ccRequest("GET", "/compliance/review-forms/field-types")),
  /** GET /compliance/review-forms/option-sources — where a choice field's options come from. */
  optionSources: async () => list<FormOptionSource>(await ccRequest("GET", "/compliance/review-forms/option-sources")),
  newVersion: (code: string) => ccRequest<ApiReviewForm>("POST", `${formPath(code)}/versions`),
  activate: (code: string, version?: number) =>
    ccRequest<ApiReviewForm>("POST", `${formPath(code)}/activate`, { query: { version: version ? String(version) : undefined } }),
  deprecate: (code: string, version?: number, force?: boolean) =>
    ccRequest<ApiReviewForm>("POST", `${formPath(code)}/deprecate`, { query: { version: version ? String(version) : undefined, force: force ? "true" : undefined } }),
};
