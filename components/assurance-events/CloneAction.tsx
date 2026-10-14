"use client";

// Clone an action (dialog). Only the Identity section can be set:
// code, name, description, category, target kind, reversible, auto-execution
// and tags. Parameters, result fields and the executor are copied unchanged.
//   POST /compliance/action-types/{code}/clone   then, if anything besides code / name
//   PUT  /compliance/action-types/{newCode}      differs from the source, on the new DRAFT.
// Used by Studio Configuration → Action library and the action page.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ACTIONS_KEY, ACTION_CATEGORIES, Actions, TARGET_KINDS, cloneCode, toActionRequest, type ActionType,
} from "@/lib/cc-actions-api";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, Modal, Spinner, cx } from "@/components/assurance-events/ui";

export function CloneAction({ src, onDone, onClose }: { src: ActionType; onDone: (created: ActionType) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(cloneCode(src));
  const [name, setName] = useState(`${src.name} (copy)`);
  const [description, setDescription] = useState(src.description ?? "");
  const [category, setCategory] = useState(src.category || "OTHER");
  const [targetKind, setTargetKind] = useState(src.targetKind);
  const [reversible, setReversible] = useState(!!src.reversible);
  const [autoExecution, setAutoExecution] = useState(src.autoExecution || "ALLOWED");
  const [tags, setTags] = useState((src.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      let created = await Actions.clone(src.code, { code: code.trim().toUpperCase(), name: name.trim() });
      const identity = {
        name: name.trim(), description, category, targetKind, reversible, autoExecution,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const base = toActionRequest(created);
      const changed = (Object.keys(identity) as Array<keyof typeof identity>)
        .some((k) => JSON.stringify(identity[k]) !== JSON.stringify(base[k]));
      if (changed) created = await Actions.update(created.code, { ...base, ...identity });
      await qc.invalidateQueries({ queryKey: ACTIONS_KEY });
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
        A tenant DRAFT copy under a new code (tenant codes never reuse a system code; <span className="font-mono">IGA_</span> and{" "}
        <span className="font-mono">AGENT_</span> are reserved). Only its identity can be changed; the parameters, result fields
        and executor are copied unchanged. Activate it to use it in a definition.
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
          <label className={LABEL}>Category</label>
          <select className={INPUT} value={category} onChange={(e) => setCategory(e.target.value)}>
            {[...new Set([...ACTION_CATEGORIES, category])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Target kind (what it changes)</label>
          <select className={INPUT} value={targetKind} onChange={(e) => setTargetKind(e.target.value)}>
            {[...new Set([...TARGET_KINDS, targetKind])].map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Reversible</label>
          <select className={INPUT} value={String(reversible)} onChange={(e) => setReversible(e.target.value === "true")}>
            <option value="true">Yes (rollback token)</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Auto-execution</label>
          <select className={INPUT} value={autoExecution} onChange={(e) => setAutoExecution(e.target.value)}>
            <option>ALLOWED</option>
            <option>REVIEW_ONLY</option>
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>Tags (comma separated)</label>
        <input className={INPUT} value={tags} onChange={(e) => setTags(e.target.value)} />
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
