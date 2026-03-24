"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, FileText, Printer, Shield, Tag, UserRound, Users } from "lucide-react";

const BUSINESS_ROLE_VIEW_STORAGE_KEY = "businessRoleViewDraft";

type AccessItem = { id: string; name: string; risk?: string };

type BusinessRoleViewData = {
  businessRoleId: string;
  roleName: string;
  roleCode: string;
  description: string;
  owner: string;
  ownerId: string;
  tags: string;
  noOfUsers: number | null;
  noOfPermissions: number | null;
  selectedAccessIds: string[];
  accessItems: AccessItem[];
};

const EMPTY_DATA: BusinessRoleViewData = {
  businessRoleId: "",
  roleName: "",
  roleCode: "",
  description: "",
  owner: "",
  ownerId: "",
  tags: "",
  noOfUsers: null,
  noOfPermissions: null,
  selectedAccessIds: [],
  accessItems: [],
};

function mapListRowToViewData(row: Record<string, unknown>): Partial<BusinessRoleViewData> {
  const businessRoleId = String(
    row.businessroleid ??
      row.business_role_id ??
      row.businessRoleId ??
      row.roleid ??
      row.role_id ??
      row.id ??
      ""
  ).trim();

  const roleName = String(
    row.rolename ??
      row.role_name ??
      row.roleName ??
      row.businessrolename ??
      row.business_role_name ??
      row.name ??
      ""
  ).trim();

  const roleCode = String(
    row.rolecode ??
      row.role_code ??
      row.roleCode ??
      row.businessrolecode ??
      row.business_role_code ??
      row.code ??
      ""
  ).trim();

  const description = String(
    row.description ??
      row.role_description ??
      row.businessroledescription ??
      row.business_role_description ??
      ""
  ).trim();

  const owner = String(
    row.owner ??
      row.owner_email ??
      row.owneremail ??
      row.email ??
      row.owner_name ??
      ""
  ).trim();

  const ownerId = String(
    row.ownerid ?? row.owner_id ?? row.ownerId ?? row.userid ?? row.user_id ?? ""
  ).trim();

  const tags = String(
    row.tags ?? row.category ?? row.business_role_category ?? row.role_category ?? ""
  ).trim();

  const noOfUsersRaw =
    row.no_of_users ??
    row.noofusers ??
    row.usercount ??
    row.users_count ??
    row.noOfUsers;
  const noOfPermsRaw =
    row.no_of_permissions ??
    row.noofpermissions ??
    row.permissioncount ??
    row.permissions_count ??
    row.noOfPermissions;

  let selectedAccessIds: string[] = [];
  const rawSelectedIds =
    row.selectedaccessids ??
    row.selected_access_ids ??
    row.selectedAccessIds ??
    row.accessids ??
    row.access_ids ??
    row.entitlement_ids ??
    null;
  if (typeof rawSelectedIds === "string") {
    selectedAccessIds = rawSelectedIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawSelectedIds)) {
    selectedAccessIds = rawSelectedIds.map((v) => String(v ?? "").trim()).filter(Boolean);
  }

  return {
    businessRoleId,
    roleName: roleName || "Unnamed Role",
    roleCode,
    description,
    owner,
    ownerId,
    tags,
    noOfUsers:
      noOfUsersRaw !== undefined && noOfUsersRaw !== null ? Number(noOfUsersRaw) : null,
    noOfPermissions:
      noOfPermsRaw !== undefined && noOfPermsRaw !== null ? Number(noOfPermsRaw) : null,
    selectedAccessIds,
  };
}

export default function BusinessRoleReviewPage() {
  const [data, setData] = useState<BusinessRoleViewData>(EMPTY_DATA);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUSINESS_ROLE_VIEW_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as {
        businessRoleId?: string;
        roleName?: string;
        roleCode?: string;
        description?: string;
        owner?: string;
        ownerId?: string;
        tags?: string;
        tagsArray?: string[];
        noOfUsers?: number | null;
        noOfPermissions?: number | null;
        selectedAccessIds?: string[];
        accessItems?: AccessItem[];
        raw?: Record<string, unknown> | null;
      };

      const tagsFromArray =
        Array.isArray(parsed.tagsArray) && parsed.tagsArray.length
          ? parsed.tagsArray.join(", ")
          : parsed.tags ?? "";

      const initial: BusinessRoleViewData = {
        businessRoleId: parsed.businessRoleId ?? "",
        roleName: parsed.roleName ?? "",
        roleCode: parsed.roleCode ?? "",
        description: parsed.description ?? "",
        owner: parsed.owner ?? "",
        ownerId: parsed.ownerId ?? "",
        tags: tagsFromArray,
        noOfUsers:
          parsed.noOfUsers !== undefined && parsed.noOfUsers !== null
            ? Number(parsed.noOfUsers)
            : null,
        noOfPermissions:
          parsed.noOfPermissions !== undefined && parsed.noOfPermissions !== null
            ? Number(parsed.noOfPermissions)
            : null,
        selectedAccessIds: Array.isArray(parsed.selectedAccessIds)
          ? parsed.selectedAccessIds.map((s) => String(s).trim()).filter(Boolean)
          : [],
        accessItems: Array.isArray(parsed.accessItems) ? parsed.accessItems : [],
      };

      if (parsed.raw && typeof parsed.raw === "object") {
        const fromRow = mapListRowToViewData(parsed.raw);
        const merged: BusinessRoleViewData = {
          ...fromRow,
          ...initial,
          roleName: initial.roleName || fromRow.roleName || "",
          roleCode: initial.roleCode || fromRow.roleCode || "",
          description: initial.description || fromRow.description || "",
          owner: initial.owner || fromRow.owner || "",
          ownerId: initial.ownerId || fromRow.ownerId || "",
          tags: initial.tags || fromRow.tags || "",
          noOfUsers: initial.noOfUsers ?? fromRow.noOfUsers ?? null,
          noOfPermissions: initial.noOfPermissions ?? fromRow.noOfPermissions ?? null,
          businessRoleId: initial.businessRoleId || fromRow.businessRoleId || "",
          selectedAccessIds:
            initial.selectedAccessIds.length > 0
              ? initial.selectedAccessIds
              : fromRow.selectedAccessIds ?? [],
          accessItems: initial.accessItems.length > 0 ? initial.accessItems : [],
        };
        setData(merged);
      } else {
        setData(initial);
      }

      setHasData(true);
    } catch (error) {
      console.error("Unable to load business role review data:", error);
    }
  }, []);

  const displayAccess =
    data.accessItems.length > 0
      ? data.accessItems
      : data.selectedAccessIds.map((id) => ({ id, name: id }));

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-2">
        <div className="flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center border-0 bg-transparent text-gray-600 shadow-none hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded p-1"
            title="Print page"
            aria-label="Print page"
          >
            <Printer className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Review Business Role
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            Read-only summary of role details and attached access. Use View from Manage
            Business Roles or open from the create/edit wizard.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {!hasData ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p>
                No business role selected. Use the View action on Manage Business Roles, or
                choose &quot;Open review page&quot; on the final step of the wizard.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Business Role</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Name
                    </p>
                    <p className="text-xs font-medium text-gray-900">{data.roleName || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Tag className="h-4 w-4 text-blue-600" />
                      Role code
                    </p>
                    <p className="text-xs font-medium text-gray-900">{data.roleCode || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <UserRound className="h-4 w-4 text-blue-600" />
                      Owner
                    </p>
                    <p className="text-xs font-medium text-gray-900">{data.owner || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Tag className="h-4 w-4 text-blue-600" />
                      Tags / category
                    </p>
                    <p className="text-xs font-medium text-gray-900">{data.tags || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Users className="h-4 w-4 text-blue-600" />
                      No. of users
                    </p>
                    <p className="text-xs font-medium text-gray-900">
                      {data.noOfUsers != null ? String(data.noOfUsers) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <Shield className="h-4 w-4 text-blue-600" />
                      No. of permissions
                    </p>
                    <p className="text-xs font-medium text-gray-900">
                      {data.noOfPermissions != null ? String(data.noOfPermissions) : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Description
                  </p>
                  <p className="text-xs leading-5 text-gray-900 whitespace-pre-wrap">
                    {data.description || "—"}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Selected access</h4>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {displayAccess.length} item(s)
                  </span>
                </div>
                {displayAccess.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No catalog access linked to this role in the snapshot.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {displayAccess.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-3 py-2 bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">
                            {item.id}
                          </p>
                        </div>
                        {item.risk && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full border border-gray-300 text-gray-700 shrink-0">
                            {item.risk} risk
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
