"use client";

// Create definition — the editor's tabs on a definition that does not exist
// yet. "Create Draft" POSTs it as a DRAFT, saves the notification bindings
// chosen on the Notifications tab (they are stored per definition id), then
// opens the new definition in the regular editor.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeXml, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useInvalidateGovernance } from "@/hooks/useAssuranceEvents";
import { CC_DEFINITIONS_KEY, CcDefinitionWrites, NEW_DEFINITION } from "@/lib/cc-definitions-api";
import { NotificationBindings, type PhaseBindings } from "@/lib/assurance-notification-bindings";
import type { EventDefinition } from "@/lib/assurance-events-api";
import {
  BTN_LINK, BTN_PRIMARY, BTN_SECONDARY, PAGE, PAGE_INNER, PageHeader, Spinner, TabBar, cx,
} from "../ui";
import { BannerBar, WireView } from "./fields";
import type { Banner } from "./fields";
import {
  DetectionTab, GeneralTab, GovernanceTab, NotificationsTab, ScopeTab, SlaProfilesTab,
} from "./tabs";
import { DEFINITIONS_BASE, TABS } from "./DefinitionEditor";

export function NewDefinitionEditor() {
  const router = useRouter();
  const qc = useQueryClient();
  const invalidateGovernance = useInvalidateGovernance();
  const [dto, setDto] = useState<EventDefinition>(
    () => ({ ...structuredClone(NEW_DEFINITION), code: "", name: "", state: "DRAFT" }) as unknown as EventDefinition);
  const [bindings, setBindings] = useState<PhaseBindings>({});
  const [tab, setTab] = useState("general");
  const [banner, setBanner] = useState<Banner>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<EventDefinition>) => setDto({ ...dto, ...p });
  const missing = [!dto.code.trim() && "Code", !dto.name.trim() && "Name"].filter(Boolean);

  const createDraft = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const d = await CcDefinitionWrites.create({
        ...dto,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        eventTypeCode: dto.eventTypeCode.trim().toUpperCase() || NEW_DEFINITION.eventTypeCode,
      });
      for (const [phase, code] of Object.entries(bindings)) {
        await NotificationBindings.set(d.definitionId, phase, code);
      }
      invalidateGovernance();
      await qc.invalidateQueries({ queryKey: CC_DEFINITIONS_KEY });
      router.push(`${DEFINITIONS_BASE}/${d.definitionId}?tab=${tab}`);
    } catch (e) {
      setBanner({ tone: "err", text: (e as Error).message });
      setBusy(false);
    }
  };

  const props = { dto, patch, ro: false, id: "", isNew: true };

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER}>
      <Link href={DEFINITIONS_BASE} className={cx(BTN_LINK, "inline-block mb-3")}>← All definitions</Link>
      <PageHeader
        title="Create Event Definition"
        subtitle="Fill in each tab, then create it as a DRAFT. Activate it from the editor to make it live."
        actions={
          <>
            <button className={BTN_SECONDARY} onClick={() => setShowRequest((v) => !v)}>
              <CodeXml size={14} /> {showRequest ? "Hide Request" : "Show Request"}
            </button>
            <Link href={DEFINITIONS_BASE} className={BTN_SECONDARY}>Cancel</Link>
            <button className={BTN_PRIMARY} disabled={busy || missing.length > 0} onClick={createDraft}
                    title={missing.length ? `Required on the General tab: ${missing.join(", ")}` : undefined}>
              {busy ? <Spinner size={14} className="text-white" /> : <Save size={14} />} Create Draft
            </button>
          </>
        }
      >
        {missing.length > 0 && (
          <div className="mt-2 inline-block text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
            Required on the General tab: {missing.join(", ")}.
          </div>
        )}
      </PageHeader>

      {banner && <div className="mb-4"><BannerBar banner={banner} onClose={() => setBanner(null)} /></div>}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className={cx("grid gap-6", showRequest ? "grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "grid-cols-1")}>
        <div className="space-y-6 min-w-0">
          {tab === "general" && <GeneralTab {...props} />}
          {tab === "detection" && <DetectionTab {...props} />}
          {tab === "governance" && <GovernanceTab {...props} />}
          {tab === "sla" && <SlaProfilesTab {...props} />}
          {tab === "scope" && <ScopeTab {...props} />}
          {tab === "notify" && <NotificationsTab {...props} pending={bindings} onPendingChange={setBindings} />}
        </div>
        {showRequest && <WireView method="POST" path="/compliance/definitions" body={dto} />}
      </div>
      </div>
    </div>
  );
}
