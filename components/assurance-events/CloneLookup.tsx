"use client";

// Clone a lookup (dialog): a tenant DRAFT copy under a new code and name.
//   POST /compliance/lookup-tables/{code}/clone

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LOOKUPS_KEY, LookupTables, type LookupTable } from "@/lib/cc-lookup-tables-api";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, Modal, Spinner, cx } from "@/components/assurance-events/ui";

export function CloneLookup({ src, onDone, onClose }: { src: LookupTable; onDone: (created: LookupTable) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(`${src.code}_COPY`);
  const [name, setName] = useState(`${src.name} (copy)`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const created = await LookupTables.clone(src.code, { code: code.trim().toUpperCase(), name: name.trim() });
      await qc.invalidateQueries({ queryKey: LOOKUPS_KEY });
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
          A DRAFT copy under a new code. The source, columns and match are copied — change them on the new draft, then activate it.
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
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
          <button type="button" className={BTN_PRIMARY} disabled={busy || !code.trim() || !name.trim()} onClick={submit}>
            {busy && <Spinner size={14} className="text-white" />} Clone
          </button>
        </div>
      </div>
    </Modal>
  );
}
