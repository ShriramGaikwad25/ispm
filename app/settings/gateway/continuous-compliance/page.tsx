"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getAllApplications } from "@/lib/api";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 shrink-0 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function LineItem({
  label,
  checked,
  onToggle,
  expiryDays,
  onExpiryChange,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  expiryDays: string;
  onExpiryChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2 border-b border-gray-200 last:border-0">
      <span className="text-sm text-gray-700 min-w-0">{label}</span>
      {checked ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={expiryDays}
            onChange={(e) => onExpiryChange(e.target.value)}
            className="w-16 shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">days</span>
        </div>
      ) : (
        <span className="w-24 text-xs text-gray-400">—</span>
      )}
      <div className="flex justify-end">
        <Toggle checked={checked} onChange={onToggle} label="" />
      </div>
    </div>
  );
}

export default function ContinuousComplianceSettingsPage() {
  const [expandedCards, setExpandedCards] = useState<boolean[]>([false, false, false]);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);

  // Load real applications from API (shared with App Inventory)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getAllApplications();
        const rawList =
          (Array.isArray(data) ? data : data?.Applications || data?.applications || data?.apps || data?.data || data?.items) || [];
        if (!mounted) return;
        const mapped = rawList
          .map((app: any, index: number) => {
            const id =
              app.ApplicationID ??
              app.applicationID ??
              app.ApplicationId ??
              app.applicationId ??
              app.id ??
              app.Id ??
              app.appId ??
              app.appid ??
              app.application_id ??
              String(index);
            const name =
              app.ApplicationName ??
              app.applicationName ??
              app.name ??
              app.appName ??
              app.AppName ??
              `Application ${index + 1}`;
            return { id: String(id), name: String(name) };
          })
          .filter((x: any) => x.id && x.name);
        setApps(mapped);
      } catch (e) {
        // Fail silently here; SoD will just show no apps if API fails
        setApps([]);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // User Lifecycle (each line: toggle + expiry duration)
  const [lifecycleRole, setLifecycleRole] = useState(false);
  const [lifecycleRoleExpiry, setLifecycleRoleExpiry] = useState("60");
  const [lifecycleJobTitle, setLifecycleJobTitle] = useState(false);
  const [lifecycleJobTitleExpiry, setLifecycleJobTitleExpiry] = useState("60");
  const [lifecycleDepartment, setLifecycleDepartment] = useState(false);
  const [lifecycleDepartmentExpiry, setLifecycleDepartmentExpiry] = useState("60");
  const [lifecycleManager, setLifecycleManager] = useState(false);
  const [lifecycleManagerExpiry, setLifecycleManagerExpiry] = useState("60");
  const [lifecycleCustomAttrs, setLifecycleCustomAttrs] = useState(false);
  const [lifecycleCustomAttrsExpiry, setLifecycleCustomAttrsExpiry] = useState("60");

  // Application Governance
  const [govNDE, setGovNDE] = useState(false);
  const [govPrivilegedAccess, setGovPrivilegedAccess] = useState(false);
  const [govAccountCreation, setGovAccountCreation] = useState(false);
  const [govInactiveAccounts, setGovInactiveAccounts] = useState(false);
  const [govInactiveAccountsExpiry1, setGovInactiveAccountsExpiry1] = useState("60");
  const [govInactiveAccountsExpiry2, setGovInactiveAccountsExpiry2] = useState("90");
  const [govConditionalExpiry, setGovConditionalExpiry] = useState(false);
  const [govConditionalExpiryDuration1, setGovConditionalExpiryDuration1] = useState("5");
  const [govConditionalExpiryDuration2, setGovConditionalExpiryDuration2] = useState("10");

  // SoD - Conflict detection
  const [sodInactiveAccount, setSodInactiveAccount] = useState(false);
  const [sodInactiveDays, setSodInactiveDays] = useState("90");
  const [sodConflictAppsMode, setSodConflictAppsMode] = useState<"all" | "selected">("all");
  const [sodConflictSelectedApps, setSodConflictSelectedApps] = useState<string[]>([]);

  // SoD - Conditional Access Expiry
  const [sodCondAccessExpiry, setSodCondAccessExpiry] = useState(false);
  const [sodCondAccessDaysBefore, setSodCondAccessDaysBefore] = useState("7");
  const [sodCondAppsMode, setSodCondAppsMode] = useState<"all" | "selected">("all");
  const [sodCondSelectedApps, setSodCondSelectedApps] = useState<string[]>([]);

  const cards = [
    { title: "User Lifecycle", key: "user-lifecycle" },
    { title: "Application Governance", key: "application-governance" },
    { title: "SoD", key: "sod" },
  ];

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  return (
    <div className="h-full p-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Continuous Compliance Settings</h1>
        <div className="space-y-4">
          {cards.map((card, idx) => (
            <div
              key={card.key}
              className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-4 bg-white font-semibold text-sm hover:bg-gray-50 transition-colors group"
                onClick={() => toggleCard(idx)}
                aria-expanded={expandedCards[idx] ? "true" : "false"}
              >
                <span className="flex-1 text-left mr-3 text-gray-900">{card.title}</span>
                <div className="flex-shrink-0">
                  {expandedCards[idx] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </button>

              {expandedCards[idx] && (
                <div className="p-4 text-sm space-y-6 bg-gray-50 border-t border-gray-100">
                  {/* User Lifecycle */}
                  {card.key === "user-lifecycle" && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-2">User Lifecycle Change Options</h4>
                      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600 border-b border-gray-200">
                          <span>Option</span>
                          <span>Expiry Duration</span>
                          <span>Enable / Disable</span>
                        </div>
                        <div className="divide-y divide-gray-200">
                          <LineItem label="Role" checked={lifecycleRole} onToggle={setLifecycleRole} expiryDays={lifecycleRoleExpiry} onExpiryChange={setLifecycleRoleExpiry} />
                          <LineItem label="Job Title" checked={lifecycleJobTitle} onToggle={setLifecycleJobTitle} expiryDays={lifecycleJobTitleExpiry} onExpiryChange={setLifecycleJobTitleExpiry} />
                          <LineItem label="Department" checked={lifecycleDepartment} onToggle={setLifecycleDepartment} expiryDays={lifecycleDepartmentExpiry} onExpiryChange={setLifecycleDepartmentExpiry} />
                          <LineItem label="Manager" checked={lifecycleManager} onToggle={setLifecycleManager} expiryDays={lifecycleManagerExpiry} onExpiryChange={setLifecycleManagerExpiry} />
                          <LineItem label="Custom User Attributes" checked={lifecycleCustomAttrs} onToggle={setLifecycleCustomAttrs} expiryDays={lifecycleCustomAttrsExpiry} onExpiryChange={setLifecycleCustomAttrsExpiry} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Application Governance */}
                  {card.key === "application-governance" && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Application Governance Options</h4>
                      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          <div className="grid grid-cols-[1fr_auto] items-center px-4 py-2">
                            <span className="text-sm text-gray-700">NDE</span>
                            <Toggle checked={govNDE} onChange={setGovNDE} label="" />
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center px-4 py-2">
                            <span className="text-sm text-gray-700">Privileged Access</span>
                            <Toggle checked={govPrivilegedAccess} onChange={setGovPrivilegedAccess} label="" />
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center px-4 py-2">
                            <span className="text-sm text-gray-700">Account Creation</span>
                            <Toggle checked={govAccountCreation} onChange={setGovAccountCreation} label="" />
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2">
                            <span className="text-sm text-gray-700">Inactive accounts</span>
                            {govInactiveAccounts ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={govInactiveAccountsExpiry1}
                                    onChange={(e) => setGovInactiveAccountsExpiry1(e.target.value)}
                                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={govInactiveAccountsExpiry2}
                                    onChange={(e) => setGovInactiveAccountsExpiry2(e.target.value)}
                                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="w-24 text-xs text-gray-400">—</span>
                                <span className="w-24 text-xs text-gray-400">—</span>
                              </>
                            )}
                            <Toggle checked={govInactiveAccounts} onChange={setGovInactiveAccounts} label="" />
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2">
                            <span className="text-sm text-gray-700">Conditional access expiry</span>
                            {govConditionalExpiry ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={govConditionalExpiryDuration1}
                                    onChange={(e) => setGovConditionalExpiryDuration1(e.target.value)}
                                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={govConditionalExpiryDuration2}
                                    onChange={(e) => setGovConditionalExpiryDuration2(e.target.value)}
                                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="w-24 text-xs text-gray-400">—</span>
                                <span className="w-24 text-xs text-gray-400">—</span>
                              </>
                            )}
                            <Toggle checked={govConditionalExpiry} onChange={setGovConditionalExpiry} label="" />
                          </div>
                        </div> 
                      </div>
                    </div>
                  )}

                  {/* SoD */}
                  {card.key === "sod" && (
                    <>
                      {/* SoD Conflict detection */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-3">
                        <div className="grid grid-cols-[1.2fr_2.2fr_auto] items-center gap-4">
                          <span className="text-sm font-medium text-gray-800">SoD Conflict detection</span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-600">Inactive account</span>
                              {sodInactiveAccount ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={sodInactiveDays}
                                    onChange={(e) => setSodInactiveDays(e.target.value)}
                                    className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Duration</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs text-gray-600">Applications:</span>
                              <label className="flex items-center gap-1 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name="sod-conflict-apps"
                                  checked={sodConflictAppsMode === "all"}
                                  onChange={() => setSodConflictAppsMode("all")}
                                  className="text-blue-600"
                                />
                                <span>All</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name="sod-conflict-apps"
                                  checked={sodConflictAppsMode === "selected"}
                                  onChange={() => setSodConflictAppsMode("selected")}
                                  className="text-blue-600"
                                />
                                <span>Select Apps</span>
                              </label>
                              {sodConflictAppsMode === "selected" && apps.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {apps.map((app) => (
                                    <label key={app.id} className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={sodConflictSelectedApps.includes(app.id)}
                                        onChange={() =>
                                          toggleAppSelection(app.id, sodConflictSelectedApps, setSodConflictSelectedApps)
                                        }
                                        className="rounded border-gray-300 text-blue-600"
                                      />
                                      <span>{app.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Toggle
                              label="Enable SoD conflict detection"
                              checked={sodInactiveAccount}
                              onChange={setSodInactiveAccount}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Conditional Access Expiry */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="grid grid-cols-[1.2fr_2.2fr_auto] items-center gap-4">
                          <span className="text-sm font-medium text-gray-800">Conditional Access Expiry</span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-600">Expiry window</span>
                              {sodCondAccessExpiry ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    value={sodCondAccessDaysBefore}
                                    onChange={(e) => setSodCondAccessDaysBefore(e.target.value)}
                                    className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">days before expiry</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Duration before expiry</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs text-gray-600">Applications:</span>
                              <label className="flex items-center gap-1 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name="sod-cond-apps"
                                  checked={sodCondAppsMode === "all"}
                                  onChange={() => setSodCondAppsMode("all")}
                                  className="text-blue-600"
                                />
                                <span>All</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name="sod-cond-apps"
                                  checked={sodCondAppsMode === "selected"}
                                  onChange={() => setSodCondAppsMode("selected")}
                                  className="text-blue-600"
                                />
                                <span>Select Apps</span>
                              </label>
                              {sodCondAppsMode === "selected" && apps.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {apps.map((app) => (
                                    <label key={app.id} className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={sodCondSelectedApps.includes(app.id)}
                                        onChange={() =>
                                          toggleAppSelection(app.id, sodCondSelectedApps, setSodCondSelectedApps)
                                        }
                                        className="rounded border-gray-300 text-blue-600"
                                      />
                                      <span>{app.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Toggle
                              label="Enable Conditional Access Expiry"
                              checked={sodCondAccessExpiry}
                              onChange={setSodCondAccessExpiry}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
