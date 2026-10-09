"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { useQuery } from "@tanstack/react-query";
import { useCreateDefinition, useNewDefinitionVersion } from "@/hooks/useAssuranceEvents";
import { useCcConnection } from "@/hooks/useCcConnection";
import { CC_DEFINITIONS_KEY, CcDefinitions } from "@/lib/cc-definitions-api";
import { formatAbsolute, formatRelative } from "@/lib/assurance-format";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, INPUT, LABEL, LookupSelect, PAGE,
  PAGE_INNER, PageHeader, Spinner, StatCard, TBODY, TD, TH, THEAD_ROW, TR_CLICKABLE, cx,
} from "@/components/assurance-events/ui";
import { BannerBar, SeverityBadge, StateBadge } from "@/components/assurance-events/definition-editor/fields";
import type { Banner } from "@/components/assurance-events/definition-editor/fields";
import { DEFINITIONS_BASE } from "@/components/assurance-events/definition-editor/DefinitionEditor";

// =====================================================================
// Response policies / event definitions — one policy per kind of finding.
// Same behaviour as the deployed Continuous Assurance console
// (graph.keyforge.ai/cc/definitions): search, state filter, "New version"
// per row, a row click opening the definition editor, and a create form
// that saves a DRAFT. Laid out like ISPM's SLA & Escalation Policies page
// (stat cards, registry card with filters, create form in the right sidebar).
// =====================================================================

type Mode = "ASSURANCE_CONTROL" | "CATALOG_SCAN";

const EMPTY_FORM = { code: "", name: "", eventTypeCode: "", severity: "MEDIUM", mode: "ASSURANCE_CONTROL" as Mode };

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const s = (n: number) => (n === 1 ? "" : "s");

export default function EventDefinitionsPage() {
  const router = useRouter();
  const { openSidebar, closeSidebar } = useRightSidebar();
  // Live list: GET /compliance/definitions?state=… (the State filter is sent to the API).
  const connection = useCcConnection();
  const create = useCreateDefinition();
  const newVersion = useNewDefinitionVersion();
  const [banner, setBanner] = useState<Banner>(null);
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const list = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, state], queryFn: () => CcDefinitions.list(state) });
  const listError = connection.error ?? list.error;

  const open = (id: string) => router.push(`${DEFINITIONS_BASE}/${id}`);
  const all = useMemo(() => list.data ?? [], [list.data]);

  const rows = all.filter((d) =>
    (!state || d.state === state) &&
    (!search || `${d.code} ${d.name} ${d.eventTypeCode}`.toLowerCase().includes(search.toLowerCase())));

  const stats = useMemo(() => ({
    active: all.filter((d) => d.state === "ACTIVE").length,
    drafts: all.filter((d) => d.state === "DRAFT").length,
    open: all.reduce((n, d) => n + (d.openFindings || 0), 0),
    executors: new Set(all.flatMap((d) => d.executors)).size,
  }), [all]);

  const cutNewVersion = async (id: string) => {
    try {
      const d = await newVersion.mutateAsync(id);
      open(d.definitionId);
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    }
  };

  const openCreateSidebar = () => {
    const CreateDefinitionForm = () => {
      const [form, setForm] = useState(EMPTY_FORM);
      const [error, setError] = useState<string | null>(null);
      // Own flag: this form renders in the sidebar, outside the page's re-renders.
      const [saving, setSaving] = useState(false);

      const createDraft = async () => {
        setError(null);
        setSaving(true);
        try {
          const d = await create.mutateAsync({
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            eventTypeCode: (form.eventTypeCode || form.code).trim().toUpperCase(),
            severity: form.severity,
            reviewerStrategy: "ENTITLEMENT_OWNER",
            reviewerConfig: {},
            slaDuration: "P5D",
            escalationChain: [
              { atPercent: 50, action: "NUDGE", params: {} },
              { atPercent: 80, action: "NOTIFY_MANAGER", params: {} },
            ],
            defaultActionOnTimeout: "ESCALATE",
            criteriaDsl: form.mode === "CATALOG_SCAN"
              ? { mode: "CATALOG_SCAN", language: "CEL", expression: "false" }
              : { mode: "ASSURANCE_CONTROL" },
            scope: {},
            allowedMitigationCodes: [],
            autoRemediationConfig: { enabled: false, actions: [] },
            aiInsightConfig: {},
            riskAcceptanceConfig: { allowed: true, max_duration: "P30D" },
            evidenceRequirements: { required_fields: ["business_justification"], min_justification_length: 30 },
            governancePolicy: { rules: [] },
            actionBindings: {},
            slaPolicy: { resolution: "FIRST_MATCH", rules: [] },
          });
          closeSidebar();
          open(d.definitionId);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setSaving(false);
        }
      };

      return (
        <div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Creates a DRAFT definition. Set its reviewer, SLA, governance and bindings in the editor, then activate it.
          </p>
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Code</label>
              <input className={cx(INPUT, "font-mono")} placeholder="e.g., REP021" value={form.code}
                     onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Name</label>
              <input className={INPUT} placeholder="e.g., Privileged entitlement without owner" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Severity</label>
                <LookupSelect domain="SEVERITY" value={form.severity} onChange={(v) => setForm({ ...form, severity: v })} />
              </div>
              <div>
                <label className={LABEL}>Detected By</label>
                <select className={INPUT} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}>
                  <option value="ASSURANCE_CONTROL">Agent controls</option>
                  <option value="CATALOG_SCAN">Its own rule (catalog scan)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Event Type (defaults to the code)</label>
              <input className={cx(INPUT, "font-mono")} value={form.eventTypeCode}
                     onChange={(e) => setForm({ ...form, eventTypeCode: e.target.value })} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <div className="flex justify-end gap-2 mt-8">
            <button type="button" className={BTN_SECONDARY} onClick={closeSidebar}>Cancel</button>
            <button type="button" className={BTN_PRIMARY} onClick={createDraft}
                    disabled={!form.code.trim() || !form.name.trim() || saving}>
              {saving && <Spinner size={14} className="text-white" />}
              Create Draft
            </button>
          </div>
        </div>
      );
    };

    openSidebar(<CreateDefinitionForm />, { title: "Create Event Definition", widthPx: 560 });
  };

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
        <PageHeader
          title="Response Policies / Event Definitions"
          subtitle="One policy per kind of finding: how it is detected, who reviews it and by when, what may be fixed automatically, and through which executor."
          actions={<button type="button" className={BTN_PRIMARY} onClick={openCreateSidebar}>+ Create Definition</button>}
        />

        <BannerBar banner={banner} onClose={() => setBanner(null)} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Definitions" value={stats.active} hint="Evaluated by detectors now" />
          <StatCard label="Drafts" value={stats.drafts} hint="Not yet activated" />
          <StatCard label="Open Findings" value={stats.open} hint="Across all definitions" />
          <StatCard label="Executors in Use" value={stats.executors} hint="Bound by at least one definition" />
        </div>

        <div className={cx(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={CARD_TITLE}>Definition Registry</div>
              <div className={CARD_SUBTITLE}>Versioned: an ACTIVE version is immutable — edits create a new DRAFT version.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, type..."
                     aria-label="Search definitions" className={cx(FILTER_INPUT, "w-56")} />
              <select value={state} onChange={(e) => setState(e.target.value)} aria-label="State" className={FILTER_INPUT}>
                <option value="">All States</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>Definition</th>
                  <th className={TH}>Severity</th>
                  <th className={TH}>Version</th>
                  <th className={TH}>State</th>
                  <th className={TH}>Detected By</th>
                  <th className={TH}>Governance</th>
                  <th className={TH}>SLA</th>
                  <th className={TH}>Executors</th>
                  <th className={TH}>Open</th>
                  <th className={TH}>Updated</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {list.isLoading && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><Spinner /> Loading…</span>
                  </td></tr>
                )}
                {listError && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-red-600">
                    Failed to load definitions. {(listError as Error).message}
                  </td></tr>
                )}
                {rows.map((d) => (
                  <tr key={d.definitionId} className={TR_CLICKABLE} onClick={() => open(d.definitionId)}>
                    <td className={cx(TD, "max-w-[340px]")}>
                      <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{d.code}</div>
                    </td>
                    <td className={TD}><SeverityBadge value={d.severity} /></td>
                    <td className={cx(TD, "whitespace-nowrap")}>v{d.version}</td>
                    <td className={TD}><StateBadge value={d.state} /></td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      {d.detectionMode === "CATALOG_SCAN"
                        ? "Own rule (CEL)"
                        : d.detectionMode === "ASSURANCE_CONTROL"
                          ? `${d.controls} agent control${s(d.controls)}`
                          : "—"}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap")}>
                      {d.governanceRules ? `${d.governanceRules} rule${s(d.governanceRules)}` : "Built-in"}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap font-semibold text-gray-900")}>
                      {d.slaConditions
                        ? `${d.slaConditions} condition${s(d.slaConditions)} · ${d.slaResolution}`
                        : `Default ${d.slaDuration}`}
                    </td>
                    <td className={TD}>{d.executors.length ? d.executors.join(", ") : "—"}</td>
                    <td className={TD}>{d.openFindings || "—"}</td>
                    <td className={cx(TD, "whitespace-nowrap")} title={formatAbsolute(d.updatedAt)}>{formatRelative(d.updatedAt)}</td>
                    <td className={cx(TD, "whitespace-nowrap")} onClick={(e) => e.stopPropagation()}>
                      {d.state !== "DRAFT" ? (
                        <button type="button" className={BTN_LINK} title="Cut a new DRAFT version"
                                onClick={() => cutNewVersion(d.definitionId)} disabled={newVersion.isPending}>
                          New version
                        </button>
                      ) : (
                        <button type="button" className={BTN_LINK} onClick={() => open(d.definitionId)}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!list.isLoading && !listError && rows.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                    No definitions match the current filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
