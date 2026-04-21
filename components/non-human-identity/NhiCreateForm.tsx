"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { executeQuery } from "@/lib/api";
import { extractResultRows } from "@/lib/nhi-dashboard";

const TENANT_ID = "a0000000-0000-0000-0000-000000000001";
const RISKS = ["low", "medium", "high", "critical"];
const NHI_TYPES_FOR_LCM = [
  "service_account",
  "agent",
  "managed_identity",
  "oauth_client",
  "bot",
  "scheduled_job",
];

type Row = Record<string, unknown>;

async function runRows(query: string, parameters: unknown[] = []): Promise<Row[]> {
  const resp = await executeQuery<unknown>(query, parameters);
  return extractResultRows(resp);
}

async function runScalar(query: string, parameters: unknown[] = []): Promise<unknown> {
  const rows = await runRows(query, parameters);
  const first = rows[0];
  if (!first) return null;
  const firstKey = Object.keys(first)[0];
  return firstKey ? first[firstKey] : null;
}

function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function FormLabeledInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      />
    </div>
  );
}

function FormLabeledSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  renderOption?: (v: string) => string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      >
        {options.map((o) => (
          <option key={o || "__empty"} value={o}>
            {renderOption ? renderOption(o) : o || "—"}
          </option>
        ))}
      </select>
    </div>
  );
}

export type NhiCreateFormProps = {
  /** When provided, skips loading users inside the form. */
  users?: Row[];
  onSuccess: (nhiId: string | null) => void | Promise<void>;
  onCancel?: () => void;
  /** Inline: optional small heading. Page: main H1 (defaults to “Create new NHI”). */
  title?: string;
  /** Wrap in a white card with padding (full page). */
  variant?: "inline" | "page";
};

export function NhiCreateForm({
  users: usersProp,
  onSuccess,
  onCancel,
  title,
  variant = "inline",
}: NhiCreateFormProps) {
  const [users, setUsers] = useState<Row[]>(usersProp ?? []);
  const [usersLoading, setUsersLoading] = useState(!usersProp?.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    displayname: "",
    description: "",
    nhi_type: "service_account",
    risk_level: "medium",
    ownerid: "",
    tags: "",
    customattributes: "{}",
    create_agent: false,
    agent_vendor: "anthropic",
    agent_model: "claude-sonnet-4.5",
    requires_human_loop: true,
  });

  const loadUsers = useCallback(async () => {
    const rows = await runRows(
      `SELECT userid, COALESCE(firstname || ' ' || lastname, username) AS fullname, username
         FROM public.usr
        ORDER BY fullname
        LIMIT 500`,
      []
    );
    setUsers(rows);
  }, []);

  useEffect(() => {
    if (usersProp && usersProp.length > 0) {
      setUsers(usersProp);
      setUsersLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        await loadUsers();
      } catch {
        if (!cancelled) setError("Failed to load users");
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usersProp, loadUsers]);

  const submit = async () => {
    if (!form.name.trim()) {
      setError("name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      JSON.parse(form.customattributes || "{}");
      const tags = form.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const r = await runScalar(
        `SELECT public.kf_nhi_create_service_account(
           ?::uuid, ?, ?, ?, ?,
           ?::uuid, NULL, NULL, NULL,
           ?, FALSE, ?::text[], ?::jsonb, NULL,
           ?::boolean, ?, ?, ?::boolean, '{}'::jsonb, 'ui'
         ) AS r`,
        [
          TENANT_ID,
          form.name.trim(),
          form.nhi_type,
          form.displayname.trim() || null,
          form.description.trim() || null,
          form.ownerid || null,
          form.risk_level,
          `{${tags.join(",")}}`,
          form.customattributes || "{}",
          form.create_agent,
          form.create_agent ? form.agent_vendor : null,
          form.create_agent ? form.agent_model : null,
          form.requires_human_loop,
        ]
      );
      const newId =
        typeof r === "object" && r && "nhi_id" in (r as Record<string, unknown>)
          ? asText((r as Record<string, unknown>).nhi_id)
          : null;
      await onSuccess(newId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const formBody = (
    <>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {usersLoading && <p className="mb-3 text-sm text-slate-500">Loading users…</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <FormLabeledSelect
          label="Type"
          value={form.nhi_type}
          onChange={(v) => setForm((p) => ({ ...p, nhi_type: v }))}
          options={NHI_TYPES_FOR_LCM}
          disabled={busy}
        />
        <FormLabeledSelect
          label="Risk level"
          value={form.risk_level}
          onChange={(v) => setForm((p) => ({ ...p, risk_level: v }))}
          options={RISKS}
          disabled={busy}
        />
        <FormLabeledInput label="Name *" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} disabled={busy} />
        <FormLabeledInput
          label="Display name"
          value={form.displayname}
          onChange={(v) => setForm((p) => ({ ...p, displayname: v }))}
          disabled={busy}
        />
        <div className="md:col-span-2">
          <FormLabeledInput
            label="Description"
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            disabled={busy}
          />
        </div>
        <FormLabeledSelect
          label="Owner"
          value={form.ownerid}
          onChange={(v) => setForm((p) => ({ ...p, ownerid: v }))}
          options={["", ...users.map((u) => asText(u.userid))]}
          renderOption={(v) => (v ? asText(users.find((u) => asText(u.userid) === v)?.fullname) || v : "—")}
          disabled={busy || usersLoading}
        />
        <FormLabeledInput label="Tags (comma)" value={form.tags} onChange={(v) => setForm((p) => ({ ...p, tags: v }))} disabled={busy} />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Custom attributes (JSON)</label>
          <textarea
            className="h-28 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
            value={form.customattributes}
            onChange={(e) => setForm((p) => ({ ...p, customattributes: e.target.value }))}
            disabled={busy}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.create_agent}
              onChange={(e) => setForm((p) => ({ ...p, create_agent: e.target.checked }))}
              disabled={busy}
            />{" "}
            Also create agent profile
          </label>
        </div>
        {form.create_agent && (
          <>
            <FormLabeledSelect
              label="Vendor"
              value={form.agent_vendor}
              onChange={(v) => setForm((p) => ({ ...p, agent_vendor: v }))}
              options={["anthropic", "openai", "google", "meta", "mistral", "cohere", "internal"]}
              disabled={busy}
            />
            <FormLabeledInput
              label="Model"
              value={form.agent_model}
              onChange={(v) => setForm((p) => ({ ...p, agent_model: v }))}
              disabled={busy}
            />
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.requires_human_loop}
                  onChange={(e) => setForm((p) => ({ ...p, requires_human_loop: e.target.checked }))}
                  disabled={busy}
                />{" "}
                Requires human loop (HITL)
              </label>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onCancel && (
          <button
            type="button"
            className="min-w-[7rem] rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="min-w-[7rem] rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          onClick={submit}
          disabled={busy || usersLoading}
        >
          Create
        </button>
      </div>
    </>
  );

  const pageHeading = title ?? "Create new NHI";

  if (variant === "page") {
    return (
      <div className="w-full max-w-none rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-900">{pageHeading}</h1>
        <p className="mb-6 text-sm text-slate-600">Same fields as Service Accounts create. Required fields marked with *.</p>
        {formBody}
      </div>
    );
  }

  return (
    <>
      {title ? (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
      ) : null}
      {formBody}
    </>
  );
}

/** Full page wrapper with padding and back link to Service Accounts. */
export function NhiCreatePageClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (phase === "done") {
    return (
      <div className="w-full max-w-none rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">NHI created successfully.</p>
        {createdId ? (
          <p className="mt-2 font-mono text-sm text-green-800">{createdId}</p>
        ) : (
          <p className="mt-2 text-sm text-green-800">The server did not return a new id in the response.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {createdId ? (
            <Link
              href={`/non-human-identity/nhi-inventory/${encodeURIComponent(createdId)}`}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            >
              View in inventory
            </Link>
          ) : null}
          <Link
            href="/non-human-identity-1/service-accounts"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            Open Service Accounts
          </Link>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
            onClick={() => {
              setPhase("form");
              setCreatedId(null);
            }}
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <NhiCreateForm
      variant="page"
      title="Create new NHI"
      onSuccess={(id) => {
        setCreatedId(id);
        setPhase("done");
      }}
      onCancel={() => router.push("/non-human-identity-1/service-accounts")}
    />
  );
}
