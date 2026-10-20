"use client";

// =====================================================================
// Data Explorer — one card per datalake object type. Clicking a card runs
// that type's named query on the entities service
// (POST /entities/api/v1/{tenant}/executeNamedQuery, parameters [limit, offset] —
// offset is the number of rows to skip, so page N asks for [100, (N - 1) * 100])
// and shows the rows in the table below. The global fetch patch
// (lib/authFetch.ts) adds the bearer token and X-Tenant-Id.
// Columns are taken from the rows themselves.
// =====================================================================

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppWindow, IdCard, KeyRound, RefreshCw, ShieldUser, UserRound, Users, type LucideIcon } from "lucide-react";
import {
  BTN_SECONDARY, CARD, CARD_SUBTITLE, CARD_TITLE, PAGE, PAGE_INNER_FLUSH, PageHeader, PageSpinner, Spinner,
  TBODY, TD, TH, THEAD_ROW, TabBar, cx,
} from "@/components/assurance-events/ui";
import { resolveTenantIdForHeader } from "@/lib/auth";
import { formatAbsolute } from "@/lib/assurance-format";

const ENTITIES_ORIGIN = "https://preview.keyforge.ai";
const DEFAULT_TENANT = "ACMECOM";
const PAGE_SIZE = 100;

type Row = Record<string, unknown>;

/** A table column: `text` feeds the cell tooltip and the search; `render` (optional) draws the cell. */
interface Column {
  key: string;
  label: string;
  text: (row: Row) => string;
  render?: (row: Row) => ReactNode;
}

/**
 * `query` is the entities service named query (null until it is known).
 * `columns` maps the rows to a fixed column set; without it every field becomes a column.
 */
const OBJECT_TYPES: { name: string; icon: LucideIcon; query: string | null; columns?: (rows: Row[], attrs: string[]) => Column[] }[] = [
  { name: "Identity", icon: UserRound, query: "GET_IIQ_ALL_IDENTITIES", columns: identityColumns },
  { name: "Entitlement", icon: KeyRound, query: "GET_IIQ_ALL_ENTITLEMENTS", columns: entitlementColumns },
  { name: "Application", icon: AppWindow, query: "GET_IIQ_ALL_APPLICATIONS", columns: applicationColumns },
  { name: "Account", icon: IdCard, query: "GET_IIQ_ALL_ACCOUNTS", columns: accountColumns },
  { name: "Workgroup", icon: Users, query: "GET_IIQ_ALL_WORKGROUPS", columns: workgroupColumns },
  { name: "Role", icon: ShieldUser, query: "GET_IIQ_ROLES", columns: roleColumns },
];

const FILTER_INPUT =
  "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/** The entities service answers with a bare array or wraps it in resultSet / rows / data. */
function extractRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["resultSet", "rows", "data", "items", "content"]) {
      if (Array.isArray(o[key])) return o[key] as Row[];
    }
  }
  return [];
}

async function executeNamedQuery(query: string, limit: number, offset: number): Promise<Row[]> {
  const tenant = resolveTenantIdForHeader() || DEFAULT_TENANT;
  const res = await fetch(`${ENTITIES_ORIGIN}/entities/api/v1/${encodeURIComponent(tenant)}/executeNamedQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, parameters: [limit, offset] }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const o = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const msg = o?.error ?? o?.message;
    throw new Error(msg ? String(msg) : `Request failed: ${res.status}`);
  }
  return extractRows(data);
}

/** "app_name" / "appName" → "App Name" */
const columnLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());

function cellText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const isPresent = (value: unknown) => value !== null && value !== undefined && value !== "";
const yesNo = (value: unknown) => (value === true ? "Yes" : value === false ? "No" : "—");
const dateText = (value: unknown) => formatAbsolute(typeof value === "string" ? value : null);
const attributesOf = (row: Row): Row =>
  row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes) ? (row.attributes as Row) : {};

/** Every field of every row, in first-seen order. */
function autoColumns(rows: Row[]): Column[] {
  const keys: string[] = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  return keys.map((k) => ({ key: k, label: columnLabel(k), text: (r) => cellText(r[k]) }));
}

/** An "inactive" flag (`inactive`, or `is_inactive` on entitlements) shown as an Active / Inactive badge. */
function statusColumn(field = "inactive"): Column {
  const statusText = (r: Row) => (r[field] === true ? "Inactive" : r[field] === false ? "Active" : "—");
  return {
    key: field, label: "Status", text: statusText,
    render: (r) => {
      const s = statusText(r);
      if (s === "—") return s;
      return (
        <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          s === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
          {s}
        </span>
      );
    },
  };
}

/**
 * An attribute value as text. A small object of plain values (e.g. a localized
 * { en_US: "…" } description) shows just its values; anything deeper stays JSON.
 */
function attributeText(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const values = Object.values(value as Row);
    if (values.length > 0 && values.every((v) => v === null || typeof v !== "object")) {
      return values.map(cellText).join(", ");
    }
  }
  return cellText(value);
}

/** The attribute keys of the rows, in first-seen order, after the `known` ones. */
function attributeKeys(rows: Row[], known: string[] = []): string[] {
  const keys = [...known];
  rows.forEach((r) => Object.keys(attributesOf(r)).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  return keys;
}

/**
 * attributes.* — one column per key (e.g. firstname, displayName, email). `keys` are the
 * keys seen on every page visited so far, so a page whose rows lack one keeps its column.
 * List values show as chips.
 */
function attributeColumns(keys: string[]): Column[] {
  return keys.map((k) => ({
    key: `attributes.${k}`,
    label: columnLabel(k),
    text: (r) => {
      const v = attributesOf(r)[k];
      return Array.isArray(v) ? listValues(v).join(", ") || "—" : attributeText(v);
    },
    render: (r) => {
      const v = attributesOf(r)[k];
      return Array.isArray(v) ? <MultiValueCell values={listValues(v)} /> : attributeText(v);
    },
  }));
}

/** Array items as text: strings, or the name / id of { name, id } objects. */
const listValues = (items: unknown[]): string[] =>
  items.map((v) => (v && typeof v === "object" ? cellText((v as Row).name ?? (v as Row).id) : cellText(v)));

const MULTI_VALUE_PREVIEW = 2;

/** A multivalued cell: the first few values as chips, the rest behind "+N more". */
function MultiValueCell({ values }: { values: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (values.length === 0) return <>—</>;
  const shown = expanded ? values : values.slice(0, MULTI_VALUE_PREVIEW);
  const hidden = values.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1 whitespace-normal min-w-[16rem]">
      {shown.map((v, i) => (
        <span key={`${v}-${i}`} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{v}</span>
      ))}
      {values.length > MULTI_VALUE_PREVIEW && (
        <button type="button" onClick={() => setExpanded((e) => !e)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700">
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

/** A column for an array field (strings, or { name } objects). */
function multiValueColumn(key: string, label: string): Column {
  const values = (r: Row): string[] => (Array.isArray(r[key]) ? listValues(r[key] as unknown[]) : []);
  return {
    key, label,
    text: (r) => values(r).join(", ") || "—",
    render: (r) => <MultiValueCell values={values(r)} />,
  };
}

/** A list of people as "a, b": items may be { id, name } objects or plain strings. */
function namesText(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return listValues(value).join(", ");
}

/** GET_IIQ_ALL_APPLICATIONS: only these fields; remediators are shown as Revoke Owner. */
function applicationColumns(): Column[] {
  return [
    { key: "name", label: "Name", text: (r) => cellText(r.name) },
    { key: "description", label: "Description", text: (r) => cellText(r.description) },
    { key: "type", label: "Type", text: (r) => cellText(r.type) },
    { key: "authoritative", label: "Authoritative", text: (r) => yesNo(r.authoritative) },
    { key: "logical", label: "Logical", text: (r) => yesNo(r.logical) },
    { key: "owner_name", label: "Owner", text: (r) => cellText(r.owner_name) },
    { key: "secondary_owners", label: "Secondary Owners", text: (r) => namesText(r.secondary_owners) },
    { key: "remediators", label: "Revoke Owner", text: (r) => namesText(r.remediators) },
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "modified_at", label: "Modified At", text: (r) => dateText(r.modified_at) },
  ];
}

/** GET_IIQ_ALL_IDENTITIES: only these fields; attribute keys become their own columns. */
function identityColumns(rows: Row[], attrs: string[]): Column[] {
  const columns: Column[] = [
    { key: "name", label: "Username", text: (r) => cellText(r.name) },
    statusColumn(),
    { key: "type", label: "Type", text: (r) => cellText(r.type) },
    { key: "correlated", label: "Source", text: (r) => (r.correlated === true ? "hr_sync" : "—") },
    { key: "manager_status", label: "Manager Status", text: (r) => yesNo(r.manager_status) },
    { key: "manager_id", label: "Manager ID", text: (r) => cellText(r.manager_id) },
    { key: "manager_name", label: "Manager Name", text: (r) => cellText(r.manager_name) },
  ];

  // Administrator columns only when at least one row has a value.
  if (rows.some((r) => isPresent(r.administrator_id))) {
    columns.push({ key: "administrator_id", label: "Administrator ID", text: (r) => cellText(r.administrator_id) });
  }
  if (rows.some((r) => isPresent(r.administrator_name))) {
    columns.push({ key: "administrator_name", label: "Administrator Name", text: (r) => cellText(r.administrator_name) });
  }

  columns.push(
    ...attributeColumns(attrs),
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "last_refresh", label: "Last Refresh", text: (r) => dateText(r.last_refresh) },
    { key: "last_login", label: "Last Login", text: (r) => dateText(r.last_login) },
  );
  return columns;
}

/** GET_IIQ_ALL_ENTITLEMENTS: only these fields; attribute keys become their own columns. */
function entitlementColumns(_rows: Row[], attrs: string[]): Column[] {
  return [
    { key: "displayable_name", label: "Name", text: (r) => cellText(r.displayable_name) },
    { key: "attribute", label: "Attribute", text: (r) => cellText(r.attribute) },
    { key: "type", label: "Type", text: (r) => cellText(r.type) },
    { key: "application_name", label: "Application", text: (r) => cellText(r.application_name) },
    { key: "aggregated", label: "Aggregated", text: (r) => yesNo(r.aggregated) },
    { key: "iiq_elevated_access", label: "Elevated Access", text: (r) => yesNo(r.iiq_elevated_access) },
    { key: "owner_name", label: "Owner", text: (r) => cellText(r.owner_name) },
    ...attributeColumns(attrs),
    statusColumn("is_inactive"),
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "modified_at", label: "Modified At", text: (r) => dateText(r.modified_at) },
  ];
}

/** GET_IIQ_ALL_ACCOUNTS: only these fields; attribute keys become their own columns. */
function accountColumns(_rows: Row[], attrs: string[]): Column[] {
  return [
    { key: "application_name", label: "Application", text: (r) => cellText(r.application_name) },
    {
      key: "manually_correlated", label: "Source",
      text: (r) => (r.manually_correlated === true ? "Manual" : r.manually_correlated === false ? "Automatic" : "—"),
    },
    ...attributeColumns(attrs),
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "modified_at", label: "Modified At", text: (r) => dateText(r.modified_at) },
  ];
}

/** GET_IIQ_ROLES: only these fields; attribute keys become their own columns. */
function roleColumns(_rows: Row[], attrs: string[]): Column[] {
  return [
    { key: "name", label: "Name", text: (r) => cellText(r.name) },
    { key: "type", label: "Type", text: (r) => cellText(r.type) },
    { key: "iiq_elevated_access", label: "Elevated Access", text: (r) => yesNo(r.iiq_elevated_access) },
    { key: "owner_name", label: "Owner", text: (r) => cellText(r.owner_name) },
    ...attributeColumns(attrs),
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "modified_at", label: "Modified At", text: (r) => dateText(r.modified_at) },
  ];
}

/** GET_IIQ_ALL_WORKGROUPS: only these fields; capabilities is multivalued, attribute keys become their own columns. */
function workgroupColumns(_rows: Row[], attrs: string[]): Column[] {
  return [
    { key: "name", label: "Name", text: (r) => cellText(r.name) },
    statusColumn(),
    { key: "owner_name", label: "Owner", text: (r) => cellText(r.owner_name) },
    multiValueColumn("capabilities", "Capabilities"),
    ...attributeColumns(attrs),
    { key: "created_at", label: "Created At", text: (r) => dateText(r.created_at) },
    { key: "modified_at", label: "Modified At", text: (r) => dateText(r.modified_at) },
  ];
}

export default function DataExplorerPage() {
  const [selected, setSelected] = useState(OBJECT_TYPES[0].name);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const type = OBJECT_TYPES.find((t) => t.name === selected) ?? OBJECT_TYPES[0];
  const query = type.query;

  const q = useQuery({
    queryKey: ["datalake", "named-query", query, PAGE_SIZE, page],
    queryFn: () => executeNamedQuery(query!, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    enabled: !!query,
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);

  // Attribute keys per tab, gathered over every page visited, so columns don't drop out on later pages.
  const [knownAttrs, setKnownAttrs] = useState<Record<string, string[]>>({});
  const known = knownAttrs[type.name];
  const attrs = useMemo(() => attributeKeys(rows, known), [rows, known]);
  if (attrs.length !== (known?.length ?? 0)) setKnownAttrs({ ...knownAttrs, [type.name]: attrs });

  const columns = useMemo(() => (type.columns ? type.columns(rows, attrs) : autoColumns(rows)), [type, rows, attrs]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () => (term ? rows.filter((r) => columns.some((c) => c.text(r).toLowerCase().includes(term))) : rows),
    [rows, columns, term],
  );

  const hasNext = rows.length >= PAGE_SIZE;

  const selectType = (name: string) => {
    setSelected(name);
    setPage(1);
    setSearch("");
  };

  return (
    <div className={PAGE}>
      <div className={PAGE_INNER_FLUSH}>
        <PageHeader title="Data Explorer" subtitle="Explore data held in the Assurance Events datalake." />

        <TabBar
          tabs={OBJECT_TYPES.map(({ name, icon: Icon }) => [name, <><Icon className="h-4 w-4" aria-hidden="true" />{name}</>])}
          active={selected}
          onChange={selectType}
        />

          <div className={CARD}>
            <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={CARD_TITLE}>{type.name}</div>
                {query && (
                  <div className={CARD_SUBTITLE}>
                    Page {page} · {visible.length}{term ? ` of ${rows.length}` : ""} row{visible.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
              {query && (
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search this page…"
                    className={cx(FILTER_INPUT, "w-64")}
                    aria-label={`Search ${type.name.toLowerCase()} rows on this page`}
                  />
                  <button type="button" className={BTN_SECONDARY} onClick={() => q.refetch()} disabled={q.isFetching}>
                    <RefreshCw className={cx("h-4 w-4", q.isFetching && "animate-spin")} /> Refresh
                  </button>
                </div>
              )}
            </div>

            {!query ? (
              <div className="p-5 text-sm text-gray-500">No data source is configured for {type.name} yet.</div>
            ) : q.isLoading ? (
              <PageSpinner />
            ) : q.error ? (
              <div className="p-5 text-sm text-red-600">
                Could not load {type.name.toLowerCase()} data: {q.error instanceof Error ? q.error.message : String(q.error)}
              </div>
            ) : visible.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">{term ? "No rows match the search." : "No rows found."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={THEAD_ROW}>
                      {columns.map((c) => <th key={c.key} className={cx(TH, "whitespace-nowrap")}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className={TBODY}>
                    {visible.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {columns.map((c) => (
                          <td key={c.key} className={cx(TD, "max-w-xs truncate")} title={c.text(r)}>
                            {c.render ? c.render(r) : c.text(r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {query && (
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 text-sm text-gray-600">
                {q.isFetching && !q.isLoading && <Spinner />}
                <button type="button" className={BTN_SECONDARY} onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || q.isFetching}>
                  Previous
                </button>
                <span>Page {page}</span>
                <button type="button" className={BTN_SECONDARY} onClick={() => setPage((p) => p + 1)} disabled={!hasNext || q.isFetching}>
                  Next
                </button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
