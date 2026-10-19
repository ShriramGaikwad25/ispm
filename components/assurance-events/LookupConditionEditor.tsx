"use client";

// A lookup's condition, edited as the Continuous Compliance Console does: a
// Mapping (one equality per KEY column, plus additional CEL) or the whole
// condition as CEL, with what is pushed down to SQL and what runs in memory.
// Used by the Lookup Library page and the definition editor's Lookups tab
// (a binding's own condition).

import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { compileCondition, splitCondition, type LookupMatch } from "@/lib/cc-lookup-tables-api";
import { BTN_GHOST, BTN_SECONDARY, INPUT, LABEL, TBODY, TD, TH, THEAD_ROW, cx } from "@/components/assurance-events/ui";

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-8 text-center text-sm text-gray-500">{children}</div>
);

/**
 * The lookup's condition, as the console edits it: a Mapping (one equality per KEY column, plus
 * additional CEL) or the whole condition as CEL. Switching to CEL compiles the mapping into the
 * expression; switching back turns the KEY equalities into mapping rows again.
 */
export function ConditionEditor({ match, expression, keys, paths, editable, resetKey, onChange, listId = "lookup-paths", note }: {
  match: LookupMatch[]; expression: string; keys: string[]; paths: string[]; editable: boolean; resetKey?: string;
  onChange: (c: { match: LookupMatch[]; expression: string }) => void;
  /** Id of the context-path datalist; give each editor on a page its own. */
  listId?: string;
  /** Shown left of the Mapping / CEL switch. */
  note?: ReactNode;
}) {
  const initialMode = () => (!match.length && expression ? "cel" : "mapping");
  const [mode, setMode] = useState<"mapping" | "cel">(initialMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMode(initialMode()); }, [resetKey]);

  const compiled = compileCondition(match, expression);
  const celText = editable ? expression : compiled;
  const split = splitCondition(mode === "cel" ? celText : compiled, keys);

  const toCel = () => {
    if (editable && match.length) onChange({ match: [], expression: compiled });
    setMode("cel");
  };
  const toMapping = () => {
    if (editable && expression) {
      const s = splitCondition(expression, keys);
      onChange({ match: s.match, expression: s.residual });
    }
    setMode("mapping");
  };

  const MODE_TAB = (on: boolean) =>
    cx("px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
      on ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-white hover:text-gray-900");

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">{note ?? <span className="text-sm font-medium text-gray-700">Edit as</span>}</div>
        <div className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-1 gap-1" role="tablist" aria-label="Condition editor">
          <button type="button" role="tab" aria-selected={mode === "mapping"} className={MODE_TAB(mode === "mapping")} onClick={toMapping}>
            Mapping
          </button>
          <button type="button" role="tab" aria-selected={mode === "cel"} className={MODE_TAB(mode === "cel")} onClick={toCel}>
            CEL
          </button>
        </div>
      </div>

      {mode === "mapping" ? (
        <>
          <p className="text-sm text-gray-600 mb-3">
            One row per KEY column: which value of the event&apos;s context it must equal; a <code>*</code> wildcard row matches anything. These
            equalities are pushed down to SQL and form the cache key.
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <MatchEditor match={match} keys={keys} editable={editable} listId={listId} onChange={(m) => onChange({ match: m, expression })} />
          </div>
          <datalist id={listId}>{paths.map((p) => <option key={p} value={p} />)}</datalist>
          <div className="mt-4">
            <label className={LABEL}>
              Additional CEL, ANDed with the mappings — over <code>row</code> (one candidate row), <code>subject</code>, <code>finding</code>,{" "}
              <code>event</code>, <code>definition</code>; evaluated in memory on the fetched rows unless it is itself a KEY equality
            </label>
            <textarea className={cx(INPUT, "font-mono text-xs")} rows={2} spellCheck={false} readOnly={!editable} value={expression}
                      placeholder="row.priority < 100" onChange={(e) => onChange({ match, expression: e.target.value })} />
          </div>
          <div className="mt-3 text-xs text-gray-500 font-mono [overflow-wrap:anywhere]">compiled: {compiled}</div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            The whole condition as CEL, evaluated per candidate row with <code>row</code> and the event&apos;s <code>subject</code>,{" "}
            <code>finding</code>, <code>event</code>, <code>definition</code>, <code>tenant</code>, <code>now</code>. Conjuncts{" "}
            <code>row.&lt;KEY&gt; == …</code> (optionally <code>|| row.&lt;KEY&gt; == &apos;*&apos;</code>) are pushed down to SQL and form the
            cache key; the rest runs in memory on the fetched rows (up to maxRows). Switching back to <i>Mapping</i> turns those equalities into
            rows again.
          </p>
          <textarea className={cx(INPUT, "font-mono text-xs")} rows={6} spellCheck={false} readOnly={!editable} value={celText}
                    placeholder="row.application == subject.application && (row.risk_tier == subject.riskTier || row.risk_tier == '*')"
                    onChange={(e) => onChange({ match, expression: e.target.value })} />
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm mt-4">
            <dt className="text-gray-600">pushed down to SQL</dt>
            <dd className="font-mono text-xs text-gray-500 [overflow-wrap:anywhere]">
              {split.pushdown.length ? split.pushdown.join(" && ") : (
                <span className="font-sans text-red-600">
                  nothing — every row of the source (up to maxRows) is fetched and filtered in memory{keys.length ? "" : " (no KEY column declared)"}
                </span>
              )}
            </dd>
            <dt className="text-gray-600">in memory</dt>
            <dd className="font-mono text-xs text-gray-500 [overflow-wrap:anywhere]">{split.memory.length ? split.memory.join(" && ") : "—"}</dd>
          </dl>
        </>
      )}
    </div>
  );
}

function MatchEditor({ match, keys, editable, listId, onChange }: {
  match: LookupMatch[]; keys: string[]; editable: boolean; listId: string; onChange: (m: LookupMatch[]) => void;
}) {
  const update = (i: number, x: Partial<LookupMatch>) => onChange(match.map((m, j) => (j === i ? { ...m, ...x } : m)));
  return (
    <>
      <table className="w-full">
        <thead>
          <tr className={THEAD_ROW}>
            <th className={TH}>Key Column</th><th className={TH}>Equals (context path / CEL)</th><th className={cx(TH, "w-28")}>Wildcard</th>
            {editable && <th className={TH}></th>}
          </tr>
        </thead>
        <tbody className={TBODY}>
          {match.map((m, i) => (
            <tr key={i}>
              <td className={TD}>
                <select className={INPUT} value={m.column} disabled={!editable} onChange={(e) => update(i, { column: e.target.value })}>
                  <option value="">—</option>
                  {[...new Set([...keys, ...(m.column ? [m.column] : [])])].map((k) => <option key={k}>{k}</option>)}
                </select>
              </td>
              <td className={TD}>
                <input className={cx(INPUT, "font-mono")} list={listId} value={m.path} readOnly={!editable} placeholder="subject.application"
                       onChange={(e) => update(i, { path: e.target.value })} />
              </td>
              <td className={TD}>
                <input className={cx(INPUT, "font-mono")} value={m.wildcard ?? ""} readOnly={!editable} placeholder="*"
                       onChange={(e) => update(i, { wildcard: e.target.value || null })} />
              </td>
              {editable && (
                <td className={TD}>
                  <button className={cx(BTN_GHOST, "px-2 text-red-600")} aria-label="Remove mapping" onClick={() => onChange(match.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!match.length && <tr><td colSpan={4}><Empty>No column mapping yet.</Empty></td></tr>}
        </tbody>
      </table>
      {editable && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button className={cx(BTN_SECONDARY, "text-xs")} disabled={!keys.length}
                  onClick={() => onChange([...match, { column: keys.find((k) => !match.some((m) => m.column === k)) ?? keys[0], path: "", wildcard: null }])}>
            <Plus size={12} /> Add Mapping
          </button>
        </div>
      )}
    </>
  );
}

