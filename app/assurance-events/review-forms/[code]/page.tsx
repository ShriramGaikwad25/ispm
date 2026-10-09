"use client";

// Review form — the "How it reads" section of the deployed Continuous
// Assurance console's form page (graph.keyforge.ai/cc/studio/review-forms/:code),
// in ISPM's design: purpose, summary template, facts shown, fields,
// outcomes and the recommendation rules.

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCcConnection } from "@/hooks/useCcConnection";
import {
  DECISION_LABEL, REVIEW_FORMS_BASE, REVIEW_FORMS_KEY, ReviewForms, type ReviewForm,
} from "@/lib/assurance-review-forms";
import {
  BTN_LINK, CARD, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner, TBODY, TD,
  TH, THEAD_ROW, cx,
} from "@/components/assurance-events/ui";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewFormPage />
    </Suspense>
  );
}

function ReviewFormPage() {
  const { code = "" } = useParams<{ code: string }>();
  const version = Number(useSearchParams().get("version")) || undefined;
  // Same query as the list page: the form comes from GET /compliance/review-forms.
  const connection = useCcConnection();
  const q = useQuery({ queryKey: REVIEW_FORMS_KEY, queryFn: ReviewForms.fetchAll });
  const error = connection.error ?? q.error;
  const form = q.data ? ReviewForms.pick(q.data, decodeURIComponent(code), version) : undefined;

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <Link href={REVIEW_FORMS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← Review forms</Link>
        {q.isLoading && <PageSpinner />}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</div>
        )}
        {q.data && !form && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Review form {decodeURIComponent(code)} was not found in the review form library.
          </div>
        )}
        {form && (
          <>
            <PageHeader
              title={
                <>
                  {form.name}
                  {form.isActive === false && <span className={cx(PILL, "bg-gray-100 text-gray-600")}>Inactive</span>}
                </>
              }
              subtitle={
                <>
                  <span className="font-mono">{form.code}</span> ·{" "}
                  {form.source === "tenant" ? `your version ${form.version}` : `shipped version ${form.version}`}
                </>
              }
            />
            <HowItReads form={form} />
          </>
        )}
      </div>
    </div>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-gray-900 mb-2">{children}</h3>
);

function HowItReads({ form }: { form: ReviewForm }) {
  const outcomes = form.outcomes ?? [];
  const fields = form.fields ?? [];
  const rules = form.recommendation?.rules ?? [];

  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <div>
          <div className={CARD_TITLE}>How It Reads</div>
          <div className={CARD_SUBTITLE}>What a reviewer sees and can decide for a finding of these event types.</div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {(form.eventTypes ?? []).length === 0 ? (
            <span className="text-xs text-gray-500">no event types</span>
          ) : form.eventTypes.map((t) => (
            <span key={t} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono text-gray-700">
              {t === "*" ? "any (default)" : t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-6 text-sm">
        {form.purpose && <p className="text-gray-700 leading-relaxed">{form.purpose}</p>}

        {form.summary && (
          <div>
            <SectionLabel>Summary</SectionLabel>
            <div className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-md p-3 text-gray-800">{form.summary}</div>
          </div>
        )}

        {(form.facts ?? []).length > 0 && (
          <div>
            <SectionLabel>Facts Shown</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {form.facts!.map((f) => (
                <span key={f.fact} title={f.fact}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {fields.length > 0 && (
          <div>
            <SectionLabel>Fields</SectionLabel>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Field</th>
                    <th className={TH}>Choices</th>
                    <th className={TH}>Pre-filled</th>
                    <th className={TH}>Shown For</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {fields.map((f) => (
                    <tr key={f.key}>
                      <td className={TD}>
                        <div className="font-semibold text-gray-900">{f.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-mono">{f.key} · {f.type}</div>
                      </td>
                      <td className={TD}>
                        {f.options?.fact
                          ? <>choices from <span className="font-mono">{f.options.fact}</span></>
                          : f.options?.values ? `${f.options.values.length} choices` : "—"}
                      </td>
                      <td className={TD}>
                        {f.recommend?.recommender
                          ? <>recommended by <span className="font-mono">{f.recommend.recommender}</span></>
                          : f.default !== undefined ? <>default <span className="font-mono">{String(f.default)}</span></> : "—"}
                      </td>
                      <td className={TD}>{(f.showFor ?? []).length ? f.showFor!.join(", ") : "All outcomes"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Outcomes</SectionLabel>
          <div className="space-y-3">
            {outcomes.map((o) => (
              <div key={o.code} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{o.label}</span>
                  <span className={cx(PILL, "bg-gray-100 text-gray-700")}>{DECISION_LABEL[o.decision] ?? o.decision}</span>
                  {o.primary && <span className={cx(PILL, "bg-blue-100 text-blue-700")}>Primary</span>}
                  <span className="font-mono text-xs text-gray-400">{o.code}</span>
                </div>
                <div className="text-xs text-gray-600 mt-2 space-y-1">
                  {(o.fields ?? []).length > 0 && <div>Needs: {o.fields!.join(", ")}</div>}
                  {o.action && (
                    <div>
                      Action: <span className="font-mono">{o.action.type}</span>
                      {o.action.when && <> when <span className="font-mono">{o.action.when}</span></>}
                      {" "}— applied by its executor, else a change request
                    </div>
                  )}
                  {o.change && <div>Change request: <span className="font-mono">{o.change}</span></div>}
                  {o.workflow && <div>Workflow: <span className="font-mono">{o.workflow}</span></div>}
                  <div>
                    Justification {o.justification ?? "optional"}
                    {o.expiry && o.expiry !== "none" ? ` · end date ${o.expiry}` : ""}
                    {o.then ? ` · then ${o.then}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {rules.length > 0 && (
          <div>
            <SectionLabel>Recommendation (first rule that holds)</SectionLabel>
            <ol className="list-decimal ml-5 space-y-2">
              {rules.map((r, i) => (
                <li key={i} className="text-gray-700">
                  <span className="font-mono text-xs">{r.when ?? "otherwise"}</span> →{" "}
                  <span className="font-semibold text-gray-900">{outcomes.find((o) => o.code === r.outcome)?.label ?? r.outcome}</span>
                  {r.reason && <div className="text-xs text-gray-500 mt-0.5">{r.reason}</div>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
