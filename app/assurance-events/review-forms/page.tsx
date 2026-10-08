"use client";

// Review forms — the Forms tab of the deployed Continuous Assurance console
// (graph.keyforge.ai/cc/studio/review-forms), laid out like ISPM's gateway
// registry pages. Opening a form shows how it reads to a reviewer.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { REVIEW_FORMS_BASE, ReviewForms } from "@/lib/assurance-review-forms";
import {
  BTN_LINK, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, Spinner, StatCard, TBODY, TD, TH,
  THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function ReviewFormsPage() {
  const router = useRouter();
  const q = useQuery({ queryKey: ["assurance", "gov", "review-forms"], queryFn: ReviewForms.list });
  const forms = useMemo(() => q.data?.items ?? [], [q.data]);
  const [search, setSearch] = useState("");

  const stats = useMemo(() => ({
    total: forms.length,
    eventTypes: new Set(forms.flatMap((f) => f.eventTypes).filter((t) => t !== "*")).size,
    edited: forms.filter((f) => f.source === "tenant").length,
    bulk: forms.filter((f) => f.bulk).length,
  }), [forms]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return forms;
    return forms.filter((f) =>
      [f.code, f.name, f.purpose ?? "", ...f.eventTypes, ...f.outcomes].join(" ").toLowerCase().includes(needle));
  }, [forms, search]);

  const open = (code: string) => router.push(`${REVIEW_FORMS_BASE}/${code}`);

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Review Forms"
          subtitle="How each kind of finding is resolved: the plain-language summary and facts a reviewer sees, the fields they fill in, the recommendation, and what each outcome does — apply a change through an executor, record a change request, record a decision or start a workflow."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Forms" value={stats.total} hint="Shipped and edited" />
          <StatCard label="Event Types Covered" value={stats.eventTypes} hint="With a form of their own" />
          <StatCard label="Edited by You" value={stats.edited} hint="Tenant versions of a form" />
          <StatCard label="Bulk Review" value={stats.bulk} hint="Decided for many findings at once" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={CARD_TITLE}>Forms ({forms.length})</div>
              <div className={CARD_SUBTITLE}>Event types without a form of their own use the default form.</div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search form, event type, outcome..."
                   aria-label="Search review forms" className={cx(FILTER_INPUT, "w-64")} />
          </div>

          {q.error && (
            <div className="px-5 py-4 text-sm text-red-600">{(q.error as Error).message}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Form</th>
                  <th className={TH}>Event Types</th>
                  <th className={TH}>Outcomes</th>
                  <th className={TH}>Bulk</th>
                  <th className={TH}>Version</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {q.isLoading && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                  </td></tr>
                )}
                {rows.map((f) => (
                  <tr key={f.code} className={TR_CLICKABLE} onClick={() => open(f.code)}>
                    <td className={cx(TD, "max-w-sm")}>
                      <Link href={`${REVIEW_FORMS_BASE}/${f.code}`} onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        {f.name}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{f.code}</div>
                      {f.purpose && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.purpose}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {f.eventTypes.map((t) => (
                          <span key={t} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono text-gray-700">
                            {t === "*" ? "any (default)" : t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={cx(TD, "max-w-xs")}>{f.outcomes.join(" · ")}</td>
                    <td className={TD}>
                      {f.bulk ? <span className={cx(PILL, "bg-blue-100 text-blue-700")}>Yes</span> : "—"}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      <div className="font-semibold text-gray-900">v{f.version}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{f.source === "tenant" ? "Edited" : "Shipped"}</div>
                      {!f.isActive && <span className={cx(PILL, "bg-gray-100 text-gray-600 mt-1")}>Inactive</span>}
                    </td>
                    <td className={TD}>
                      <button type="button" className={BTN_LINK} onClick={(e) => { e.stopPropagation(); open(f.code); }}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                {!q.isLoading && !q.error && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No review forms match the current search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
