// =====================================================================
// Continuous Assurance — Lookup library (live API).
//
// Same API as the Continuous Compliance Console's Lookup library
// (graph.keyforge.ai/console#/lookup-tables), through ISPM's proxy
// (lib/controls-api.ts → /api/continuouscompliance):
//   GET    /compliance/lookup-tables?state=&q=
//   GET    /compliance/lookup-tables/{code}?version=
//   GET    /compliance/lookup-tables/{code}/versions | /usage
//   GET    /compliance/lookup-tables/{code}/rows?version=&page=&pageSize=&{column}=
//   GET    /compliance/lookup-tables/{code}/rows-table     (where rows are seeded)
//   POST   /compliance/lookup-tables/{code}/rows           (seed: APPEND | REPLACE)
//   DELETE /compliance/lookup-tables/{code}/rows?{key}=    (rows with those KEY values)
//   POST   /compliance/lookup-tables                       (create, DRAFT)
//   PUT    /compliance/lookup-tables/{code}                (the tenant DRAFT)
//   DELETE /compliance/lookup-tables/{code}?version=       (a DRAFT)
//   POST   /compliance/lookup-tables/{code}/clone | /versions | /activate | /deprecate | /invalidate
// A lookup describes a decision table or view kept in an allow-listed
// schema: the columns it exposes (KEY columns match the event, VALUE
// columns are copied) and the match. A definition binds lookups on its
// Lookups tab; the selected row lands on the event as finding.lookup.*.
// =====================================================================

import { ccRequest } from "@/lib/controls-api";

export const LOOKUPS_BASE = "/assurance-events/lookup-library";
export const lookupHref = (code: string, version?: number) =>
  `${LOOKUPS_BASE}/${encodeURIComponent(code)}${version ? `?version=${version}` : ""}`;

// Fallbacks for when GET /compliance/lookup-tables/vocabulary is unavailable.
export const COLUMN_ROLES = ["KEY", "VALUE", "BOTH"];
export const SELECT_MODES = ["FIRST", "ALL"];

export interface LookupColumn {
  name: string;
  type: string;
  role: string;
  label?: string;
  sensitive?: boolean;
}

export interface LookupMatch {
  column: string;
  path: string;
  wildcard?: string | null;
}

export interface LookupTable {
  lookupId: string;
  code: string;
  name: string;
  description?: string;
  owner?: string;
  sourceSchema: string;
  sourceName: string;
  sourceKind: string;
  tenantColumn?: string;
  rowsTableSchema?: string | null;
  rowsTableName?: string | null;
  columns: LookupColumn[];
  condition?: { language: string; expression: string } | null;
  match?: LookupMatch[];
  selectMode: string;
  orderBy?: unknown[];
  maxRows?: number;
  cacheTtl?: string;
  tags?: string[];
  version: number;
  state: string;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

/** Body of POST /compliance/lookup-tables and PUT /compliance/lookup-tables/{code}. */
export interface LookupTableRequest {
  code: string;
  name: string;
  description: string;
  owner: string;
  source: { schema: string; name: string; kind: string };
  tenantColumn: string;
  rowsTable: { schema: string; name: string } | null;
  columns: LookupColumn[];
  condition?: { language: string; expression: string } | null;
  match: LookupMatch[];
  select: string;
  orderBy: unknown[];
  maxRows: number;
  cacheTtl: string;
  tags: string[];
}

export interface LookupUsage {
  latestActiveVersion?: number | null;
  definitions?: number;
  byVersion?: Record<string, Array<{
    definitionId: string; code: string; version: number; state: string; position: number; alias: string; primary: boolean; pinned: boolean;
  }>>;
  rules?: Array<{ definitionId: string; definitionCode: string; definitionVersion: number; state: string; [key: string]: unknown }>;
}

export interface LookupRows {
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  count: number;
  hasMore: boolean;
  durationMs?: number;
}

/** GET /compliance/lookup-tables/{code}/rows-table — where the Rows tab seeds rows, if it can. */
export interface LookupRowsTable {
  seedable: boolean;
  reason?: string;
  source?: string;
  tenantColumn?: string;
  rowsTable?: { schema: string; name: string } | null;
  keyColumns: string[];
  columns: Array<{ name: string; sqlType?: string; type?: string; required?: boolean; hasDefault?: boolean }>;
}

export interface LookupSeedResult {
  mode: string;
  inserted: number;
  deleted: number;
  rowsTable: string;
  durationMs?: number;
}

/** "Load many" text → rows: a JSON array of objects, or CSV / TSV / ;-separated with a header line (empty cells are NULL). */
export function parseSeedRows(text: string): Array<Record<string, unknown>> {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    const v = JSON.parse(t);
    if (!Array.isArray(v)) throw new Error("JSON must be an array of objects");
    return v;
  }
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header line and at least one row");
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const header = splitCsvLine(lines[0], sep);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, sep);
    const row: Record<string, unknown> = {};
    header.forEach((h, i) => { const v = (cells[i] ?? "").trim(); if (v !== "") row[h] = v; });
    return row;
  });
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/* ---------- Condition: mapping ⇄ CEL (as the console's Condition editor) ---------- */

const equality = (m: LookupMatch) =>
  m.wildcard ? `(row.${m.column} == ${m.path} || row.${m.column} == '${m.wildcard}')` : `row.${m.column} == ${m.path}`;

/** The whole condition as CEL: one equality per mapping, ANDed with the additional CEL ("true" when empty). */
export function compileCondition(match: LookupMatch[] = [], expression = ""): string {
  const parts = match.filter((m) => m.column && m.path).map(equality);
  if (expression.trim()) parts.push(expression.trim());
  return parts.join(" && ") || "true";
}

/**
 * Splits CEL into the KEY equalities that are pushed down to SQL (as mappings) and the residual
 * conjuncts evaluated in memory on the fetched rows.
 */
export function splitCondition(expression: string, keys: string[]) {
  const match: LookupMatch[] = [];
  const memory: string[] = [];
  for (const conj of splitTop(expression || "", "&&").filter(Boolean)) {
    const m = asKeyEquality(conj, keys);
    if (m && !match.some((x) => x.column === m.column)) match.push(m);
    else if (!m) memory.push(conj);
  }
  return { match, residual: memory.join(" && "), pushdown: match.map(equality), memory };
}

/** Splits on a top-level operator, ignoring quoted strings and bracketed groups. */
function splitTop(s: string, op: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === "\\" && i + 1 < s.length) { cur += s[++i]; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    if (c === ")" || c === "]" || c === "}") depth--;
    if (depth === 0 && s.startsWith(op, i)) { out.push(cur.trim()); cur = ""; i += op.length - 1; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** True when the outer parentheses wrap the whole expression. */
function wrapsWhole(s: string): boolean {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === "(") depth++;
    if (c === ")") { depth--; if (depth === 0 && i < s.length - 1) return false; }
  }
  return depth === 0;
}

function unwrap(s: string): string {
  let t = s.trim();
  while (t.startsWith("(") && t.endsWith(")") && wrapsWhole(t)) t = t.slice(1, -1).trim();
  return t;
}

const ROW_REF = /\brow\.[A-Za-z_][A-Za-z0-9_]*/;
const ROW_COLUMN = /^row\.([A-Za-z_][A-Za-z0-9_]*)$/;

/** "row.col == expr" (either side) → [col, expr], when the other side does not read the row. */
function rowEquality(s: string): [string, string] | null {
  const sides = splitTop(s, "==");
  if (sides.length !== 2) return null;
  const [a, b] = sides;
  let m = ROW_COLUMN.exec(a);
  if (m && !ROW_REF.test(b)) return [m[1], b];
  m = ROW_COLUMN.exec(b);
  return m && !ROW_REF.test(a) ? [m[1], a] : null;
}

const literal = (s: string) => {
  const m = /^(?:'([^']*)'|"([^"]*)")$/.exec(s.trim());
  return m ? (m[1] ?? m[2]) : null;
};

function asKeyEquality(conj: string, keys: string[]): LookupMatch | null {
  const s = unwrap(conj);
  const alts = splitTop(s, "||");
  if (alts.length === 2) {
    const a = rowEquality(unwrap(alts[0]));
    const b = rowEquality(unwrap(alts[1]));
    if (a && b && a[0] === b[0] && keys.includes(a[0])) {
      const la = literal(a[1]);
      const lb = literal(b[1]);
      if (la === null && lb !== null) return { column: a[0], path: a[1], wildcard: lb };
      if (lb === null && la !== null) return { column: b[0], path: b[1], wildcard: la };
    }
    return null;
  }
  if (alts.length > 2) return null;
  const e = rowEquality(s);
  return e && keys.includes(e[0]) ? { column: e[0], path: e[1], wildcard: null } : null;
}

/** Every context path the vocabulary offers, for the mapping's autocomplete. */
export function contextPaths(v?: LookupVocabulary): string[] {
  if (!v) return [];
  const out = new Set<string>();
  for (const group of Object.values(v.paths ?? {})) for (const list of Object.values(group)) list.forEach((p) => out.add(p));
  [...(v.findingPaths ?? []), ...(v.eventPaths ?? []), ...(v.definitionPaths ?? [])].forEach((p) => out.add(p));
  return [...out];
}

/** Starting point for "New Lookup" (the console's sample). */
export const NEW_LOOKUP: LookupTableRequest = {
  code: "MY_LOOKUP",
  name: "New lookup",
  description: "",
  owner: "",
  source: { schema: "", name: "cc_lk_fallback_group_v", kind: "VIEW" },
  tenantColumn: "tenant_id",
  rowsTable: { schema: "", name: "cc_lk_fallback_group" },
  columns: [],
  match: [],
  select: "FIRST",
  orderBy: [],
  maxRows: 1000,
  cacheTtl: "PT5M",
  tags: [],
};

export const toLookupRequest = (l: LookupTable): LookupTableRequest => ({
  code: l.code,
  name: l.name,
  description: l.description ?? "",
  owner: l.owner ?? "",
  source: { schema: l.sourceSchema, name: l.sourceName, kind: l.sourceKind },
  tenantColumn: l.tenantColumn ?? "",
  rowsTable: l.rowsTableName ? { schema: l.rowsTableSchema ?? "", name: l.rowsTableName } : null,
  columns: l.columns ?? [],
  condition: l.condition ?? undefined,
  match: l.match ?? [],
  select: l.selectMode,
  orderBy: l.orderBy ?? [],
  maxRows: l.maxRows ?? 1000,
  cacheTtl: l.cacheTtl ?? "PT5M",
  tags: l.tags ?? [],
});

export const keyColumns = (cols: LookupColumn[] = []) => cols.filter((c) => c.role !== "VALUE").map((c) => c.name);
export const valueColumns = (cols: LookupColumn[] = []) => cols.filter((c) => c.role !== "KEY").map((c) => c.name);

export const LOOKUPS_KEY = ["continuouscompliance", "lookup-tables"] as const;

const path = (code: string) => `/compliance/lookup-tables/${encodeURIComponent(code)}`;
const ver = (v?: number) => (v ? String(v) : undefined);
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const LookupTables = {
  list: async (q: { state?: string; q?: string } = {}) => list<LookupTable>(await ccRequest("GET", "/compliance/lookup-tables", { query: q })),
  get: (code: string, version?: number) => ccRequest<LookupTable>("GET", path(code), { query: { version: ver(version) } }),
  versions: async (code: string) => list<LookupTable>(await ccRequest("GET", `${path(code)}/versions`)),
  usage: (code: string) => ccRequest<LookupUsage>("GET", `${path(code)}/usage`),
  rows: (code: string, q: { version?: number; page: number; pageSize: number; filters?: Record<string, string> }) =>
    ccRequest<LookupRows>("GET", `${path(code)}/rows`, {
      query: { ...(q.filters ?? {}), version: ver(q.version), page: String(q.page), pageSize: String(q.pageSize) },
    }),
  rowsTable: (code: string, version?: number) => ccRequest<LookupRowsTable>("GET", `${path(code)}/rows-table`, { query: { version: ver(version) } }),
  seedRows: (code: string, body: { rows: Array<Record<string, unknown>>; mode: "APPEND" | "REPLACE" }, version?: number) =>
    ccRequest<LookupSeedResult>("POST", `${path(code)}/rows`, { body, query: { version: ver(version) } }),
  deleteRows: (code: string, keys: Record<string, string>, version?: number) =>
    ccRequest<{ deleted: number; rowsTable: string }>("DELETE", `${path(code)}/rows`, { query: { ...keys, version: ver(version) } }),
  create: (body: LookupTableRequest) => ccRequest<LookupTable>("POST", "/compliance/lookup-tables", { body }),
  update: (code: string, body: LookupTableRequest) => ccRequest<LookupTable>("PUT", path(code), { body }),
  remove: (code: string, version?: number) => ccRequest<unknown>("DELETE", path(code), { query: { version: ver(version) } }),
  clone: (code: string, body: { code: string; name?: string }) => ccRequest<LookupTable>("POST", `${path(code)}/clone`, { body }),
  newVersion: (code: string) => ccRequest<LookupTable>("POST", `${path(code)}/versions`),
  activate: (code: string, version?: number) => ccRequest<LookupTable>("POST", `${path(code)}/activate`, { query: { version: ver(version) } }),
  deprecate: (code: string, version?: number, force?: boolean) =>
    ccRequest<LookupTable>("POST", `${path(code)}/deprecate`, { query: { version: ver(version), force: force ? "true" : undefined } }),
  invalidate: (code: string) => ccRequest<{ dropped: number }>("POST", `${path(code)}/invalidate`),
  vocabulary: () => ccRequest<LookupVocabulary>("GET", "/compliance/lookup-tables/vocabulary"),
};

/** GET /compliance/lookup-tables/vocabulary — the editor's option lists. */
export interface LookupVocabulary {
  allowedSchemas?: string[];
  allowedNamePrefixes?: string[];
  columnTypes?: string[];
  roles?: string[];
  selectModes?: string[];
  maxRows?: number;
  paths?: Record<string, Record<string, string[]>>;
  findingPaths?: string[];
  eventPaths?: string[];
  definitionPaths?: string[];
}
