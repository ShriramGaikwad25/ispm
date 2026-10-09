// =====================================================================
// Continuous Assurance — review forms.
//
// How each kind of finding is resolved: the fields a reviewer fills in and
// what each outcome does (actions through the executor path, the decision
// recorded, the next lifecycle step).
//
// Live data from the same API as the Continuous Compliance Console's Review
// forms page (graph.keyforge.ai/console#/forms), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET /compliance/review-forms   → ApiReviewForm[] (full forms)
// The form page reads its form from that same response; there is no
// per-form call. The API's form is mapped onto the shapes the pages render.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";

export const REVIEW_FORMS_BASE = "/assurance-events/review-forms";

/** Decision a form outcome records (labels as the consoles show them). */
export const DECISION_LABEL: Record<string, string> = {
  REMEDIATE: "Fix",
  REVOKE: "Remove access",
  APPROVE_WITH_MITIGATION: "Keep with control",
  ACCEPT_RISK: "Accept risk",
  FALSE_POSITIVE: "Not an issue",
  DEFER: "Defer",
};

// ---------- API shapes (GET /compliance/review-forms) ----------

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
}

export interface ApiFormOutcome {
  id: string;
  label?: string;
  when?: string;
  actions?: Array<{ action: string; mode?: string; executor?: string; params?: Record<string, unknown> }>;
  decision?: { type?: string; justification?: string; [k: string]: unknown };
  then?: string;
  evidenceRefs?: string[];
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
}

// ---------- Shapes the pages render ----------

export interface ReviewFormField {
  key: string;
  label: string;
  type: string;
  options?: { fact?: string; values?: string[] };
  recommend?: { recommender: string };
  default?: string | number | boolean;
  showFor?: string[];
}

export interface ReviewFormOutcome {
  code: string;
  label: string;
  decision: string;
  primary?: boolean;
  fields?: string[];
  action?: { type: string; when?: string };
  change?: string;
  workflow?: string;
  justification?: string;
  expiry?: string;
  then?: string;
}

export interface ReviewForm {
  code: string;
  name: string;
  purpose?: string;
  eventTypes: string[];
  summary?: string;
  facts?: Array<{ fact: string; label: string }>;
  fields?: ReviewFormField[];
  outcomes: ReviewFormOutcome[];
  recommendation?: { rules: Array<{ when?: string; outcome: string; reason?: string }> };
  bulk?: boolean;
  isActive?: boolean;
  source: "shipped" | "tenant";
  version: number;
  hasShipped?: boolean;
}

export interface ReviewFormListItem {
  code: string;
  name: string;
  purpose?: string;
  eventTypes: string[];
  outcomes: string[];
  bulk: boolean;
  version: number;
  source: "shipped" | "tenant";
  isActive: boolean;
}

// ---------- Mapping ----------

/** Event types the form applies to; falls back to its subject kinds ("*" = any). */
const appliesTo = (f: ApiReviewForm): string[] => {
  const types = f.appliesTo?.eventTypeCodes ?? [];
  if (types.length) return types;
  const kinds = f.appliesTo?.subjectKinds ?? [];
  return kinds.length ? kinds : ["*"];
};

const outcomeLabel = (o: ApiFormOutcome) => o.label || o.id;

function toListItem(f: ApiReviewForm): ReviewFormListItem {
  return {
    code: f.code,
    name: f.title,
    purpose: f.intent,
    eventTypes: appliesTo(f),
    outcomes: (f.outcomes ?? []).map(outcomeLabel),
    bulk: (f.tags ?? []).some((t) => /bulk/i.test(t)),
    version: f.version,
    source: f.system ? "shipped" : "tenant",
    isActive: f.state === "ACTIVE",
  };
}

function toForm(f: ApiReviewForm): ReviewForm {
  return {
    code: f.code,
    name: f.title,
    purpose: f.intent,
    eventTypes: appliesTo(f),
    fields: (f.fields ?? []).map((fd) => ({
      key: fd.name,
      label: fd.label || fd.name,
      type: fd.type,
      options: fd.options?.source
        ? { fact: fd.options.source }
        : fd.validate?.enum ? { values: fd.validate.enum.map(String) } : undefined,
      default: fd.prefill,
      showFor: fd.visibleWhen ? [fd.visibleWhen] : undefined,
    })),
    outcomes: (f.outcomes ?? []).map((o) => {
      const actions = o.actions ?? [];
      return {
        code: o.id,
        label: outcomeLabel(o),
        decision: o.decision?.type ?? "—",
        action: actions.length ? { type: actions.map((a) => a.action).join(", "), when: o.when } : undefined,
        justification: o.decision?.justification ? `from ${o.decision.justification}` : undefined,
        then: o.then || "CLOSE",
      };
    }),
    isActive: f.state === "ACTIVE",
    source: f.system ? "shipped" : "tenant",
    version: f.version,
  };
}

// ---------- API ----------

/** React Query key shared by the list and the form page, so opening a form reuses the list response. */
export const REVIEW_FORMS_KEY = ["continuouscompliance", "review-forms"] as const;

export const ReviewForms = {
  /** GET /compliance/review-forms — every form in full (fields and outcomes included). */
  fetchAll: async (): Promise<ApiReviewForm[]> => {
    const forms = await ccRequest<ApiReviewForm[]>("GET", "/compliance/review-forms");
    return Array.isArray(forms) ? forms : [];
  },
  /** List rows for the Review Forms table. */
  toListItems: (forms: ApiReviewForm[]): ReviewFormListItem[] => forms.map(toListItem),
  /**
   * One form, taken from the list response (no GET /compliance/review-forms/{code}):
   * the requested version, else the ACTIVE one, else the newest.
   */
  pick: (forms: ApiReviewForm[], code: string, version?: number): ReviewForm | undefined => {
    const same = forms.filter((f) => f.code === code);
    const f = (version ? same.find((x) => x.version === version) : undefined)
      ?? same.find((x) => x.state === "ACTIVE")
      ?? [...same].sort((x, y) => y.version - x.version)[0];
    return f ? toForm(f) : undefined;
  },
};
