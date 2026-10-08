"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Ban, Lock } from "lucide-react";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { Studio, agentTaskDefinitions, type TaskDefinitionRef } from "@/lib/assurance-studio-api";
import {
  AGENT_TASKS, type AgentTask, type AgentTaskDomain as TaskDomain, type AgentTaskExecutionType as ExecutionType,
} from "@/lib/agent-task-library";
import {
  CARD, CARD_BODY, CARD_HEADER, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER, PILL, PageHeader, PageSpinner,
  TBODY, TD, TH, THEAD_ROW, TabBar, cx,
} from "@/components/assurance-events/ui";

// =====================================================================
// Studio configuration — Action library and CEL functions.
//
// Action library is the IGA UI's Agent Task Library (same table, filters,
// cards and detail panel) with an extra Event Definitions column.
// CEL functions matches the deployed console's /studio/cel-functions tab.
// =====================================================================

type Tab = "actions" | "cel";
const TABS: Array<[Tab, string]> = [["actions", "Action library"], ["cel", "CEL functions"]];

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
  const tab: Tab = sp.get("tab") === "cel" ? "cel" : "actions";

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Studio Configuration"
          subtitle="The building blocks agents and response policies are written with: the actions a finding can be routed to, and the CEL functions their conditions can use."
        />
        <TabBar tabs={TABS} active={tab} onChange={(k) => router.replace(`${pathname}?tab=${k}`, { scroll: false })} />
        {tab === "actions" ? <ActionLibraryTab /> : <CelFunctionsTab />}
      </div>
    </div>
  );
}

/* ================================================================ Action library */

// Same table, filters, cards and detail panel as the IGA UI's Agent Task
// Library (app/settings/gateway/agent-task-library), plus the event
// definitions that route findings to each task.

const TASKS: AgentTask[] = AGENT_TASKS;
const DEFINITION_HREF = (id: string) => `/assurance-events/event-definitions/${id}`;

function domainPillClass(domain: TaskDomain) {
  if (domain === "User") return "bg-blue-100 text-blue-800";
  if (domain === "Application") return "bg-purple-100 text-purple-700";
  return "bg-green-100 text-green-700";
}

function execPillClass(exec: ExecutionType) {
  if (exec === "LLM") return "bg-purple-100 text-purple-700";
  if (exec === "ML Algorithm") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function ActionLibraryTab() {
  const { openSidebar } = useRightSidebar();
  const defsQ = useQuery({ queryKey: ["assurance", "studio", "task-definitions"], queryFn: agentTaskDefinitions });
  const defsByTask = useMemo(() => defsQ.data ?? {}, [defsQ.data]);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [execFilter, setExecFilter] = useState("");

  const stats = useMemo(() => {
    const llm = TASKS.filter((t) => t.exec === "LLM").length;
    const ml = TASKS.filter((t) => t.exec === "ML Algorithm").length;
    const workflow = TASKS.filter((t) => t.exec === "Deterministic").length;
    return { total: TASKS.length, llm, ml, workflow };
  }, []);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TASKS.filter((t) => {
      const haystack = [
        t.id, t.name, t.domain, t.exec, t.primary, t.description, ...t.inputs,
        ...(defsByTask[t.id] ?? []).flatMap((d) => [d.code, d.name]),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesDomain = !domainFilter || t.domain === domainFilter;
      const matchesExec = !execFilter || t.exec === execFilter;
      return matchesSearch && matchesDomain && matchesExec;
    });
  }, [search, domainFilter, execFilter, defsByTask]);

  const openTaskDetail = (task: AgentTask) =>
    openSidebar(<TaskDetail task={task} definitions={defsByTask[task.id] ?? []} />, { title: task.name, widthPx: 560 });

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Agent Tasks" value={stats.total} hint="Curated platform tasks" />
        <StatCard label="LLM Tasks" value={stats.llm} hint="Generation / reasoning tasks" />
        <StatCard label="ML Tasks" value={stats.ml} hint="Scoring / anomaly detection" />
        <StatCard label="Deterministic" value={stats.workflow} hint="Deterministic orchestration" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg bg-white shadow-sm p-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by task, signal, output, or event definition..."
          aria-label="Search agent tasks"
          className="flex-1 min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            aria-label="Task domain"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All task domains</option>
            <option>User</option>
            <option>Application</option>
            <option>Account</option>
          </select>
          <select
            value={execFilter}
            onChange={(e) => setExecFilter(e.target.value)}
            aria-label="Execution type"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All execution types</option>
            <option>LLM</option>
            <option>ML Algorithm</option>
            <option>Deterministic</option>
          </select>
        </div>
      </div>

      {defsQ.error && (
        <div className={cx(CARD, "border-red-200 bg-red-50 text-red-700 p-3 text-sm mb-4")}>
          Failed to load event definitions. {(defsQ.error as Error).message}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Agent Task</th>
                <th className="px-4 py-3">Task Domain</th>
                <th className="px-4 py-3">Execution Type</th>
                <th className="px-4 py-3">Primary Output</th>
                <th className="px-4 py-3">Event Definitions</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const defs = defsByTask[task.id] ?? [];
                return (
                  <tr key={task.id} onClick={() => openTaskDetail(task)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3 align-top max-w-[420px]">
                      <div className="text-sm font-semibold text-gray-900">{task.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${domainPillClass(task.domain)}`}>
                        {task.domain}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${execPillClass(task.exec)}`}>
                        {task.exec}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-gray-700">{task.primary}</td>
                    <td className="px-4 py-3 align-top">
                      {defsQ.isLoading ? (
                        <span className="text-xs text-gray-400">Loading…</span>
                      ) : defs.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                          {defs.map((d) => (
                            <Link
                              key={d.definitionId}
                              href={DEFINITION_HREF(d.definitionId)}
                              onClick={(e) => e.stopPropagation()}
                              title={`${d.name} · v${d.version} ${d.state}`}
                              className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700 hover:bg-blue-100"
                            >
                              {d.code}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        {task.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No agent tasks match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </div>
  );
}

function TaskDetail({ task, definitions }: { task: AgentTask; definitions: TaskDefinitionRef[] }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{task.description}</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <DetailCard label="Task ID" value={task.id} />
        <DetailCard label="Task Domain" value={task.domain} />
        <DetailCard label="Execution Type" value={task.exec} />
        <DetailCard label="Version" value={task.version} />
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Event Definitions</h3>
        {definitions.length === 0 ? (
          <p className="text-sm text-gray-500">No event definition uses this task yet.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {definitions.map((d) => (
              <Link key={d.definitionId} href={DEFINITION_HREF(d.definitionId)} className="block px-3 py-2.5 hover:bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-gray-900">{d.code}</span>
                  <span className="text-xs text-gray-500">v{d.version} · {d.state}</span>
                </div>
                <div className="text-sm text-gray-700">{d.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Input Parameters / Signals</h3>
        <div className="flex flex-wrap gap-2">
          {task.inputs.map((input) => (
            <span key={input} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
              {input}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Output Schema</h3>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,2fr)] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="px-3 py-2.5">Field</div>
            <div className="px-3 py-2.5">Type</div>
            <div className="px-3 py-2.5">Description</div>
          </div>
          <div className="divide-y divide-gray-100">
            {task.schema.map((row) => (
              <div key={row.field} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.7fr)_minmax(0,2fr)]">
                <div className="px-3 py-2.5 text-sm">
                  <div className="font-semibold text-gray-900 break-words">{row.field}</div>
                  {row.field === "confidence_score" && (
                    <div className="text-xs font-semibold text-red-600">required</div>
                  )}
                </div>
                <div className="px-3 py-2.5 text-sm text-gray-700">{row.type}</div>
                <div className="px-3 py-2.5 text-sm text-gray-700">{row.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
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
