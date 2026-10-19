"use client";

// ---------------------------------------------------------------------
// Lookups — the console's Lookups tab (graph.keyforge.ai/console#/definitions/{id}):
// lookups bound from the Lookup Library (GET /compliance/lookup-tables) into
// definition.lookups.items, what the rules see (the resolved bindings on the
// saved definition), and a preview that resolves the saved bindings for one
// subject (POST /compliance/definitions/{id}/lookups:preview).
// ---------------------------------------------------------------------

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { CC_DEFINITIONS_KEY, CcDefinitionWrites, CcDefinitions, type LookupsPreview, type LookupsPreviewItem } from "@/lib/cc-definitions-api";
import {
  LOOKUPS_BASE, LOOKUPS_KEY, LookupTables, compileCondition, contextPaths, keyColumns, lookupHref, valueColumns,
  type LookupMatch, type LookupTable,
} from "@/lib/cc-lookup-tables-api";
import type { EventDefinition } from "@/lib/assurance-events-api";
import { ConditionEditor } from "../LookupConditionEditor";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_BASE, PILL, Spinner, TBODY, TD, TH, THEAD_ROW, cx } from "../ui";
import { JsonField, Section, StateBadge } from "./fields";
import type { TabProps } from "./tabs";

/** One entry of definition.lookups.items. */
interface Binding {
  code: string;
  alias?: string;
  primary?: boolean;
  match?: LookupMatch[];
  when?: string;
  ownCondition?: boolean;
  condition?: { language: string; expression: string } | null;
}

/** The saved definition's lookups as the service resolves them. */
interface ResolvedLookups {
  text: string;
  warnings?: string[];
  items: Array<Binding & {
    alias: string; version?: number; pinned?: boolean; latestActiveVersion?: number; lookupExpression?: string; expression?: string;
  }>;
}

const WHEN = ["RESOLVED", "ON_DEMAND"];

const pick = (b: Binding): Binding => ({
  code: b.code, alias: b.alias, primary: b.primary, match: b.match, when: b.when, ownCondition: b.ownCondition, condition: b.condition,
});

/** A binding as it is saved: defaults are left out, as the console does. */
const toWire = (b: Binding) => ({
  code: b.code,
  ...(b.alias && b.alias !== b.code ? { alias: b.alias } : {}),
  ...(b.primary ? { primary: true } : {}),
  ...(b.match?.length ? { match: b.match } : {}),
  ...(b.when && b.when !== "RESOLVED" ? { when: b.when } : {}),
  ...(b.ownCondition
    ? { ownCondition: true, ...(b.condition?.expression?.trim() ? { condition: { language: "CEL", expression: b.condition.expression } } : {}) }
    : {}),
});

export function LookupsTab({ dto, patch, ro, id }: TabProps) {
  const libraryQ = useQuery({ queryKey: [...LOOKUPS_KEY, "list", {}], queryFn: () => LookupTables.list() });
  const vocabQ = useQuery({ queryKey: [...LOOKUPS_KEY, "vocabulary"], queryFn: () => LookupTables.vocabulary(), staleTime: Infinity });
  // The saved definition (same query as the editor) carries the resolved bindings.
  const savedQ = useQuery({ queryKey: [...CC_DEFINITIONS_KEY, "detail", id], queryFn: () => CcDefinitions.get(id), enabled: !!id });
  const savedLookups = (savedQ.data as unknown as { lookups?: ResolvedLookups } | undefined)?.lookups;
  const resolved = savedLookups && "text" in savedLookups ? savedLookups : undefined;
  const paths = contextPaths(vocabQ.data);
  const editable = !ro;

  const draft = (dto as unknown as { lookups?: { items?: Binding[] } }).lookups;
  const bindings: Binding[] = (Array.isArray(draft?.items) ? draft.items : resolved?.items ?? []).map(pick);
  const setBindings = (next: Binding[]) =>
    patch({ lookups: { items: next.map(toWire) } } as unknown as Partial<EventDefinition>);
  // Setting primary on one binding clears it on the others.
  const update = (i: number, x: Partial<Binding>) =>
    setBindings(bindings.map((b, j) => (j === i ? { ...b, ...x } : x.primary ? { ...b, primary: false } : b)));

  // The library by code: the ACTIVE version, else the latest.
  const library = new Map<string, LookupTable>();
  for (const l of libraryQ.data ?? []) {
    const cur = library.get(l.code);
    if (!cur || (cur.state !== "ACTIVE" && l.state === "ACTIVE") || (cur.state === l.state && l.version > cur.version)) library.set(l.code, l);
  }
  const lookups = [...library.values()];

  const aliasOf = (b: Binding) => b.alias || b.code;
  /** A free alias for another binding of the same lookup: CODE_2, CODE_3, … */
  const freeAlias = (code: string) => {
    const taken = new Set(bindings.map(aliasOf));
    if (!taken.has(code)) return undefined;
    let n = 2;
    while (taken.has(`${code}_${n}`)) n++;
    return `${code}_${n}`;
  };
  /** Starts an own condition from the lookup's: its mappings (with this binding's KEY overrides) and its CEL. */
  const ownFromLookup = (b: Binding): Partial<Binding> => {
    const l = library.get(b.code);
    const base = l?.match ?? [];
    const overrides = b.match ?? [];
    return {
      ownCondition: true,
      match: [...base.map((m) => overrides.find((o) => o.column === m.column) ?? m), ...overrides.filter((o) => !base.some((m) => m.column === o.column))],
      condition: l?.condition?.expression ? { language: "CEL", expression: l.condition.expression } : null,
    };
  };

  const primaryIndex = bindings.findIndex((b) => b.primary);
  const primaryLookup = library.get(bindings[primaryIndex >= 0 ? primaryIndex : 0]?.code ?? "");
  const flatColumns = primaryLookup ? valueColumns(primaryLookup.columns) : [];
  const [adding, setAdding] = useState("");

  return (
    <>
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Bound lookups are resolved <b>before the governance rules</b> and stored on the event: the <b>primary</b> binding&apos;s VALUE columns are
        exposed flat as <code>finding.lookup.&lt;column&gt;</code>, every binding as <code>finding.lookup.&lt;alias&gt;.&lt;column&gt;</code>. Versions
        are pinned when the definition is activated. <code>ON_DEMAND</code> bindings resolve only when a rule&apos;s <code>then.lookup</code> or a
        lookup-typed action parameter asks. A binding resolves with the <b>lookup&apos;s condition</b> (its KEY mappings can be overridden column by
        column) or with an <b>own condition</b> for this definition; the same lookup may be bound several times under different aliases, each with
        its own condition.
      </div>

      <Section
        title="Bound Lookups"
        hint="lookups.items — resolved in this order before the governance rules run."
        actions={<Link href={LOOKUPS_BASE} className={cx(BTN_SECONDARY, "text-xs")}>Open library</Link>}
      >
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>#</th>
                <th className={TH}>Lookup</th>
                <th className={TH}>Alias</th>
                <th className={TH}>Primary</th>
                <th className={TH}>When</th>
                <th className={TH}>Version</th>
                <th className={TH}>Condition</th>
                {editable && <th className={TH}></th>}
              </tr>
            </thead>
            <tbody className={TBODY}>
              {bindings.map((b, i) => {
                const l = library.get(b.code);
                const alias = aliasOf(b);
                const saved = resolved?.items.find((x) => x.alias === alias);
                const keys = l ? keyColumns(l.columns) : [];
                const lookupCondition = saved?.lookupExpression || (l ? compileCondition(l.match, l.condition?.expression) : "");
                return (
                  <Fragment key={`${b.code}#${i}`}>
                    <tr>
                      <td className={TD}>{i + 1}</td>
                      <td className={cx(TD, "min-w-[200px]")}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={lookupHref(b.code, l?.version)} className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-700">{b.code}</Link>
                          {l ? <StateBadge value={l.state} /> : <span className="text-xs text-red-600">not in the library</span>}
                        </div>
                        {l && (
                          <div className="text-xs text-gray-500 mt-1">
                            {l.name} · <span className="font-mono">{l.sourceSchema ? `${l.sourceSchema}.` : ""}{l.sourceName}</span>
                          </div>
                        )}
                      </td>
                      <td className={TD}>
                        <input className={cx(INPUT_BASE, "font-mono text-xs w-44 min-w-[11rem]")} value={alias} readOnly={!editable} aria-label="Alias"
                               onChange={(e) => update(i, { alias: e.target.value })} />
                      </td>
                      <td className={TD}>
                        <input type="radio" name="primary-lookup" checked={primaryIndex >= 0 ? primaryIndex === i : i === 0} disabled={!editable}
                               onChange={() => update(i, { primary: true })} aria-label={`Primary: ${alias}`} />
                      </td>
                      <td className={TD}>
                        <select className={cx(INPUT_BASE, "text-xs w-36 min-w-[9rem]")} value={b.when || "RESOLVED"} disabled={!editable} aria-label="When"
                                onChange={(e) => update(i, { when: e.target.value })}>
                          {WHEN.map((w) => <option key={w}>{w}</option>)}
                        </select>
                      </td>
                      <td className={cx(TD, "text-xs text-gray-600 min-w-[7rem] max-w-[10rem] whitespace-normal break-words")}>
                        {saved?.pinned ? (
                          <>
                            pinned v{saved.version}
                            {saved.latestActiveVersion && saved.latestActiveVersion !== saved.version && (
                              <span className="text-amber-700"> · v{saved.latestActiveVersion} available</span>
                            )}
                          </>
                        ) : l ? `${l.state === "ACTIVE" ? "latest ACTIVE" : l.state} v${l.version} (pinned on activation)` : "—"}
                      </td>
                      <td className={cx(TD, "min-w-[300px]")}>
                        {b.ownCondition ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cx(PILL, "bg-blue-100 text-blue-700")}>own condition</span>
                            {editable && (
                              <button className={cx(BTN_SECONDARY, "px-2.5 py-1 text-xs")}
                                      onClick={() => confirm(`Drop this definition's own condition for ${alias} and resolve with the lookup's condition again?`) &&
                                        update(i, { ownCondition: false, match: undefined, condition: null })}>
                                Use the lookup&apos;s
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 font-mono [overflow-wrap:anywhere]" title="The lookup's condition">{lookupCondition || "—"}</div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-500 pt-1.5 whitespace-nowrap">KEY overrides</span>
                              <div className="flex-1 min-w-[160px]">
                                <JsonField<LookupMatch[]> key={`${b.code}#${i}#${JSON.stringify(b.match ?? [])}`} value={b.match ?? []} rows={1} readOnly={!editable}
                                                          onChange={(v) => update(i, { match: Array.isArray(v) && v.length ? v : undefined })} />
                              </div>
                              {editable && l && (
                                <button className={cx(BTN_SECONDARY, "px-2.5 py-1 text-xs whitespace-nowrap")} onClick={() => update(i, ownFromLookup(b))}>
                                  Own condition…
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      {editable && (
                        <td className={TD}>
                          <button className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                                  onClick={() => setBindings(bindings.filter((_, j) => j !== i))}>
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                    {b.ownCondition && (
                      <tr>
                        <td colSpan={editable ? 8 : 7} className="bg-gray-50 px-5 py-4">
                          <ConditionEditor
                            match={b.match ?? []}
                            expression={b.condition?.expression ?? ""}
                            keys={keys}
                            paths={paths}
                            editable={editable}
                            listId={`lookup-paths-${i}`}
                            resetKey={`${b.code}#${i}`}
                            note={
                              <p className="text-sm text-gray-600">
                                <b>{alias}</b>&apos;s own condition over <b>{b.code}</b>: it replaces the lookup&apos;s condition for this definition only (the
                                lookup&apos;s was <span className="font-mono text-xs">{lookupCondition}</span>). A rule&apos;s <code>then.lookup.match</code> still
                                applies on top.
                              </p>
                            }
                            onChange={(c) => update(i, { match: c.match, condition: c.expression.trim() ? { language: "CEL", expression: c.expression } : null })}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!bindings.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No lookup bound — the rules see no <code>finding.lookup</code>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <div className="flex w-full items-center gap-3">
            <select className={cx(INPUT_BASE, "flex-1 min-w-0 w-full")} value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Bind a lookup…</option>
              {lookups.map((l) => (
                <option key={l.lookupId} value={l.code}>
                  {l.code} — {l.name} ({l.state}){bindings.some((b) => b.code === l.code) ? " · bound already, add it again under another alias" : ""}
                </option>
              ))}
            </select>
            <button className={cx(BTN_PRIMARY, "shrink-0")} disabled={!adding}
                    onClick={() => { setBindings([...bindings, { code: adding, alias: freeAlias(adding), primary: bindings.length === 0 }]); setAdding(""); }}>
              <Plus size={14} /> Add
            </button>
            <span className="shrink-0 whitespace-nowrap text-xs text-gray-500">
              {libraryQ.isLoading ? <Spinner size={12} /> : libraryQ.error ? <span className="text-red-600">{(libraryQ.error as Error).message}</span>
                : `${lookups.length} lookup(s) in the library`}
            </span>
          </div>
        )}
      </Section>

      <Section title="What the Rules See" hint="Resolved by the service on every read of the saved definition.">
        {resolved ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-gray-500">Bindings</dt>
            <dd className="font-semibold text-gray-900">{resolved.text}</dd>
            <dt className="text-gray-500">Warnings</dt>
            <dd>
              {resolved.warnings?.length
                ? resolved.warnings.map((w, i) => <div key={i} className="text-amber-700">△ {w}</div>)
                : <span className="text-green-700">none</span>}
            </dd>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Saved definitions show the resolved bindings here.</p>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">finding.lookup.*</div>
          <div className="flex flex-wrap gap-1.5">
            {flatColumns.map((c) => <Chip key={c}>finding.lookup.{c}</Chip>)}
            {bindings.map((b, i) => <Chip key={`${aliasOf(b)}#${i}`}>finding.lookup.{aliasOf(b)}.&lt;column&gt;</Chip>)}
            {!bindings.length && <span className="text-sm text-gray-400">—</span>}
          </div>
          {resolved?.items.map((x) => x.expression && (
            <div key={x.alias} className="text-xs text-gray-500 font-mono mt-2 [overflow-wrap:anywhere]">
              {x.alias}{x.ownCondition ? " (own condition)" : ""}: {x.expression}
            </div>
          ))}
        </div>
      </Section>

      <PreviewSection id={id} />
    </>
  );
}

const Chip = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700">{children}</span>
);

/** Resolves the saved bindings for one event or catalog entitlement. */
function PreviewSection({ id }: { id: string }) {
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState<LookupsPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const v = subject.trim();
    setBusy(true);
    setError(null);
    try {
      // A catalog entitlement id starts with "e"; anything else is an event id.
      setResult(await CcDefinitionWrites.lookupsPreview(id, /^[0-9a-f-]{36}$/i.test(v) && v.startsWith("e") ? { entitlementId: v } : { eventId: v }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Preview"
      hint="Resolve the saved bindings for one subject; nothing is persisted."
      actions={
        <div className="flex items-center gap-2">
          <input className={cx(INPUT_BASE, "font-mono text-xs w-80")} value={subject} placeholder="eventId, or an entitlementId (e…) of the catalog"
                 onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && id && subject.trim() && run()} />
          <button className={BTN_PRIMARY} disabled={!id || busy || !subject.trim()} onClick={run}>
            {busy && <Spinner size={14} className="text-white" />} Preview
          </button>
        </div>
      }
    >
      {!id && <p className="text-sm text-gray-500">Create the definition first.</p>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {result ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4">
            {result.items.map((x) => <PreviewItem key={x.alias} x={x} />)}
            {!result.items.length && <p className="text-sm text-gray-500">The saved definition binds no lookup.</p>}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">finding.lookup (as the rules would see it)</div>
              <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto max-h-80">
                {JSON.stringify(result["finding.lookup"] ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">Subject</div>
              <KeyValues o={result.subject ?? {}} />
            </div>
          </div>
        </div>
      ) : id && !error && <p className="text-sm text-gray-500">Enter an event or entitlement id and preview.</p>}
    </Section>
  );
}

function PreviewItem({ x }: { x: LookupsPreviewItem }) {
  const rows: Array<[string, ReactNode]> = [
    ["Lookup", (
      <>
        <b>{x.code}</b> v{x.version} <span className="font-mono text-xs text-gray-500">{x.source}</span>
        {x.alias && x.alias !== x.code && <> as <b className="font-mono">{x.alias}</b></>}
        {x.primary && <span className={cx(PILL, "ml-2 bg-blue-100 text-blue-700")}>primary</span>}
      </>
    )],
    ["Matched", (
      <>
        {x.error ? <b className="text-red-600">failed: {x.error}</b> : x.matched ? <b className="text-green-700">yes</b> : <b>no row</b>}{" "}
        <span className="text-xs text-gray-500">
          · {x.rowCount ?? 0} row(s){x.truncated ? " (truncated)" : ""}{x.cached ? " · cached" : ""}{x.durationMs != null ? ` · ${x.durationMs} ms` : ""}
        </span>
      </>
    )],
    ["Keys", <span key="k" className="font-mono text-xs">{Object.entries(x.keys ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" · ") || "—"}</span>],
  ];
  if (x.expression) rows.push(["Condition", <span key="c" className="font-mono text-xs [overflow-wrap:anywhere]">{x.expression}</span>]);
  if (x.pushedDown) rows.push(["Pushed down", <span key="p" className="font-mono text-xs text-gray-500 [overflow-wrap:anywhere]">{x.pushedDown.join(" && ") || "—"}</span>]);
  if (x.postFiltered?.length) rows.push(["Post-filtered", <span key="f" className="font-mono text-xs text-gray-500">{x.postFiltered.join(" && ")}</span>]);
  if (x.sql) rows.push(["SQL", <span key="s" className="font-mono text-xs text-gray-500 [overflow-wrap:anywhere]">{x.sql}<div>binds {JSON.stringify(x.binds)}</div></span>]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-900 font-mono">
        {x.alias} ← {x.code} v{x.version}
      </div>
      <div className="p-4 space-y-3">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => <Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="text-gray-900 min-w-0">{v}</dd></Fragment>)}
        </dl>
        {x.matched && x.row && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">Selected row</div>
            <KeyValues o={x.row} />
          </div>
        )}
        {x.rows && x.rows.length > 1 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">Rows (select ALL)</div>
            <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-2 overflow-auto max-h-60">{JSON.stringify(x.rows.slice(0, 20), null, 2)}</pre>
          </div>
        )}
        {x.warnings?.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {x.warnings.map((w, i) => <div key={i}>△ {w}</div>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KeyValues({ o }: { o: Record<string, unknown> }) {
  const entries = Object.entries(o);
  if (!entries.length) return <span className="text-sm text-gray-400">—</span>;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-gray-500 font-mono text-xs pt-0.5">{k}</dt>
          <dd className="text-gray-900 min-w-0 [overflow-wrap:anywhere]">
            {v == null || v === "" ? <span className="text-gray-400">—</span>
              : typeof v === "boolean" ? <span className={v ? "text-green-700" : "text-red-600"}>{String(v)}</span>
              : typeof v === "object" ? <code className="text-xs text-gray-500">{JSON.stringify(v)}</code>
              : String(v)}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
