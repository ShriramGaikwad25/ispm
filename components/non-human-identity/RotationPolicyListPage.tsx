"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, MoreHorizontal, Pencil, Power, Search } from "lucide-react";
import {
  MOCK_ROTATION_POLICIES,
  type RotationPolicyListRow,
  type RotationPolicyStatus,
} from "@/components/non-human-identity/rotation-policy-mock";

const NHI_TYPE_OPTIONS = Array.from(new Set(MOCK_ROTATION_POLICIES.flatMap((r) => r.nhiTypes))).sort();
const STATUS_OPTIONS: ("all" | RotationPolicyStatus)[] = ["all", "Active", "Draft", "Paused"];

function statusBadgeClass(s: RotationPolicyStatus): string {
  switch (s) {
    case "Active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "Paused":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function nhiBadgeClass(i: number): string {
  const palette = [
    "border-indigo-200 bg-indigo-50 text-indigo-800",
    "border-violet-200 bg-violet-50 text-violet-800",
    "border-sky-200 bg-sky-50 text-sky-800",
    "border-teal-200 bg-teal-50 text-teal-800",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  ];
  return palette[i % palette.length];
}

function rowMatchesFrequencyFilter(row: RotationPolicyListRow, freq: string): boolean {
  if (freq === "all") return true;
  if (freq === "event") return /event/i.test(row.frequencyLabel);
  return row.frequencyLabel.includes(freq);
}

export function RotationPolicyListPage() {
  const [search, setSearch] = useState("");
  const [nhiFilter, setNhiFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [freqFilter, setFreqFilter] = useState<string>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_ROTATION_POLICIES.filter((r) => {
      const blob = [r.name, r.description, r.nhiTypes.join(" "), r.status, r.frequencyLabel]
        .join(" ")
        .toLowerCase();
      if (q && !blob.includes(q)) return false;
      if (nhiFilter !== "all" && !r.nhiTypes.includes(nhiFilter)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!rowMatchesFrequencyFilter(r, freqFilter)) return false;
      return true;
    });
  }, [search, nhiFilter, statusFilter, freqFilter]);

  const summary = useMemo(() => {
    const totalPolicies = filtered.length;
    const identitiesCovered = filtered.reduce((acc, r) => acc + r.identityCount, 0);
    const reviewPolicies = filtered.filter((r) => r.status === "Draft").length;
    const denom = 850;
    const coverageScopePct = Math.min(100, Math.round((identitiesCovered / denom) * 100));
    return { totalPolicies, identitiesCovered, reviewPolicies, coverageScopePct };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Credential Rotation Policies</h1>
            <p className="mt-2 text-sm text-gray-600">
              Define how non-human credentials are rotated, who is notified, and how overlaps are resolved when
              multiple policies apply.
            </p>
          </div>
          <Link
            href="/non-human-identity/rotation-policy/new"
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Create Policy
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="rotation-policy-search" className="text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" aria-hidden />
              </div>
              <input
                id="rotation-policy-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Policy name, NHI type, status, rotation frequency…"
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="rotation-nhi-type" className="text-sm font-medium text-gray-700">
              NHI type
            </label>
            <select
              id="rotation-nhi-type"
              value={nhiFilter}
              onChange={(e) => setNhiFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All types</option>
              {NHI_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="rotation-status" className="text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="rotation-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="rotation-freq" className="text-sm font-medium text-gray-700">
              Rotation frequency
            </label>
            <select
              id="rotation-freq"
              value={freqFilter}
              onChange={(e) => setFreqFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">Any</option>
              <option value="30">~30 days</option>
              <option value="45">~45 days</option>
              <option value="90">~90 days</option>
              <option value="180">~180 days</option>
              <option value="365">~365 days</option>
              <option value="event">Event-triggered</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { label: "Total policies", value: String(summary.totalPolicies), tone: "text-slate-900" },
              { label: "Identities covered", value: String(summary.identitiesCovered), tone: "text-blue-600" },
              { label: "Review policies", value: String(summary.reviewPolicies), tone: "text-amber-600" },
              { label: "Coverage scope", value: `${summary.coverageScopePct}%`, tone: "text-emerald-600" },
            ] as const
          ).map((card) => (
            <div key={card.label} className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Policies <span className="font-normal text-gray-500">({filtered.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3">Policy name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">NHI types</th>
                  <th className="px-4 py-3">Rotation frequency</th>
                  <th className="px-4 py-3"># Identities</th>
                  <th className="px-4 py-3">Last rotated</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No policies match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                      <td className="max-w-xs px-4 py-3 text-gray-700">
                        <span className="line-clamp-2">{row.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.nhiTypes.map((t, i) => (
                            <span
                              key={t}
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${nhiBadgeClass(i)}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-800">{row.frequencyLabel}</td>
                      <td className="px-4 py-3">
                        <Link
                          href="/non-human-identity/nhi-inventory"
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {row.identityCount}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {row.lastRotated
                          ? new Date(row.lastRotated).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/non-human-identity/rotation-policy/${row.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            title="Edit"
                            aria-label="Edit policy"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            title="Duplicate / copy"
                            aria-label="Duplicate policy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            title="Disable"
                            aria-label="Disable policy"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                              title="More actions"
                              aria-expanded={menuOpenId === row.id}
                              aria-haspopup="menu"
                              onClick={() => setMenuOpenId((id) => (id === row.id ? null : row.id))}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuOpenId === row.id && (
                              <div
                                role="menu"
                                className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  Simulate
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setMenuOpenId(null)}
                                >
                                  View audit log
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
