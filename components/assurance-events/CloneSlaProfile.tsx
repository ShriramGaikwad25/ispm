"use client";

// Clone an SLA profile (dialog). Only the Identity section can be set: code,
// name, description, severity hint and tags. The deadline, timeout action,
// escalation chain and condition are copied unchanged.
//   POST /compliance/sla-profiles/{code}/clone   then, if description / severity / tags
//   PUT  /compliance/sla-profiles/{newCode}      differ from the source, on the new DRAFT.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  SEVERITIES, SLA_PROFILES_KEY, SlaProfiles, toSlaProfileRequest, type SlaProfile,
} from "@/lib/cc-sla-profiles-api";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, Modal, Spinner, cx } from "@/components/assurance-events/ui";

export function CloneSlaProfile({ src, onDone, onClose }: { src: SlaProfile; onDone: (created: SlaProfile) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(src.system ? `MY_${src.code}` : `${src.code}_COPY`);
  const [name, setName] = useState(`${src.name} (copy)`);
  const [description, setDescription] = useState(src.description ?? "");
  const [severityHint, setSeverityHint] = useState(src.severityHint ?? "");
  const [tags, setTags] = useState((src.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      let created = await SlaProfiles.clone(src.code, { code: code.trim().toUpperCase(), name: name.trim() });
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const base = toSlaProfileRequest(created);
      if (description !== base.description || severityHint !== base.severityHint || JSON.stringify(tagList) !== JSON.stringify(base.tags)) {
        created = await SlaProfiles.update(created.code, { ...base, name: name.trim(), description, severityHint, tags: tagList });
      }
      await qc.invalidateQueries({ queryKey: SLA_PROFILES_KEY });
      onClose();
      onDone(created);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Clone ${src.code} v${src.version}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          A tenant DRAFT copy under a new code. Only its identity can be set here; the deadline, timeout action, escalation chain
          and condition are copied — change them on the new draft, then activate it.
        </p>
        <div>
          <label className={LABEL}>New Code (UPPER_SNAKE_CASE)</label>
          <input className={cx(INPUT, "font-mono")} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Name</label>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Description</label>
          <textarea className={INPUT} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Severity hint</label>
            <select className={INPUT} value={severityHint} onChange={(e) => setSeverityHint(e.target.value)}>
              <option value="">—</option>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Tags (comma separated)</label>
            <input className={INPUT} value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
          <button type="button" className={BTN_PRIMARY} disabled={busy || !code.trim() || !name.trim()} onClick={submit}>
            {busy && <Spinner size={14} className="text-white" />} Clone
          </button>
        </div>
      </div>
    </Modal>
  );
}
