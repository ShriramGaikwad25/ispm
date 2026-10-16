"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Ban, Copy, Lock } from "lucide-react";
import { useCcConnection } from "@/hooks/useCcConnection";
import { Studio } from "@/lib/assurance-studio-api";
import { ACTIONS_KEY, ACTION_CATEGORIES, Actions, actionHref, paramSummary, type ActionType } from "@/lib/cc-actions-api";
import { CloneAction } from "@/components/assurance-events/CloneAction";
import { ExecutorsTab } from "@/components/assurance-events/ExecutorsTab";
import { StateBadge } from "@/components/assurance-events/definition-editor/fields";
import {
  CARD, CARD_BODY, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner,
  StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, TabBar, cx,
} from "@/components/assurance-events/ui";

// =====================================================================
// Studio configuration — Action library and CEL functions.
//
// Action library is the Continuous Compliance Console's action library
// (GET /compliance/action-types), laid out like the IGA UI's Agent Task Library.
// CEL functions matches the deployed console's /studio/cel-functions tab.
// Executors is the executor registry (components/assurance-events/ExecutorsTab).
// =====================================================================

type Tab = "actions" | "cel" | "executors";
const TABS: Array<[Tab, string]> = [["actions", "Action library"], ["cel", "CEL functions"], ["executors", "Executors"]];

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <StudioConfigurationPage />
    </Suspense>
  );
}

function StudioConfigurationPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = TABS.some(([k]) => k === sp.get("tab")) ? (sp.get("tab") as Tab) : "actions";

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Studio Configuration"
          subtitle="The building blocks agents and response policies are written with: the actions a finding can be routed to, the CEL functions their conditions can use, and the executors that carry the actions out."
        />
        <TabBar tabs={TABS} active={tab} onChange={(k) => router.replace(`${pathname}?tab=${k}`, { scroll: false })} />
        {tab === "actions" && <ActionLibraryTab />}
        {tab === "cel" && <CelFunctionsTab />}
        {tab === "executors" && <ExecutorsTab />}
      </div>
    </div>
  );
}

/* ================================================================ Action library */

// The Continuous Compliance Console's Action library (graph.keyforge.ai/console
// #/actions) on the same API — GET /compliance/action-types — laid out like
// the IGA UI's Agent Task Library: stat cards, filter bar, tables (one per
// category). Opening an action shows its page; Clone opens in the sidebar.

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function ActionLibraryTab() {
  const router = useRouter();
  const connection = useCcConnection();
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const query = { state: state || undefined, category: category || undefined, q: search.trim() || undefined };
  const q = useQuery({ queryKey: [...ACTIONS_KEY, "list", query], queryFn: () => Actions.list(query) });
  const actions = useMemo(() => q.data ?? [], [q.data]);
  const error = connection.error ?? q.error;

  const stats = useMemo(() => ({
    total: actions.length,
    reviewOnly: actions.filter((a) => a.autoExecution === "REVIEW_ONLY").length,
    reversible: actions.filter((a) => a.reversible).length,
    tenant: actions.filter((a) => !a.system).length,
  }), [actions]);

  const grouped = useMemo(() => {
    const m = new Map<string, ActionType[]>();
    for (const a of actions) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()].sort((x, y) => ACTION_CATEGORIES.indexOf(x[0]) - ACTION_CATEGORIES.indexOf(y[0]));
  }, [actions]);

  const [cloning, setCloning] = useState<ActionType | null>(null);
  const openClone = (x: ActionType) => setCloning(x);

  return (
    <div>
      {cloning && <CloneAction src={cloning} onClose={() => setCloning(null)} onDone={(c) => router.push(actionHref(c.code, c.version))} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Actions" value={stats.total} hint="Matching the filters" />
        <StatCard label="Review Only" value={stats.reviewOnly} hint="Never run straight from an automatic rule" />
        <StatCard label="Reversible" value={stats.reversible} hint="Executor returns a rollback token" />
        <StatCard label="Tenant Actions" value={stats.tenant} hint="Cloned or created by you" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg bg-white shadow-sm p-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name, description, or tag..."
          aria-label="Search actions"
          className="flex-1 min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State" className={FILTER_INPUT}>
            <option value="">All states</option>
            {["DRAFT", "ACTIVE", "DEPRECATED"].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={FILTER_INPUT}>
            <option value="">All categories</option>
            {ACTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className={cx(CARD, "border-red-200 bg-red-50 text-red-700 p-3 text-sm mb-4")}>{(error as Error).message}</div>
      )}

      {q.isLoading ? <PageSpinner /> : (
        <div className="space-y-6">
          {grouped.map(([cat, rows]) => (
            <div key={cat} className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
              <div className={CARD_HEADER}>
                <div className={CARD_TITLE}>{cat} ({rows.length})</div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={cx(TH, "min-w-[260px]")}>Action</th>
                    <th className={TH}>Version</th>
                    <th className={TH}>State</th>
                    <th className={TH}>Owner</th>
                    <th className={TH}>Target</th>
                    <th className={TH}>Reversible</th>
                    <th className={TH}>Parameters (* required)</th>
                    <th className={TH}>Default Executor</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {rows.map((a) => (
                    <tr key={a.actionId} className={TR_CLICKABLE} onClick={() => router.push(actionHref(a.code, a.version))}>
                      <td className={TD}>
                        <div className="text-sm font-semibold text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-mono break-all">{a.code}</div>
                      </td>
                      <td className={cx(TD, "font-semibold text-gray-900")}>v{a.version}</td>
                      <td className={TD}><StateBadge value={a.state} /></td>
                      <td className={TD}>
                        <span className={cx(PILL, a.system ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")}>
                          {a.system ? "System" : "Tenant"}
                        </span>
                      </td>
                      <td className={cx(TD, "text-xs")}>{a.targetKind}</td>
                      <td className={TD}>
                        <span className={cx(PILL, a.reversible ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                          {a.reversible ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{paramSummary(a.parameters) || "—"}</td>
                      <td className={cx(TD, "text-xs font-mono [overflow-wrap:anywhere]")}>{a.defaultExecutor || "—"}</td>
                      <td className={TD}>
                        <button type="button" title="Clone" aria-label={`Clone ${a.code}`}
                                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={(e) => { e.stopPropagation(); openClone(a); }}>
                          <Copy size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {!grouped.length && !error && (
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm px-4 py-8 text-center text-sm text-gray-500">
              No actions match the current filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ================================================================ CEL functions */

function CelFunctionsTab() {
  const domainsQ = useQuery({ queryKey: ["assurance", "studio", "domains"], queryFn: Studio.domains });
  const domains = useMemo(() => domainsQ.data ?? [], [domainsQ.data]);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (!domain && domains.length > 0) setDomain(domains[0].code);
  }, [domain, domains]);

  const refQ = useQuery({
    queryKey: ["assurance", "studio", "cel-reference", domain],
    queryFn: () => Studio.celReference(domain),
    enabled: !!domain,
  });

  if (domainsQ.isLoading || (domain && refQ.isLoading)) return <PageSpinner />;
  const error = (domainsQ.error ?? refQ.error) as Error | null;
  const ref = refQ.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg bg-white shadow-sm p-4">
        <label htmlFor="cel-domain" className="text-sm font-medium text-gray-700">Domain</label>
        <select id="cel-domain" value={domain} onChange={(e) => setDomain(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          {domains.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load the CEL reference. {error.message}
        </div>
      )}

      {ref && (
        <>
          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div>
                <div className={CARD_TITLE}>Operators</div>
                <div className={CARD_SUBTITLE}>What a condition can combine and compare with.</div>
              </div>
            </div>
            <div className={cx(CARD_BODY, "flex flex-wrap gap-6")}>
              {ref.operators.map((g) => (
                <div key={g.group}>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">{g.group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((op) => (
                      <code key={op} className="text-xs bg-gray-100 text-gray-800 rounded-md px-2 py-0.5">{op}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cx(CARD, "overflow-hidden")}>
            <div className={CARD_HEADER}>
              <div>
                <div className={CARD_TITLE}>Functions</div>
                <div className={CARD_SUBTITLE}>Built-in CEL functions available in every condition.</div>
              </div>
              <span className={cx(PILL, "bg-blue-100 text-blue-700")}>{ref.functions.length} available</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>Signature</th>
                    <th className={TH}>What It Does</th>
                    <th className={TH}>Example</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {ref.functions.map((fn) => (
                    <tr key={fn.signature} className="hover:bg-gray-50">
                      <td className={cx(TD, "font-mono text-xs font-semibold text-gray-900 whitespace-nowrap")}>{fn.signature}</td>
                      <td className={TD}>{fn.description}</td>
                      <td className={TD}>
                        <code className="text-xs bg-gray-900 text-gray-100 rounded-md px-2 py-1 block overflow-x-auto">
                          {fn.example}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div>
                <div className={CARD_TITLE}>Identifiers in {ref.domain_code}</div>
                <div className={CARD_SUBTITLE}>
                  Each fact resolves by its full name, and by the part after the dot where that is unambiguous.
                  Nothing outside this list resolves.
                </div>
              </div>
              <span className={cx(PILL, "bg-gray-100 text-gray-600")}>{ref.facts.length} facts</span>
            </div>
            <div className={CARD_BODY}>
              {ref.facts.length === 0 ? (
                <p className="text-sm text-gray-500">No facts are registered for this domain yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ref.facts.map((fact) => (
                    <span key={fact.fact_key} title={fact.description}
                          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 inline-flex items-center gap-1.5">
                      <span className="font-mono">{fact.fact_key}</span>
                      <span className="text-gray-400">{fact.value_type.toLowerCase()}</span>
                      {!fact.ai_permitted && <Lock size={11} className="text-amber-600" aria-label="Not shared with AI" />}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div className={CARD_TITLE}>Restrictions</div>
            </div>
            <div className={CARD_BODY}>
              <ul className="space-y-2">
                {ref.restrictions.map((r) => (
                  <li key={r} className="text-sm text-gray-700 flex items-start gap-2">
                    <Ban size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
