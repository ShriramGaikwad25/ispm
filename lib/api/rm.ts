import { executeQuery } from "@/lib/api";
import { coerceRowObject, extractResultRows } from "@/lib/nhi-dashboard";
import { getKfResultData, mapExecuteQueryToDashboard, mapExecuteQueryToRulesets } from "@/lib/rm-dashboard-data";
import type { RmDashboardData, RmRuleset, RulesetCsvRow } from "@/types/rm-dashboard";
import type {
  FunctionRow,
  RuleDetail,
  RuleListRow,
  UpsertRuleV2Input,
  UserAttributeCatalog,
} from "@/types/rm-rules";
import type {
  FunctionDetail,
  FunctionListRow,
  ListFunctionsPagedParams,
  PrivilegeSearchRow,
  UpsertFunctionInput,
} from "@/types/rm-functions";
import type {
  ListViolationsParams,
  ListViolationsResult,
  Violation,
} from "@/types/rm-violations";
import type { MitigationListRow, UpsertMitigationInput } from "@/types/rm-mitigations";
import type { ExceptionListRow } from "@/types/rm-exceptions";
import type { AnalysisRunListRow } from "@/types/rm-analysis-runs";
import type {
  EntitlementSearchRow,
  SimulationApiResult,
  SimulationResult,
  SimulateUserAccessInput,
  UserAccessPayload,
  UserSearchRow,
} from "@/types/rm-simulation";
import type { ErpInstance, ExtractTemplate, UpsertErpInstanceInput } from "@/types/rm-erp";
import type { Lookup, LookupType, UpsertLookupValueInput } from "@/types/rm-lookups";
// SimulationResult / SimulationApiResult used in unwrapSimulationResult

export type { RulesetCsvRow } from "@/types/rm-dashboard";
export type {
  FunctionRow,
  RuleDetail,
  RuleFunctionBinding,
  RuleListRow,
  RulePrivilege,
  RuleUserCondition,
  UpsertRuleV2Input,
  UserAttributeCatalog,
} from "@/types/rm-rules";
export type {
  FunctionDetail,
  FunctionListRow,
  FunctionPrivilege,
  FunctionRequiredPermission,
  ListFunctionsPagedParams,
  PrivilegeSearchRow,
  UpsertFunctionInput,
} from "@/types/rm-functions";
export type { ListViolationsParams, ListViolationsResult, Violation } from "@/types/rm-violations";
export type { MitigationListRow, UpsertMitigationInput } from "@/types/rm-mitigations";
export type { ExceptionListRow } from "@/types/rm-exceptions";
export type { AnalysisRunListRow } from "@/types/rm-analysis-runs";
export type {
  EntitlementSearchRow,
  SimulationApiResult,
  SimulationResult,
  SimulateUserAccessInput,
  SimulationSummary,
  SimulationRuleDetail,
  SimulationViolationRow,
  UserAccessPayload,
  UserSearchRow,
} from "@/types/rm-simulation";
export type { ErpInstance, ExtractTemplate, UpsertErpInstanceInput } from "@/types/rm-erp";
export type { Lookup, LookupType, UpsertLookupValueInput } from "@/types/rm-lookups";

/** Third arg: `status` (e.g. `ACTIVE`), then `page`, `page_size` — `["ACTIVE",1,50]`. */
export const RM_LIST_RULESETS_QUERY =
  "SELECT public.kf_rm_list_rulesets(NULL::uuid, ?, ?, ?) AS result";

export const RM_LIST_RULESETS_DEFAULT_PAGE = 1;
export const RM_LIST_RULESETS_DEFAULT_PAGE_SIZE = 500;

export const RM_GET_DASHBOARD_V2_ALL_QUERY =
  "SELECT public.kf_rm_get_dashboard_v2(NULL::uuid, NULL::bigint) AS result";

export const RM_GET_DASHBOARD_V2_BY_RULESET_QUERY =
  "SELECT public.kf_rm_get_dashboard_v2(NULL::uuid, ?::bigint) AS result";

/** e.g. category `RULESET_STATUS`, locale `en`. */
export const RM_LIST_LOOKUP_VALUES_QUERY =
  "SELECT public.kf_rm_list_lookup_values(?, NULL::uuid, ?) AS result";

const RM_UPSERT_RULESET_QUERY = "SELECT public.kf_rm_upsert_ruleset(?::jsonb) AS result";
const RM_TRIGGER_ANALYSIS_QUERY = "SELECT public.kf_rm_trigger_analysis(?::bigint) AS result";
const RM_EXPORT_RULESET_JSON_QUERY = "SELECT public.kf_rm_export_ruleset_json(?::bigint) AS result";
const RM_EXPORT_RULESET_CSV_QUERY = "SELECT public.kf_rm_export_ruleset_csv(?::bigint) AS result";
const RM_IMPORT_RULESET_JSON_QUERY = "SELECT public.kf_rm_import_ruleset_json(?::jsonb, ?::text) AS result";
const RM_IMPORT_RULESET_CSV_QUERY = "SELECT public.kf_rm_import_ruleset_from_csv(?::jsonb) AS result";

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapLookupRow(o: Record<string, unknown>) {
  const code = asString(o.value_code ?? o.code ?? o.status ?? o.lookup_code);
  return {
    value_code: code,
    value_name: asString(o.value_name ?? o.label ?? o.name ?? o.display_name ?? code, code),
    color_hex: asString(o.color_hex ?? o.color ?? "#64748b", "#64748b"),
    label: o.label != null ? asString(o.label) : undefined,
    sort_order: o.sort_order != null ? Number(o.sort_order) : undefined,
  };
}

export type RmLookupValue = {
  value_code: string;
  /** UI label (matches sample `value_name` on select options) */
  value_name: string;
  color_hex: string;
  label?: string;
  sort_order?: number;
};

export async function getLookupByCategory(
  category: string,
  locale: string = "en"
): Promise<{ data: RmLookupValue[] }> {
  const res = await executeQuery<unknown>(RM_LIST_LOOKUP_VALUES_QUERY, [category, locale]);
  const data = getKfResultData(res);
  if (Array.isArray(data)) {
    return {
      data: data
        .map((row) => mapLookupRow(coerceRowObject(row) ?? (row as Record<string, unknown>)))
        .filter((x) => x.value_code),
    };
  }
  const rows = extractResultRows(res);
  if (rows.length) {
    return {
      data: rows
        .map((r) => mapLookupRow(coerceRowObject(r) ?? (r as Record<string, unknown>)))
        .filter((x) => x.value_code),
    };
  }
  return { data: [] };
}

/**
 * @param status ruleset status filter (e.g. `ACTIVE`); `null` or `""` → sent as `""` (some gateways reject JSON `null`)
 * @param page 1-based
 * @param pageSize e.g. 50 (dashboard) or 500 (full list page)
 */
export async function listRulesets(
  status: string | null = "ACTIVE",
  page: number = RM_LIST_RULESETS_DEFAULT_PAGE,
  pageSize: number = RM_LIST_RULESETS_DEFAULT_PAGE_SIZE
): Promise<{ data: RmRuleset[] }> {
  const st =
    status != null && String(status).trim() !== "" ? String(status).trim() : "";
  const response = await executeQuery<unknown>(RM_LIST_RULESETS_QUERY, [st, page, pageSize]);
  return { data: mapExecuteQueryToRulesets(response) };
}

export type RmRulesetForm = {
  ruleset_code: string;
  ruleset_name: string;
  description: string;
};

export async function upsertRuleset(
  form: RmRulesetForm
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_RULESET_QUERY, [JSON.stringify(form)]);
  return { data: getKfResultData(res) };
}

export async function triggerAnalysis(rulesetId: number): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_TRIGGER_ANALYSIS_QUERY, [rulesetId]);
  return { data: getKfResultData(res) };
}

const RM_LIST_ANALYSIS_RUNS_QUERY =
  "SELECT public.kf_rm_list_analysis_runs(NULL::uuid, NULL::bigint, NULL, ?, ?) AS result";

export async function listAnalysisRuns(
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AnalysisRunListRow[] }> {
  const res = await executeQuery<unknown>(RM_LIST_ANALYSIS_RUNS_QUERY, [page, pageSize]);
  return { data: asArray<AnalysisRunListRow>(getKfResultData(res)) };
}

export async function exportRulesetJson(rulesetId: number): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_EXPORT_RULESET_JSON_QUERY, [rulesetId]);
  return { data: getKfResultData(res) };
}

export async function exportRulesetCsv(rulesetId: number): Promise<{ data: RulesetCsvRow[] }> {
  const res = await executeQuery<unknown>(RM_EXPORT_RULESET_CSV_QUERY, [rulesetId]);
  const data = getKfResultData(res);
  if (Array.isArray(data)) {
    return { data: data as RulesetCsvRow[] };
  }
  if (data && typeof data === "object" && !Array.isArray(data) && "rows" in (data as object)) {
    const rows = (data as { rows: unknown }).rows;
    if (Array.isArray(rows)) return { data: rows as RulesetCsvRow[] };
  }
  return { data: [] };
}

export async function importRulesetJson(
  payload: unknown,
  mode: "UPSERT" | "REPLACE"
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_IMPORT_RULESET_JSON_QUERY, [JSON.stringify(payload), mode]);
  return { data: getKfResultData(res) };
}

export type ImportRulesetCsvInput = {
  ruleset_code: string;
  ruleset_name: string;
  rows: RulesetCsvRow[];
  mode: "UPSERT" | "REPLACE";
};

export async function importRulesetCsv(
  input: ImportRulesetCsvInput
): Promise<{ data: unknown }> {
  const body = {
    ruleset_code: input.ruleset_code,
    ruleset_name: input.ruleset_name,
    rows: input.rows,
    mode: input.mode,
  };
  const res = await executeQuery<unknown>(RM_IMPORT_RULESET_CSV_QUERY, [JSON.stringify(body)]);
  return { data: getKfResultData(res) };
}

// --- Rules (adjust SQL to your DB) ---
const RM_LIST_RULES_QUERY = "SELECT public.kf_rm_list_rules(?::bigint, ?::jsonb) AS result";
const RM_TOGGLE_RULE_STATUS_QUERY =
  "SELECT public.kf_rm_set_rule_status(?::bigint, ?::text) AS result";
const RM_GET_RULE_QUERY = "SELECT public.kf_rm_get_rule(?::bigint) AS result";
const RM_UPSERT_RULE_V2_QUERY = "SELECT public.kf_rm_upsert_rule_v2(?::jsonb) AS result";
const RM_USER_ATTR_CATALOG_QUERY = "SELECT public.kf_rm_list_user_attribute_catalog() AS result";
const RM_SEARCH_FUNCTIONS_QUERY = "SELECT public.kf_rm_search_functions(?, ?, ?) AS result";

const DEFAULT_UC_OPERATORS = [
  "EQUALS",
  "NOT_EQUALS",
  "IN",
  "NOT_IN",
  "LIKE",
  "STARTS_WITH",
  "IS_NULL",
  "IS_NOT_NULL",
] as const;

function asArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  return [];
}

export type ListRulesFilters = { search?: string; severity?: string };

export async function listRules(
  rulesetId: number,
  filters: ListRulesFilters = {}
): Promise<{ data: RuleListRow[] }> {
  const payload = JSON.stringify({
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
  });
  const res = await executeQuery<unknown>(RM_LIST_RULES_QUERY, [rulesetId, payload]);
  return { data: asArray<RuleListRow>(getKfResultData(res)) };
}

export async function toggleRuleStatus(ruleId: number, status: string): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_TOGGLE_RULE_STATUS_QUERY, [ruleId, status]);
  return { data: getKfResultData(res) };
}

export async function getRuleDetail(ruleId: number): Promise<{ data: RuleDetail | null }> {
  const res = await executeQuery<unknown>(RM_GET_RULE_QUERY, [ruleId]);
  const data = getKfResultData(res);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { data: data as RuleDetail };
  }
  return { data: null };
}

export async function upsertRuleV2(input: UpsertRuleV2Input): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_RULE_V2_QUERY, [JSON.stringify(input)]);
  return { data: getKfResultData(res) };
}

export async function listUserAttributes(): Promise<{
  data: UserAttributeCatalog[];
  operators: string[];
}> {
  const res = await executeQuery<unknown>(RM_USER_ATTR_CATALOG_QUERY, []);
  const raw = getKfResultData(res);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const attrs = o.data ?? o.attributes ?? o.items;
    const ops = o.operators;
    const opList = asArray<string>(ops);
    return {
      data: asArray<UserAttributeCatalog>(attrs),
      operators: opList.length > 0 ? opList : [...DEFAULT_UC_OPERATORS],
    };
  }
  if (Array.isArray(raw)) {
    return { data: raw as UserAttributeCatalog[], operators: [...DEFAULT_UC_OPERATORS] };
  }
  return { data: [], operators: [...DEFAULT_UC_OPERATORS] };
}

export async function searchFunctions(
  query?: string,
  privilegeKind?: string,
  limit: number = 50
): Promise<{ data: FunctionRow[] }> {
  const res = await executeQuery<unknown>(RM_SEARCH_FUNCTIONS_QUERY, [query ?? "", privilegeKind ?? "", limit]);
  return { data: asArray<FunctionRow>(getKfResultData(res)) };
}

// --- Functions (catalog) ---
const RM_LIST_FUNCTIONS_PAGED_QUERY =
  "SELECT public.kf_rm_list_functions_paged(NULL::uuid, NULL::varchar, NULL::varchar, ?::varchar, ?, ?) AS result";
const RM_GET_FUNCTION_DETAIL_QUERY = "SELECT public.kf_rm_get_function(?::bigint) AS result";
const RM_UPSERT_FUNCTION_QUERY = "SELECT public.kf_rm_upsert_function(?::jsonb) AS result";
const RM_DELETE_FUNCTION_QUERY = "SELECT public.kf_rm_delete_function(?::bigint) AS result";
const RM_SEARCH_PRIVILEGES_QUERY =
  "SELECT public.kf_rm_search_privileges(NULL::uuid, ?, NULL, ?) AS result";

const RM_LIST_VIOLATIONS_QUERY =
  "SELECT public.kf_rm_list_violations_v2(NULL::uuid, NULL::bigint, NULL::bigint, NULL::uuid, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?) AS result";

function mapListViolationsResult(
  raw: unknown,
  fallbackPage: number,
  fallbackSize: number
): ListViolationsResult {
  if (raw == null) {
    return {
      data: [],
      pagination: { total: 0, page: fallbackPage, page_size: fallbackSize },
    };
  }
  if (Array.isArray(raw)) {
    return {
      data: raw as Violation[],
      pagination: { total: raw.length, page: fallbackPage, page_size: fallbackSize },
    };
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const data = o.data ?? o.items ?? o.violations ?? o.rows;
    const arr = Array.isArray(data) ? (data as Violation[]) : [];
    const pag = o.pagination;
    if (pag && typeof pag === "object" && !Array.isArray(pag)) {
      const p = pag as Record<string, unknown>;
      return {
        data: arr,
        pagination: {
          total: Number(p.total ?? p.count ?? 0) || 0,
          page: Number(p.page ?? p.current_page ?? fallbackPage) || fallbackPage,
          page_size: Number(p.page_size ?? p.per_page ?? p.limit ?? fallbackSize) || fallbackSize,
        },
      };
    }
    return {
      data: arr,
      pagination: { total: arr.length, page: fallbackPage, page_size: fallbackSize },
    };
  }
  return {
    data: [],
    pagination: { total: 0, page: fallbackPage, page_size: fallbackSize },
  };
}

/**
 * v2 list: `status, sort_by, sort_dir, page, page_size, locale` — same order as
 * `["OPEN","severity","desc",1,25,"en"]`. Other `ListViolationsParams` fields are for UI only.
 */
export async function listViolations(filters: ListViolationsParams): Promise<ListViolationsResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 25;
  const sortBy = filters.sort_by ?? "severity";
  const sortDir = filters.sort_dir ?? "desc";
  const locale = filters.locale?.trim() || "en";
  const status =
    filters.status != null && String(filters.status).trim() !== ""
      ? String(filters.status).trim()
      : "";
  const res = await executeQuery<unknown>(RM_LIST_VIOLATIONS_QUERY, [
    status,
    sortBy,
    sortDir,
    page,
    pageSize,
    locale,
  ]);
  const raw = getKfResultData(res);
  return mapListViolationsResult(raw, page, pageSize);
}

export async function listFunctionsPaged(
  params: ListFunctionsPagedParams = {}
): Promise<{ data: FunctionListRow[] }> {
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 100;
  const status =
    params.status != null && String(params.status).trim() !== ""
      ? String(params.status).trim()
      : "";
  const res = await executeQuery<unknown>(RM_LIST_FUNCTIONS_PAGED_QUERY, [status, page, pageSize]);
  return { data: asArray<FunctionListRow>(getKfResultData(res)) };
}

export async function getFunctionDetail(
  functionId: number
): Promise<{ data: FunctionDetail | null }> {
  const res = await executeQuery<unknown>(RM_GET_FUNCTION_DETAIL_QUERY, [functionId]);
  const data = getKfResultData(res);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { data: data as FunctionDetail };
  }
  return { data: null };
}

export async function upsertFunction(input: UpsertFunctionInput): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_FUNCTION_QUERY, [JSON.stringify(input)]);
  return { data: getKfResultData(res) };
}

export async function deleteFunction(functionId: number): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_DELETE_FUNCTION_QUERY, [functionId]);
  return { data: getKfResultData(res) };
}

/** `kf_rm_search_privileges(NULL::uuid, system_type, NULL, limit)` — filter by text in the UI; search is not bound. */
export async function searchPrivileges(
  systemType: string = "GENERIC",
  limit: number = 50
): Promise<{ data: PrivilegeSearchRow[] }> {
  const res = await executeQuery<unknown>(RM_SEARCH_PRIVILEGES_QUERY, [systemType, limit]);
  return { data: asArray<PrivilegeSearchRow>(getKfResultData(res)) };
}

/**
 * @param rulesetId optional filter; omit → all rulesets (`parameters: []`)
 */
export async function getDashboard(rulesetId?: number): Promise<{ data: RmDashboardData }> {
  const response =
    rulesetId == null
      ? await executeQuery<unknown>(RM_GET_DASHBOARD_V2_ALL_QUERY, [])
      : await executeQuery<unknown>(RM_GET_DASHBOARD_V2_BY_RULESET_QUERY, [rulesetId]);
  return { data: mapExecuteQueryToDashboard(response) };
}

// --- Mitigations (controls catalog) — align SQL with `public.kf_rm_*` in your DB ---
const RM_LIST_MITIGATIONS_QUERY =
  "SELECT public.kf_rm_list_mitigations(NULL::uuid) AS result";
const RM_UPSERT_MITIGATION_QUERY =
  "SELECT public.kf_rm_upsert_mitigation(?::jsonb) AS result";

export async function listMitigations(): Promise<{ data: MitigationListRow[] }> {
  const res = await executeQuery<unknown>(RM_LIST_MITIGATIONS_QUERY, []);
  return { data: asArray<MitigationListRow>(getKfResultData(res)) };
}

export async function upsertMitigation(
  form: UpsertMitigationInput
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_MITIGATION_QUERY, [JSON.stringify(form)]);
  return { data: getKfResultData(res) };
}

// --- Exceptions — align SQL with `public.kf_rm_*` in your DB ---
const RM_LIST_EXCEPTIONS_QUERY =
  "SELECT public.kf_rm_list_exceptions(NULL::uuid, NULL, NULL::uuid, ?, ?) AS result";
const RM_APPROVE_EXCEPTION_QUERY =
  "SELECT public.kf_rm_approve_exception(?::bigint, ?::text) AS result";

export async function listExceptions(
  page: number = 1,
  pageSize: number = 100
): Promise<{ data: ExceptionListRow[] }> {
  const res = await executeQuery<unknown>(RM_LIST_EXCEPTIONS_QUERY, [page, pageSize]);
  return { data: asArray<ExceptionListRow>(getKfResultData(res)) };
}

export async function approveException(
  exceptionId: number,
  comment: string
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_APPROVE_EXCEPTION_QUERY, [exceptionId, comment]);
  return { data: getKfResultData(res) };
}

// --- Simulation (what-if) — align SQL with your `public.kf_rm_*` definitions ---
const RM_SEARCH_USERS_SIM = "SELECT public.kf_rm_search_users(?, ?) AS result";
const RM_SEARCH_ENTITLEMENTS_SIM = "SELECT public.kf_rm_search_entitlements(?, ?) AS result";
const RM_GET_USER_ACCESS_SIM = "SELECT public.kf_rm_get_user_access(?::text) AS result";
const RM_SIMULATE_USER_ACCESS = "SELECT public.kf_rm_simulate_user_access(?::jsonb) AS result";
const RM_SIMULATE_ROLE = "SELECT public.kf_rm_simulate_role(?, ?::bigint) AS result";

function unwrapSimulationResult<T>(res: unknown): SimulationApiResult & { data?: T } {
  const raw = getKfResultData(res);
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if ("success" in o) {
      return {
        success: Boolean(o.success),
        error:
          typeof o.error === "string"
            ? o.error
            : o.error != null
              ? String(o.error)
              : undefined,
        data: (o.data ?? undefined) as T | undefined,
      };
    }
  }
  return { success: true, data: raw as T };
}

export async function searchUsers(
  query: string,
  limit: number = 15
): Promise<{ data: UserSearchRow[] }> {
  const res = await executeQuery<unknown>(RM_SEARCH_USERS_SIM, [query, limit]);
  return { data: asArray<UserSearchRow>(getKfResultData(res)) };
}

export async function searchEntitlements(
  query: string,
  limit: number = 15
): Promise<{ data: EntitlementSearchRow[] }> {
  const res = await executeQuery<unknown>(RM_SEARCH_ENTITLEMENTS_SIM, [query, limit]);
  return { data: asArray<EntitlementSearchRow>(getKfResultData(res)) };
}

export async function getUserAccess(userid: string): Promise<{ data: UserAccessPayload | null }> {
  const res = await executeQuery<unknown>(RM_GET_USER_ACCESS_SIM, [userid]);
  const data = getKfResultData(res);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { data: data as UserAccessPayload };
  }
  return { data: null };
}

export async function simulateUserAccess(
  input: SimulateUserAccessInput
): Promise<SimulationApiResult & { data?: SimulationResult }> {
  const res = await executeQuery<unknown>(RM_SIMULATE_USER_ACCESS, [JSON.stringify(input)]);
  return unwrapSimulationResult<SimulationResult>(res);
}

export async function simulateRole(
  entitlementId: string,
  rulesetId: number
): Promise<SimulationApiResult & { data?: SimulationResult }> {
  const res = await executeQuery<unknown>(RM_SIMULATE_ROLE, [entitlementId, rulesetId]);
  return unwrapSimulationResult<SimulationResult>(res);
}

// --- ERP instances & extract templates — align SQL with your `public.kf_rm_*` definitions ---
const RM_LIST_ERP_INSTANCES_QUERY =
  "SELECT public.kf_rm_list_erp_instances(NULL::uuid) AS result";
const RM_UPSERT_ERP_INSTANCE_QUERY =
  "SELECT public.kf_rm_upsert_erp_instance(?::jsonb) AS result";
const RM_LIST_EXTRACT_TEMPLATES_QUERY =
  "SELECT public.kf_rm_list_extract_templates(?, NULL::uuid) AS result";

export async function listErpInstances(): Promise<{ data: ErpInstance[] }> {
  const res = await executeQuery<unknown>(RM_LIST_ERP_INSTANCES_QUERY, []);
  return { data: asArray<ErpInstance>(getKfResultData(res)) };
}

export async function upsertErpInstance(
  form: UpsertErpInstanceInput
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_ERP_INSTANCE_QUERY, [JSON.stringify(form)]);
  return { data: getKfResultData(res) };
}

export async function listExtractTemplates(
  systemType: string
): Promise<{ data: ExtractTemplate[] }> {
  const res = await executeQuery<unknown>(RM_LIST_EXTRACT_TEMPLATES_QUERY, [systemType]);
  return { data: asArray<ExtractTemplate>(getKfResultData(res)) };
}

// --- Lookup type list & value admin — align `public.kf_rm_*` with your DB if names differ
const RM_LIST_LOOKUP_TYPES_QUERY =
  "SELECT public.kf_rm_list_lookup_types(NULL::uuid) AS result";
const RM_UPSERT_LOOKUP_VALUE_QUERY =
  "SELECT public.kf_rm_upsert_lookup_value(?::jsonb) AS result";
const RM_DELETE_LOOKUP_VALUE_QUERY =
  "SELECT public.kf_rm_delete_lookup_value(?::bigint) AS result";

function mapLookupTypeRow(o: Record<string, unknown>): LookupType {
  return {
    type_code: asString(o.type_code ?? o.category ?? o.code),
    type_name: asString(o.type_name ?? o.name ?? o.type_code),
    description:
      o.description != null && String(o.description) !== "" ? asString(o.description) : null,
    value_count: o.value_count != null ? Number(o.value_count) : undefined,
    is_system: Boolean(o.is_system),
    allow_user_add: o.allow_user_add === undefined ? true : Boolean(o.allow_user_add),
    allow_user_edit: o.allow_user_edit === undefined ? true : Boolean(o.allow_user_edit),
  };
}

function mapLookupAdminRow(o: Record<string, unknown>): Lookup {
  const id = o.lookup_value_id ?? o.lookupvalue_id ?? o.id;
  return {
    lookup_value_id: id != null && id !== "" ? Number(id) : 0,
    value_code: asString(o.value_code ?? o.code ?? o.lookup_code),
    value_name: asString(
      o.value_name ?? o.label ?? o.name ?? o.display_name ?? o.value_code ?? o.code
    ),
    description:
      o.description != null && String(o.description) !== "" ? asString(o.description) : null,
    sort_order: o.sort_order != null ? Number(o.sort_order) : undefined,
    numeric_meta:
      o.numeric_meta != null
        ? Number(o.numeric_meta)
        : o.weight != null
          ? Number(o.weight)
          : null,
    color_hex: o.color_hex != null && String(o.color_hex) !== "" ? asString(o.color_hex) : null,
    icon: o.icon != null && String(o.icon) !== "" ? asString(o.icon) : null,
    is_default: Boolean(o.is_default),
    is_system: Boolean(o.is_system),
  };
}

function mapListFromQuery<T>(
  res: unknown,
  mapRow: (o: Record<string, unknown>) => T,
  keep: (row: T) => boolean
): T[] {
  const data = getKfResultData(res);
  if (Array.isArray(data)) {
    return data
      .map((row) => mapRow(coerceRowObject(row) ?? (row as Record<string, unknown>)))
      .filter(keep);
  }
  const rows = extractResultRows(res);
  if (rows.length) {
    return rows
      .map((r) => mapRow(coerceRowObject(r) ?? (r as Record<string, unknown>)))
      .filter(keep);
  }
  return [];
}

export async function listLookupTypes(): Promise<{ data: LookupType[] }> {
  const res = await executeQuery<unknown>(RM_LIST_LOOKUP_TYPES_QUERY, []);
  return { data: mapListFromQuery(res, mapLookupTypeRow, (r) => Boolean(r.type_code)) };
}

/**
 * All values for a lookup category / type (admin columns).
 * Same RPC as `getLookupByCategory` but with full row mapping.
 */
export async function listLookupValues(
  typeCode: string,
  locale: string = "en"
): Promise<{ data: Lookup[] }> {
  const res = await executeQuery<unknown>(RM_LIST_LOOKUP_VALUES_QUERY, [typeCode, locale]);
  return {
    data: mapListFromQuery(res, mapLookupAdminRow, (r) => Boolean(r.value_code)),
  };
}

export async function upsertLookupValue(
  form: UpsertLookupValueInput
): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_UPSERT_LOOKUP_VALUE_QUERY, [JSON.stringify(form)]);
  return { data: getKfResultData(res) };
}

export async function deleteLookupValue(id: number): Promise<{ data: unknown }> {
  const res = await executeQuery<unknown>(RM_DELETE_LOOKUP_VALUE_QUERY, [id]);
  return { data: getKfResultData(res) };
}
