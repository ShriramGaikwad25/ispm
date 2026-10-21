"use client";

// A review form's fields as a reviewer fills them in (the console's field
// renderer, in ISPM inputs). Used by the event's Review Form tab and the
// Review Forms page's Preview & Dry Run tab.

import { useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { CcReviewFormDisplay, CcReviewFormView } from "@/lib/cc-events-api";
import { BTN_SECONDARY, INPUT, PILL, TBODY, TD, TH, THEAD_ROW, cx } from "@/components/assurance-events/ui";

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
            {f.sensitive && <span className="text-xs text-gray-500"> sensitive</span>}
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
        if (f.type === "ITEM_LIST") {
          return (
            <div key={f.name}>{label}
              <ItemListField field={f} rows={Array.isArray(value) ? (value as Row[]) : []} readOnly={readOnly}
                             onChange={(rows) => set(f.name, rows)} />
            </div>
          );
        }
        if (options.length && options.some((o) => o.meta?.activeMembers !== undefined)) {
          // Approval groups: labels arrive as "ID — Name"; lay them out as ID | Name | Active members.
          const cols = "grid grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,3fr)_8rem] items-center gap-3 px-3";
          return (
            <div key={f.name}>{label}
              <OptionList options={options}>
                {(shown) => (
                  <>
                    <div className={cx(cols, "sticky top-0 z-10 py-2 bg-blue-50 border-b border-blue-100 text-xs font-semibold uppercase tracking-wide text-[#1759e4]")}>
                      <span />
                      <span>Group ID</span>
                      <span>Name</span>
                      <span className="text-right">Active members</span>
                    </div>
                    <div className="divide-y divide-gray-100 bg-white">
                      {shown.map((o) => {
                        const [id, ...rest] = o.label.split(" — ");
                        const selected = String(value) === String(o.value);
                        const n = o.meta?.activeMembers;
                        return (
                          <label key={String(o.value)}
                                 className={cx(cols, "py-2.5 cursor-pointer", selected ? "bg-blue-50" : "hover:bg-gray-50")}>
                            <input type="radio" name={f.name} checked={selected} disabled={readOnly} onChange={() => set(f.name, o.value)} />
                            <span className="text-sm font-mono font-medium text-gray-900 [overflow-wrap:anywhere]">{id}</span>
                            <span className="text-sm text-gray-700">{rest.join(" — ") || "—"}</span>
                            <span className="text-right">
                              <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                                n ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{n ?? "—"}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </OptionList>
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
                      <span className="text-sm font-semibold text-gray-900">{o.label}</span>                    </span>
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

type Field = CcReviewFormView["fields"][number];
type FieldOption = NonNullable<Field["options"]>[number];
type Row = Record<string, unknown>;

/** `item.<col> == '<v>'` / `!=` against a row; anything else (or nothing) holds. */
function holds(cond: string | undefined, row: Row) {
  const m = cond?.trim().match(/^item\.(\w+)\s*(==|!=)\s*'([^']*)'$/);
  if (!m) return true;
  const v = String(row[m[1]] ?? "");
  return m[2] === "==" ? v === m[3] : v !== m[3];
}

/**
 * An ITEM_LIST field: one row per item (e.g. each entitlement of a description
 * review) with its editable columns. Rows the agent proposed a description for
 * keep that proposal so the reviewer can see it after editing and take it back.
 */
function ItemListField({ field, rows, readOnly, onChange }: {
  field: Field; rows: Row[]; readOnly: boolean; onChange: (rows: Row[]) => void;
}) {
  const columns = field.columns ?? [];
  const keyCol = columns.find((c) => c.key)?.name || "entitlementId";
  // The agent's text, captured the first time each row is seen (before the reviewer edits it).
  const proposals = useRef<Record<string, string>>({});
  for (const r of rows) {
    const k = String(r[keyCol]);
    if (r.hasProposal && proposals.current[k] === undefined) proposals.current[k] = String(r.description ?? "");
  }
  const proposalCount = Object.keys(proposals.current).length;
  const editable = columns.filter((c) => !c.readOnly && !c.key);
  const context = columns.filter((c) => (c.readOnly || c.key) && !["entitlementId", "currentDescription"].includes(c.name));
  const setCell = (i: number, col: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [col]: v } : r)));
  const acceptAll = () => onChange(rows.map((r) => {
    const p = proposals.current[String(r[keyCol])];
    return p ? { ...r, decision: "REWRITE", description: p } : r;
  }));

  return (
    <div className="space-y-2">
      {!readOnly && proposalCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={acceptAll}>Accept all agent proposals</button>
          <span className="text-xs text-gray-500">
            {proposalCount} of {rows.length} row(s) have a proposal; the server re-checks every text (no names, not similar to other descriptions).
          </span>
        </div>
      )}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead><tr className={THEAD_ROW}>
            <th className={TH}>Entitlement</th>
            <th className={TH}>Current Description</th>
            {editable.map((c) => <th key={c.name} className={TH}>{c.label || c.name}{c.required && <span className="text-red-600"> *</span>}</th>)}
          </tr></thead>
          <tbody className={TBODY}>
            {rows.map((r, i) => {
              const proposal = proposals.current[String(r[keyCol])];
              return (
                <tr key={String(r[keyCol] ?? i)}>
                  <td className={cx(TD, "min-w-[160px]")}>
                    {context.map((c) => (
                      <div key={c.name} className={c.name === "name" ? "font-semibold text-gray-900" : "text-xs text-gray-500"}>{String(r[c.name] ?? "")}</div>
                    ))}
                  </td>
                  <td className={cx(TD, "max-w-[260px]")}>{String(r.currentDescription ?? "")}</td>
                  {editable.map((c) => {
                    if (!holds(c.visibleWhen, r)) return <td key={c.name} className={cx(TD, "text-gray-400")}>—</td>;
                    if (c.options?.length) {
                      return (
                        <td key={c.name} className={TD}>
                          <select className={cx(INPUT, "min-w-[130px]")} value={String(r[c.name] ?? "")} disabled={readOnly}
                                  onChange={(e) => setCell(i, c.name, e.target.value)}>
                            <option value="">Choose…</option>
                            {c.options.map((o) => (
                              <option key={String(o.value)} value={String(o.value)} disabled={!holds(c.valueWhen?.[String(o.value)], r)}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      );
                    }
                    const text = String(r[c.name] ?? "");
                    return (
                      <td key={c.name} className={cx(TD, "min-w-[280px]")}>
                        <textarea className={INPUT} rows={3} value={text} readOnly={readOnly} onChange={(e) => setCell(i, c.name, e.target.value)} />
                        {c.name === "description" && proposal !== undefined && (text === proposal ? (
                          <div className="text-xs text-green-700 mt-1">Agent proposal (unchanged)</div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">
                            Edited · agent proposal: <i>{proposal}</i>{" "}
                            {!readOnly && <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold" onClick={() => setCell(i, c.name, proposal)}>Use proposal</button>}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={2 + editable.length} className={cx(TD, "text-center text-gray-500")}>No members.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {field.validate && (
        <div className="text-xs text-gray-500">
          {Object.entries(field.validate).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

/** What the reviewer is reviewing: the live description with detected names marked, or a cluster summary. */
export function ReviewFormDisplay({ d }: { d: CcReviewFormDisplay }) {
  const box = "rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-800";
  if (d.kind === "CLUSTER" && "representativeDescription" in d) {
    return (
      <div className={box}>
        Representative description: <b>“{d.representativeDescription}”</b> · {d.count} entitlements · {(d.matchKinds ?? []).join(" + ")}
      </div>
    );
  }
  const text = ("currentDescription" in d && d.currentDescription) || "";
  const highlights = "highlights" in d ? d.highlights ?? [] : [];
  const parts: ReactNode[] = [];
  let at = 0;
  for (const h of [...highlights].sort((a, b) => a.start - b.start)) {
    if (h.start < at) continue;
    parts.push(text.slice(at, h.start));
    parts.push(<mark key={h.start} title={`${h.ref} · ${h.kind} · ${h.confidence}`} className="bg-yellow-200 rounded px-0.5">{text.slice(h.start, h.end)}</mark>);
    at = h.end;
  }
  parts.push(text.slice(at));
  return (
    <div className={box}>
      <div className="text-xs text-gray-500 mb-1">Current description (live from the catalog; shown to the reviewer only, never stored with the event)</div>
      <div className="text-[15px]">{parts}</div>
      {highlights.length ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {highlights.map((h) => <span key={h.start} className={cx(PILL, "border border-gray-200 bg-white text-gray-700")}>{h.ref}: {h.kind} {h.confidence}</span>)}
        </div>
      ) : <div className="text-xs text-green-700 mt-1">No name detected in the current text.</div>}
    </div>
  );
}

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
