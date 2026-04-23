"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Controller, useForm, type Control, type FieldValues, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import Select, { type MultiValue, type StylesConfig } from "react-select";
import ExpressionBuilder from "@/components/ExpressionBuilder";
import { MOCK_ROTATION_POLICIES } from "@/components/non-human-identity/rotation-policy-mock";

const CREDENTIAL_TYPE_OPTIONS = [
  { label: "Passwords", value: "passwords" },
  { label: "Keys", value: "keys" },
  { label: "Tokens", value: "tokens" },
  { label: "Certs", value: "certs" },
];

const NHI_TYPE_OPTIONS = [
  { label: "API Key", value: "api_key" },
  { label: "Service Account", value: "service_account" },
  { label: "Certificate", value: "certificate" },
  { label: "Workload/Container", value: "workload" },
  { label: "AI Agent", value: "ai_agent" },
  { label: "Custom", value: "custom" },
];

const EVENT_TRIGGER_OPTIONS = [
  { label: "Post-deployment via CI/CD hook", value: "post_deploy_cicd" },
  { label: "After 10 uses", value: "after_10_uses" },
  { label: "On anomaly detection", value: "anomaly" },
  { label: "5 days before expiry", value: "before_expiry_5d" },
];

const FAILURE_ALERT_OPTIONS = [
  { label: "Email", value: "email" },
  { label: "Teams Notification", value: "teams" },
  { label: "ITSM ticket", value: "itsm" },
];

const DURATION_UNITS = [
  { label: "Days", value: "days" },
  { label: "Months", value: "months" },
  { label: "Years", value: "years" },
];

const ROTATION_METHOD_OPTIONS = [
  { value: "auto" as const, label: "Automatic (vault/secret manager)" },
  { value: "jit" as const, label: "JIT/Dynamic (short TTL)" },
  { value: "semi" as const, label: "Semi-auto (owner approval)" },
  { value: "manual" as const, label: "Manual (audit trail)" },
];

const SCOPE_EXPRESSION_ATTRIBUTES = [
  { label: "Tags", value: "tags" },
  { label: "Environment", value: "environment" },
  { label: "Cloud provider", value: "cloud_provider" },
  { label: "Owner", value: "owner" },
  { label: "Risk score", value: "risk_score" },
];

/** Ensures menus render after hydration so `document.body` exists (avoids SSR/client mismatch). */
function useSelectMenuPortalTarget(): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.body);
  }, []);
  return el;
}

const rotationSelectStyles: StylesConfig<{ label: string; value: string }, boolean> = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base) => ({
    ...base,
    minHeight: "38px",
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    color: "#111827",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  menu: (base) => ({
    ...base,
    zIndex: 10000,
    backgroundColor: "#ffffff",
  }),
  menuList: (base) => ({ ...base, backgroundColor: "#ffffff" }),
  option: (base, state) => ({
    ...base,
    color: "#111827",
    backgroundColor: state.isSelected ? "#dbeafe" : state.isFocused ? "#f3f4f6" : "#ffffff",
  }),
  singleValue: (base) => ({ ...base, color: "#111827" }),
  multiValue: (base) => ({ ...base, backgroundColor: "#e5e7eb" }),
  multiValueLabel: (base) => ({ ...base, color: "#111827" }),
  input: (base) => ({ ...base, color: "#111827" }),
  placeholder: (base) => ({ ...base, color: "#6b7280" }),
};

type RotationPolicyFormValues = FieldValues & {
  name: string;
  description: string;
  owner: string;
  credentialTypes: MultiValue<{ label: string; value: string }>;
  priority: string;
  nhiTypes: MultiValue<{ label: string; value: string }>;
  scopeExceptions: string;
  showAdvancedScope: boolean;
  advancedConditions: unknown[];
  frequencyValue: string;
  frequencyUnit: string;
  eventTriggeredEnabled: boolean;
  eventTriggeredOption: { label: string; value: string } | null;
  maxAgeEnabled: boolean;
  maxAgeValue: string;
  maxAgeUnit: string;
  rotationMethod: "auto" | "jit" | "semi" | "manual";
  rotationWindowEnabled: boolean;
  windowStart: string;
  windowEnd: string;
  blackoutStart: string;
  blackoutEnd: string;
  retryEnabled: boolean;
  retryMax: string;
  preRotationDays: string;
  failureAlerts: MultiValue<{ label: string; value: string }>;
  recipientOwner: boolean;
  recipientIamAdmin: boolean;
};

function ExpandableSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80"
      >
        <span className="text-base font-semibold text-gray-900">{title}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && <div className="space-y-4 border-t border-gray-100 px-4 py-4">{children}</div>}
    </section>
  );
}

function ToggleRow({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50/60 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description ? <p className="text-xs text-gray-500">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-1"
          } mt-0.5`}
        />
      </button>
    </div>
  );
}

export function RotationPolicyEditorPage({ policyId }: { policyId?: string }) {
  const menuPortalTarget = useSelectMenuPortalTarget();
  const router = useRouter();
  const existing = useMemo(
    () => (policyId ? MOCK_ROTATION_POLICIES.find((p) => p.id === policyId) : undefined),
    [policyId],
  );

  const defaultValues = useMemo(
    () =>
      ({
        name: existing?.name ?? "",
        description: existing?.description ?? "",
        owner: "",
        credentialTypes: [CREDENTIAL_TYPE_OPTIONS[1], CREDENTIAL_TYPE_OPTIONS[2]],
        priority: "100",
        nhiTypes: existing
          ? existing.nhiTypes
              .map((t) => NHI_TYPE_OPTIONS.find((o) => o.label === t) ?? { label: t, value: t.toLowerCase().replace(/\s+/g, "_") })
              .filter(Boolean)
          : [NHI_TYPE_OPTIONS[1]],
        scopeExceptions: "",
        showAdvancedScope: false,
        advancedConditions: [],
        frequencyValue: "90",
        frequencyUnit: "days",
        eventTriggeredEnabled: false,
        eventTriggeredOption: null,
        maxAgeEnabled: true,
        maxAgeValue: "365",
        maxAgeUnit: "days",
        rotationMethod: "auto",
        rotationWindowEnabled: false,
        windowStart: "09:00",
        windowEnd: "17:00",
        blackoutStart: "",
        blackoutEnd: "",
        retryEnabled: true,
        retryMax: "3",
        preRotationDays: "7",
        failureAlerts: [FAILURE_ALERT_OPTIONS[0]],
        recipientOwner: true,
        recipientIamAdmin: true,
      }) as RotationPolicyFormValues,
    [existing],
  );

  const { control, register, handleSubmit, watch, setValue } = useForm<RotationPolicyFormValues>({
    defaultValues,
  });

  const showAdvanced = watch("showAdvancedScope");
  const eventOn = watch("eventTriggeredEnabled");
  const maxAgeOn = watch("maxAgeEnabled");
  const windowOn = watch("rotationWindowEnabled");
  const retryOn = watch("retryEnabled");

  const onSaveDraft = handleSubmit((data) => {
    console.info("Save as draft", data);
    router.push("/non-human-identity/rotation-policy");
  });

  const onPublish = handleSubmit((data) => {
    console.info("Publish & enforce", data);
    router.push("/non-human-identity/rotation-policy");
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {policyId ? "Edit policy" : "Build new policy"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure scope, rotation mechanics, execution windows, and notifications. Changes are saved locally until
              an API is connected.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ExpandableSection title="1. General" defaultOpen>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Unique policy name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Owner</label>
                <input
                  {...register("owner")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Team or individual accountable for this policy"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Rich text: explain intent, exceptions, and links to runbooks."
                />
                <p className="text-xs text-gray-500">
                  Use paragraphs and bullets as needed; full rich-text editing can be wired later.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Credential types supported</label>
                <Controller
                  name="credentialTypes"
                  control={control}
                  render={({ field }) => (
                    <Select<{ label: string; value: string }, true>
                      {...field}
                      isMulti
                      options={CREDENTIAL_TYPE_OPTIONS}
                      styles={rotationSelectStyles}
                      menuPortalTarget={menuPortalTarget ?? undefined}
                      menuPosition="fixed"
                      placeholder="Select one or more"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Priority (overlapping policies)</label>
                <input
                  {...register("priority")}
                  type="number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-xs text-gray-500">Higher number wins when multiple policies match.</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Scope — NHI types</span>
                <Controller
                  name="nhiTypes"
                  control={control}
                  render={({ field }) => (
                    <Select<{ label: string; value: string }, true>
                      {...field}
                      isMulti
                      options={NHI_TYPE_OPTIONS}
                      styles={rotationSelectStyles}
                      menuPortalTarget={menuPortalTarget ?? undefined}
                      menuPosition="fixed"
                      placeholder="Select NHI types"
                    />
                  )}
                />
                <div className="space-y-2 pt-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="scope-exceptions">
                    Exceptions
                  </label>
                  <input
                    id="scope-exceptions"
                    {...register("scopeExceptions")}
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="e.g., exempt specific high-availability NHIs"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="min-w-0 pt-3 lg:pt-4">
                <Controller
                  name="showAdvancedScope"
                  control={control}
                  render={({ field }) => (
                    <ToggleRow
                      label="Advanced condition builder"
                      description="Tags, environment, cloud, owner, risk."
                      enabled={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            {showAdvanced && (
              <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Advanced conditions</p>
                <ExpressionBuilder
                  title=""
                  control={control as unknown as Control<FieldValues>}
                  setValue={setValue as unknown as UseFormSetValue<FieldValues>}
                  watch={watch as unknown as UseFormWatch<FieldValues>}
                  fieldName="advancedConditions"
                  attributesOptions={SCOPE_EXPRESSION_ATTRIBUTES}
                  hideJsonPreview
                  fullWidth
                />
              </div>
            )}
          </ExpandableSection>

          <ExpandableSection title="2. Rotation rules" defaultOpen>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Frequency — value</label>
                  <input
                    {...register("frequencyValue")}
                    type="number"
                    min={1}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Frequency — unit</label>
                  <select
                    {...register("frequencyUnit")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {DURATION_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-w-0">
                <Controller
                  name="eventTriggeredEnabled"
                  control={control}
                  render={({ field }) => (
                    <ToggleRow
                      label="Event-triggered rotation"
                      description="Also rotate on runtime events."
                      enabled={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              {eventOn && (
                <div className="max-w-xl space-y-2">
                  <label className="text-sm font-medium text-gray-700">Event trigger</label>
                  <Controller
                    name="eventTriggeredOption"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={EVENT_TRIGGER_OPTIONS}
                        styles={rotationSelectStyles}
                        menuPortalTarget={menuPortalTarget ?? undefined}
                        menuPosition="fixed"
                        placeholder="Select trigger"
                      />
                    )}
                  />
                </div>
              )}

              <div className="min-w-0">
                <Controller
                  name="maxAgeEnabled"
                  control={control}
                  render={({ field }) => (
                    <ToggleRow
                      label="Max credential age"
                      description="Cap lifetime before forced rotation."
                      enabled={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              {maxAgeOn && (
                <div className="grid max-w-xl grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Max age — value</label>
                    <input
                      {...register("maxAgeValue")}
                      type="number"
                      min={1}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Max age — unit</label>
                    <select
                      {...register("maxAgeUnit")}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {DURATION_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Rotation method</span>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Rotation method">
                  {ROTATION_METHOD_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:ring-1 has-[:checked]:ring-blue-500/30"
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("rotationMethod")}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="3. Execution settings" defaultOpen>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <Controller
                  name="rotationWindowEnabled"
                  control={control}
                  render={({ field }) => (
                    <ToggleRow
                      label="Rotation window"
                      description="Limit rotations to a daily time range."
                      enabled={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {windowOn && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Window start</label>
                      <input
                        {...register("windowStart")}
                        type="time"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Window end</label>
                      <input
                        {...register("windowEnd")}
                        type="time"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3 lg:border-l lg:border-gray-100 lg:pl-4">
                <span className="text-sm font-medium text-gray-700">Blackout period</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">Start</label>
                    <input
                      {...register("blackoutStart")}
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">End</label>
                    <input
                      {...register("blackoutEnd")}
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                <Controller
                  name="retryEnabled"
                  control={control}
                  render={({ field }) => (
                    <ToggleRow
                      label="Retry logic"
                      description="Retry failed rotations."
                      enabled={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {retryOn ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Max attempts</label>
                    <input
                      {...register("retryMax")}
                      type="number"
                      min={1}
                      className="w-full max-w-[12rem] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="4. Notifications & monitoring" defaultOpen>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pre-rotation reminders (days before)</label>
                <input
                  {...register("preRotationDays")}
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Failure alerts</label>
                <Controller
                  name="failureAlerts"
                  control={control}
                  render={({ field }) => (
                    <Select<{ label: string; value: string }, true>
                      {...field}
                      isMulti
                      options={FAILURE_ALERT_OPTIONS}
                      styles={rotationSelectStyles}
                      menuPortalTarget={menuPortalTarget ?? undefined}
                      menuPosition="fixed"
                      placeholder="Select channels"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Recipients</span>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" {...register("recipientOwner")} className="h-4 w-4 rounded border-gray-300" />
                    Owner
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      {...register("recipientIamAdmin")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    IAM Admin
                  </label>
                </div>
              </div>
            </div>
          </ExpandableSection>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm">
        <div className="flex w-full flex-wrap items-center justify-end gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href="/non-human-identity/rotation-policy"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSaveDraft}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Publish &amp; enforce
          </button>
        </div>
      </div>
    </div>
  );
}
