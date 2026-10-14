"use client";

// A review form's fields as a reviewer fills them in (the console's field
// renderer, in ISPM inputs). Used by the event's Review Form tab and the
// Review Forms page's Preview & Dry Run tab.

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { CcReviewFormView } from "@/lib/cc-events-api";
import { INPUT, PILL, cx } from "@/components/assurance-events/ui";

export type FormValues = Record<string, unknown>;
type Values = FormValues;

/** The review form's fields (the console's field renderer, in ISPM inputs). */
export function ReviewFormFields({ fields, values, onChange, readOnly }: {
  fields: CcReviewFormView["fields"]; values: Values; onChange: (v: Values) => void; readOnly: boolean;
}) {
  const set = (name: string, v: unknown) => onChange({ ...values, [name]: v });
  return (
    <div className="space-y-4">
      {fields.filter((f) => f.visible).map((f) => {
        const value = values[f.name] ?? "";
        const label = (
          <span className="block text-sm text-gray-700 mb-1">
            <span className="font-medium text-gray-900">{f.label || f.name}</span>
            {f.required && <span className="text-red-600"> *</span>}
            <span className="text-xs text-gray-500"> {f.type}{f.sensitive ? " · sensitive" : ""}</span>
            {f.help && <span className="block text-xs text-gray-500">{f.help}</span>}
          </span>
        );
        const options = f.options ?? [];

        if (f.type === "BOOLEAN") {
          return (
            <div key={f.name}>{label}
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={value === true} disabled={readOnly} onChange={(e) => set(f.name, e.target.checked)} /> Yes
              </label>
            </div>
          );
        }
        if (f.type === "TEXTAREA") {
          return (
            <div key={f.name}>{label}
              <textarea className={INPUT} rows={3} value={String(value)} readOnly={readOnly} onChange={(e) => set(f.name, e.target.value)} />
              {f.validate?.minLength && <span className="text-xs text-gray-500">At least {f.validate.minLength} characters</span>}
            </div>
          );
        }
        if (f.type === "INTEGER") {
          return (
            <div key={f.name}>{label}
              <input type="number" className={INPUT} value={value === "" ? "" : Number(value)} readOnly={readOnly}
                     min={f.validate?.min} max={f.validate?.max}
                     onChange={(e) => set(f.name, e.target.value === "" ? "" : +e.target.value)} />
            </div>
          );
        }
        if (f.type === "DATE") {
          return (
            <div key={f.name}>{label}
              <input type="date" className={INPUT} value={String(value)} readOnly={readOnly} onChange={(e) => set(f.name, e.target.value)} />
            </div>
          );
        }
        if (f.type === "DATETIME") {
          return (
            <div key={f.name}>{label}
              <input type="datetime-local" className={INPUT} value={typeof value === "string" ? value.slice(0, 16) : ""} readOnly={readOnly}
                     onChange={(e) => set(f.name, e.target.value ? new Date(e.target.value).toISOString() : "")} />
            </div>
          );
        }
        if (f.type === "MULTI_CHOICE") {
          const arr = Array.isArray(value) ? value : [];
          return (
            <div key={f.name}>{label}
              <OptionList options={options} className="flex flex-wrap gap-2 p-2">
                {(shown) => shown.map((o) => {
                  const on = arr.includes(o.value);
                  return (
                    <label key={String(o.value)}
                           className={cx(PILL, "border cursor-pointer", on ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200")}>
                      <input type="checkbox" className="mr-1" checked={on} disabled={readOnly}
                             onChange={(e) => set(f.name, e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />
                      {o.label}
                    </label>
                  );
                })}
              </OptionList>
            </div>
          );
        }
        if (f.type === "EVIDENCE_REF") {
          const ref = (value && typeof value === "object" ? value : { kind: "TICKET", system: "", id: "", url: "" }) as Record<string, string>;
          return (
            <div key={f.name}>{label}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select className={INPUT} value={ref.kind} disabled={readOnly} onChange={(e) => set(f.name, { ...ref, kind: e.target.value })}>
                  {["TICKET", "DOC", "RUNBOOK", "AUDIT_LOG", "OTHER"].map((k) => <option key={k}>{k}</option>)}
                </select>
                <input className={INPUT} placeholder="System" value={ref.system ?? ""} readOnly={readOnly} onChange={(e) => set(f.name, { ...ref, system: e.target.value })} />
                <input className={INPUT} placeholder="ID" value={ref.id ?? ""} readOnly={readOnly} onChange={(e) => set(f.name, { ...ref, id: e.target.value })} />
                <input className={INPUT} placeholder="URL" value={ref.url ?? ""} readOnly={readOnly} onChange={(e) => set(f.name, { ...ref, url: e.target.value })} />
              </div>
            </div>
          );
        }
        if (options.length) {
          return (
            <div key={f.name}>{label}
              <OptionList options={options} className="space-y-2 p-2">
                {(shown) => shown.map((o) => (
                  <label key={String(o.value)} className="block rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                      <input type="radio" name={f.name} checked={String(value) === String(o.value)} disabled={readOnly} onChange={() => set(f.name, o.value)} />
                      <span className="text-sm font-semibold text-gray-900">{o.label}</span>
                      {o.meta?.activeMembers !== undefined && <span className="text-xs text-gray-500">{o.meta.activeMembers} active members</span>}
                    </span>
                    <span className="block text-xs font-mono text-gray-500 ml-6">{String(o.value)}</span>
                  </label>
                ))}
              </OptionList>
            </div>
          );
        }
        return (
          <div key={f.name}>{label}
            <input className={cx(INPUT, f.type.endsWith("_REF") && "font-mono")} value={String(value)} readOnly={readOnly}
                   onChange={(e) => set(f.name, e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}

type FieldOption = NonNullable<CcReviewFormView["fields"][number]["options"]>[number];

/** A choice field's options with a search box and a scrolling list (option lists can be long). */
function OptionList({ options, className, children }: {
  options: FieldOption[]; className?: string; children: (shown: FieldOption[]) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? options.filter((o) => `${o.label} ${String(o.value)}`.toLowerCase().includes(needle))
    : options;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={cx(INPUT, "pl-8 py-1.5")} value={q} placeholder={`Search ${options.length} option${options.length === 1 ? "" : "s"}…`}
                 onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className={cx("max-h-72 overflow-y-auto", className)}>
        {children(shown)}
        {!shown.length && <div className="px-3 py-4 text-sm text-gray-500 text-center">No options match.</div>}
      </div>
    </div>
  );
}
