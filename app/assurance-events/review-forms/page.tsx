"use client";

// Review forms — the Continuous Compliance Console's review form library
// (graph.keyforge.ai/console#/forms) on the same API, laid out like ISPM's
// gateway registry pages. GET /compliance/review-forms; Clone posts
// /compliance/review-forms/{code}/clone. Opening a form shows its page.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { REVIEW_FORMS_BASE, REVIEW_FORMS_KEY, ReviewForms, type ApiReviewForm } from "@/lib/assurance-review-forms";
import {
  BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PILL, PageHeader,
  Spinner, StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { StateBadge } from "@/components/assurance-events/definition-editor/fields";
import { CloneReviewForm } from "@/components/assurance-events/CloneReviewForm";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const formHref = (code: string, version: number) =>
  `${REVIEW_FORMS_BASE}/${encodeURIComponent(code)}?version=${version}`;

export default function ReviewFormsPage() {
  const router = useRouter();
  // Connection check first, as the Continuous Compliance Console does on load.
  const connection = useCcConnection();
  const q = useQuery({ queryKey: REVIEW_FORMS_KEY, queryFn: ReviewForms.fetchAll });
  const error = connection.error ?? q.error;
  const forms = useMemo(() => q.data ?? [], [q.data]);
  const [search, setSearch] = useState("");

  const stats = useMemo(() => ({
    total: forms.length,
    active: forms.filter((f) => f.state === "ACTIVE").length,
    tenant: forms.filter((f) => !f.system).length,
    drafts: forms.filter((f) => f.state === "DRAFT").length,
  }), [forms]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return forms;
    return forms.filter((f) =>
      [f.code, f.title, f.intent ?? "", ...(f.appliesTo?.subjectKinds ?? []), ...f.fields.map((x) => x.name),
        ...f.outcomes.map((o) => o.id)].join(" ").toLowerCase().includes(needle));
  }, [forms, search]);

  const [cloning, setCloning] = useState<ApiReviewForm | null>(null);
  const openClone = (x: ApiReviewForm) => setCloning(x);

  return (
    <div className={PAGE}>
      {cloning && <CloneReviewForm src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(formHref(c.code, c.version))} />}
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader
          title="Review Forms"
          wideSubtitle
          subtitle="What a reviewer is asked when an event is routed to them, along with what details are provided to the reviewer. The review forms are part of the governance rules within an event definition. System defined forms are read only; you may clone the existing form to build a new one."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Forms" value={stats.total} hint="In the library" />
          <StatCard label="Active" value={stats.active} hint="Routable to events" />
          <StatCard label="Tenant Forms" value={stats.tenant} hint="Cloned or created by you" />
          <StatCard label="Drafts" value={stats.drafts} hint="Not yet activated" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={CARD_TITLE}>Review Form Library ({forms.length})</div>
              <div className={CARD_SUBTITLE}>Click a form to open it.</div>
            </div>
            <div className="flex items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, title, field, outcome..."
                     aria-label="Search review forms" className={cx(FILTER_INPUT, "w-64")} />
              <button type="button" className={BTN_SECONDARY} onClick={() => q.refetch()} disabled={q.isFetching}>
                <RefreshCw size={14} className={q.isFetching ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {error && <div className="px-5 py-4 text-sm text-red-600">{(error as Error).message}</div>}

          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={cx(TH, "w-[22%] min-w-[280px]")}>Form</th>
                <th className={TH}>Applies To</th>
                <th className={TH}>Fields</th>
                <th className={TH}>Outcomes</th>
                <th className={TH}>Version</th>
                <th className={TH}>State</th>
                <th className={TH}>Owner</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {q.isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                </td></tr>
              )}
              {rows.map((f) => (
                <tr key={f.formId} className={TR_CLICKABLE} onClick={() => router.push(formHref(f.code, f.version))}>
                  <td className={cx(TD, "min-w-[280px]")}>
                    <Link href={formHref(f.code, f.version)} onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                      {f.title}
                    </Link>
                    {f.intent && <div className="text-xs text-gray-500 mt-0.5">{f.intent}</div>}
                  </td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1">
                      {(f.appliesTo?.subjectKinds?.length ? f.appliesTo.subjectKinds : ["*"]).map((k) => (
                        <span key={k} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono text-gray-700">
                          {k === "*" ? "any" : k}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{f.fields.map((x) => x.name).join(", ") || "—"}</td>
                  <td className={cx(TD, "text-xs [overflow-wrap:anywhere]")}>
                    {f.outcomes.map((o) => `${o.id} → ${o.decision?.type || "—"} / ${o.then || "CLOSE"}`).join(" · ") || "—"}
                  </td>
                  <td className={cx(TD, "whitespace-nowrap font-semibold text-gray-900")}>v{f.version}</td>
                  <td className={TD}><StateBadge value={f.state} /></td>
                  <td className={TD}>
                    <span className={cx(PILL, f.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                      {f.system ? "System" : "Tenant"}
                    </span>
                  </td>
                  <td className={TD}>
                    <button type="button" title="Clone" aria-label={`Clone ${f.code}`}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={(e) => { e.stopPropagation(); openClone(f); }}>
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!q.isLoading && !error && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No forms match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
