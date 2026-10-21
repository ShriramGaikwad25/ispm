"use client";

// Definition editor — ported from the deployed Continuous Assurance console
// (graph.keyforge.ai/cc/definitions/:id), with every field editable in any
// state:
//   - DRAFT: "Save draft" saves in place; "Activate" saves pending edits,
//     then activates (the server deprecates the other versions).
//   - ACTIVE / DEPRECATED: versions are immutable on the server, so "Save as
//     new version" cuts a DRAFT, writes the edits into it and opens it. The
//     live version keeps running until that draft is activated.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, GitBranchPlus, Save, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvalidateGovernance } from "@/hooks/useAssuranceEvents";
import { CC_DEFINITIONS_KEY, CcDefinitionWrites, CcDefinitions } from "@/lib/cc-definitions-api";
import type { EventDefinition, UUID } from "@/lib/assurance-events-api";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, PAGE, PAGE_INNER_FLUSH, PageHeader, Spinner, TabBar, cx,
} from "../ui";
import { BannerBar, StateBadge } from "./fields";
import type { Banner } from "./fields";
import {
  DetectionTab, GeneralTab, GovernanceTab, NotificationsTab, ScopeTab, SlaProfilesTab,
} from "./tabs";
import { LookupsTab } from "./LookupsTab";
import { EffectiveConfigTab } from "./EffectiveConfigTab";

export const DEFINITIONS_BASE = "/assurance-events/event-definitions";

// SLA: the console's SLA tab (linked SLA profiles, fallback, resolved SLA).
// SlaTab and SchedulerTab remain in the codebase but are not part of the editor.
export const TABS: Array<[string, string]> = [
  ["general", "General"],
  ["detection", "Detection"],
  ["lookups", "Lookups"],
  ["governance", "Governance policy"],
  ["sla", "SLA"],
  ["scope", "Scope"],
  ["effective", "Effective config"],
  ["notify", "Notifications"],
];

export function DefinitionEditor({ id }: { id: UUID }) {
  const router = useRouter();
  const params = useSearchParams();
  const invalidateGovernance = useInvalidateGovernance();
  const qc = useQueryClient();
  const invalidate = () => {
    invalidateGovernance();
    qc.invalidateQueries({ queryKey: CC_DEFINITIONS_KEY });
  };
  // GET {baseUrl}/{tenant}/compliance/definitions/{id}
  const query = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, "detail", id], queryFn: () => CcDefinitions.get(id) });
  const [dto, setDto] = useState<EventDefinition | null>(null);
  const [tab, setTab] = useState(() => TABS.find(([key]) => key === params.get("tab"))?.[0] ?? "general");
  const [banner, setBanner] = useState<Banner>(() =>
    params.get("saved") ? { tone: "ok", text: "Your changes were saved as this new DRAFT version. Activate it to make it live." } : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.data) setDto(structuredClone(query.data));
  }, [query.data]);

  if (query.error) {
    return (
      <div className={PAGE}>
        <div className={cx(PAGE_INNER_FLUSH, "space-y-3")}>
          <Link href={DEFINITIONS_BASE} className={BTN_LINK}>← All definitions</Link>
          <BannerBar banner={{ tone: "err", text: (query.error as Error).message }} />
        </div>
      </div>
    );
  }
  if (query.isLoading || !dto) {
    return <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner /> Loading definition…</div>;
  }

  const isDraft = dto.state === "DRAFT";
  const dirty = JSON.stringify(dto) !== JSON.stringify(query.data);
  const patch = (p: Partial<EventDefinition>) => setDto({ ...dto, ...p });
  const openDefinition = (defId: string, saved = false) =>
    router.push(`${DEFINITIONS_BASE}/${defId}?tab=${tab}${saved ? "&saved=1" : ""}`);

  /** Runs a write, refreshes everything the editor reads, and reports the outcome in the banner. */
  const run = async <T,>(okText: string, action: () => Promise<T>, after?: (r: T) => void) => {
    setBusy(true);
    setBanner(null);
    try {
      const r = await action();
      invalidate();
      setBanner({ tone: "ok", text: okText });
      after?.(r);
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  /** ACTIVE / DEPRECATED: cut a DRAFT and write the edits into it. */
  const saveAsNewVersion = () =>
    run("Saved as a new DRAFT version.", async () => {
      const draft = await CcDefinitionWrites.newVersion(id);
      return CcDefinitionWrites.update(draft.definitionId, {
        ...dto,
        definitionId: draft.definitionId,
        version: draft.version,
        state: draft.state,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      });
    }, (d) => openDefinition(d.definitionId, true));

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
      <Link href={DEFINITIONS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← All definitions</Link>
      <PageHeader
        title={
          <>
            <span className="font-mono">{dto.code}</span>
            <StateBadge value={dto.state} />
          </>
        }
        subtitle={<>{dto.name} · v{dto.version} · <span className="font-mono">{dto.eventTypeCode}</span></>}
        actions={
          <>
            {isDraft ? (
              <>
                <button className={BTN_SECONDARY} disabled={busy || !dirty}
                        onClick={() => run("Draft saved.", () => CcDefinitionWrites.update(id, dto), (d) => setDto(d))}>
                  <Save size={14} /> Save Draft
                </button>
                <button className={BTN_PRIMARY} disabled={busy}
                        onClick={() => run(
                          `${dto.code} v${dto.version} is now ACTIVE; other versions were deprecated.`,
                          async () => {
                            if (dirty) await CcDefinitionWrites.update(id, dto);
                            return CcDefinitionWrites.activate(id);
                          },
                          (d) => setDto(d),
                        )}>
                  <ShieldCheck size={14} /> Activate
                </button>
              </>
            ) : (
              <>
                <button className={BTN_SECONDARY} disabled={busy}
                        onClick={() => run("New DRAFT version created.", () => CcDefinitionWrites.newVersion(id),
                          (d) => openDefinition(d.definitionId))}>
                  <GitBranchPlus size={14} /> New Version
                </button>
                {dto.state === "ACTIVE" && (
                  <button className={cx(BTN_SECONDARY, "text-red-700")} disabled={busy}
                          onClick={() => run("Deprecated.", () => CcDefinitionWrites.deprecate(id), (d) => setDto(d))}>
                    <Ban size={14} /> Deprecate
                  </button>
                )}
                <button className={BTN_PRIMARY} disabled={busy || !dirty} onClick={saveAsNewVersion}
                        title="Saves your edits as a new DRAFT version">
                  <Save size={14} /> Save as New Version
                </button>
              </>
            )}
          </>
        }
      >
        {!isDraft && dirty && (
          <div className="mt-2 inline-block text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
            Unsaved changes. Saving creates a new DRAFT version; v{dto.version} stays {dto.state} until you activate it.
          </div>
        )}
      </PageHeader>

      {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6 min-w-0">
          {tab === "general" && <GeneralTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "detection" && <DetectionTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "lookups" && <LookupsTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "governance" && <GovernanceTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "sla" && <SlaProfilesTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "scope" && <ScopeTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "effective" && <EffectiveConfigTab dto={dto} patch={patch} ro={false} id={id} />}
          {tab === "notify" && <NotificationsTab dto={dto} patch={patch} ro={false} id={id} />}
        </div>
      </div>
      </div>
    </div>
  );
}
