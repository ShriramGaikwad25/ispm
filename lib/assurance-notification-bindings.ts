// =====================================================================
// Continuous Assurance — notification bindings for event definitions.
//
// A definition's Notifications tab binds each lifecycle phase to one of the
// email templates managed on the Notifications page
// (/assurance-events/notifications — the First Solar Email Templates pages,
// on the same mail-server templates as Settings → Gateway → Email Templates).
//
// Templates come from the mail server. Bindings are kept in memory while
// USE_MOCK is true; otherwise they are written through
// PUT /definitions/{id}/notifications/{phase} with the template code.
// =====================================================================

import { Definitions, Governance, type UUID } from "@/lib/assurance-events-api";
import { getBackendOrigin } from "@/lib/backendOrigin";
import { getJwtAuthHeaders, resolveTenantIdForHeader } from "@/lib/auth";

const USE_MOCK = true;

export interface EmailTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  description: string;
  subject: string;
  templateType: string;
  active: boolean;
  parameters: string[];
}

/** Every email template on the mail server (same source as the Notifications page). */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  // Same request as the Notifications page (copied from the First Solar Email Templates page).
  const response = await fetch(
    `${getBackendOrigin()}/kfmailserver/templates/api/v1/${resolveTenantIdForHeader()}/getall`,
    { headers: getJwtAuthHeaders() },
  );
  if (!response.ok) throw new Error(`Failed to fetch templates: ${response.statusText}`);
  const result = (await response.json()) as { success: boolean; message?: string; data?: EmailTemplate[] };
  if (!result.success || !result.data) throw new Error(result.message || "Failed to load templates");
  return result.data;
}

/** phase → template code */
export type PhaseBindings = Record<string, string>;

const mockBindings = new Map<UUID, PhaseBindings>();

export const NotificationBindings = {
  get: async (definitionId: UUID): Promise<PhaseBindings> => {
    if (USE_MOCK) return { ...(mockBindings.get(definitionId) ?? {}) };
    const state = await Governance.notifications();
    const out: PhaseBindings = {};
    for (const t of state.templates) {
      for (const b of t.bindings ?? []) if (b.definitionId === definitionId) out[b.phase] = t.code;
    }
    return out;
  },

  /** Binds (or, with null, clears) the template for one phase. Saved immediately. */
  set: async (definitionId: UUID, phase: string, templateCode: string | null): Promise<void> => {
    if (USE_MOCK) {
      const next = { ...(mockBindings.get(definitionId) ?? {}) };
      if (templateCode) next[phase] = templateCode;
      else delete next[phase];
      mockBindings.set(definitionId, next);
      return;
    }
    await Definitions.bindNotification(definitionId, phase, templateCode);
  },
};
