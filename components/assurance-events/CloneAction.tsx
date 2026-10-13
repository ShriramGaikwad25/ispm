"use client";

// Clone an action (right sidebar): POST /compliance/action-types/{code}/clone.
// Used by Studio Configuration → Action library and the action page.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRightSidebar } from "@/contexts/RightSidebarContext";
import { ACTIONS_KEY, Actions, cloneCode, type ActionType } from "@/lib/cc-actions-api";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, Spinner, cx } from "@/components/assurance-events/ui";

export function CloneAction({ src, onDone }: { src: ActionType; onDone: (created: ActionType) => void }) {
  const qc = useQueryClient();
  const { closeSidebar } = useRightSidebar();
  const [code, setCode] = useState(cloneCode(src));
  const [name, setName] = useState(`${src.name} (copy)`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const created = await Actions.clone(src.code, { code: code.trim(), name: name.trim() });
      await qc.invalidateQueries({ queryKey: ACTIONS_KEY });
      closeSidebar();
      onDone(created);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        A tenant DRAFT copy under a new code (tenant codes never reuse a system code; <span className="font-mono">IGA_</span> and{" "}
        <span className="font-mono">AGENT_</span> are reserved). The parameter list, target kind and auto-execution are copied; an
        in-process default executor that does not implement the new code is cleared.
      </p>
      <div>
        <label className={LABEL}>New Code (UPPER_SNAKE_CASE)</label>
        <input className={cx(INPUT, "font-mono")} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div>
        <label className={LABEL}>Name</label>
        <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECONDARY} onClick={closeSidebar}>Cancel</button>
        <button type="button" className={BTN_PRIMARY} disabled={busy || !code.trim()} onClick={submit}>
          {busy && <Spinner size={14} className="text-white" />} Clone
        </button>
      </div>
    </div>
  );
}
