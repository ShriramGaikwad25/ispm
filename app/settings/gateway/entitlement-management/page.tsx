"use client";

import { useState, useEffect, useMemo } from "react";
import { BackButton } from "@/components/BackButton";
import { ShieldCheck } from "lucide-react";
import ClientOnlyAgGrid from "@/components/ClientOnlyAgGrid";
import CustomPagination from "@/components/agTable/CustomPagination";

const ENTITLEMENT_FIELDS = [
  'ID',
  'Type',
  'Application Name',
  'Entitlement Name',
  'Description',
  'Total Assignments',
  'Dynamic Tag',
  'Business Objective',
  'Business Unit',
  'Entitlement Owner',
  'Compliance Type',
  'Data Classification',
  'Cost Center',
  'Created On',
  'Last Sync',
  'Application Instance',
  'Application Owner',
  'Hierarchy',
  'MFA Status',
  'Assignment',
  'License Type',
  'Risk',
  'Certifiable',
  'Revoke on Disable',
  'Shared Pwd',
  'SOD Check',
  'Access Scope',
  'Review Schedule',
  'Last Reviewed On',
  'Privileged',
  'Non Persistent Access',
  'Audit Comments',
  'Account Type Restriction',
  'Requestable',
  'Pre-Requisite',
  'Pre-Requisite Details',
  'Auto Assign Access Policy',
  'Provisioner Group',
  'Provisioning Steps',
  'Provisioning Mechanism',
  'Action on Native Change'
];

interface EntitlementRow {
  id: string;
  // Main fields
  entName?: string;
  entDescription?: string;
  entId?: string;
  // General
  entType?: string;
  totalAssignments?: string;
  appName?: string;
  dynamicTag?: string;
  // Business
  businessObjective?: string;
  businessUnit?: string;
  entOwner?: string;
  complianceType?: string;
  dataClassification?: string;
  costCenter?: string;
  // Technical
  createdOn?: string;
  lastSync?: string;
  appInstance?: string;
  appOwner?: string;
  hierarchy?: string;
  mfaStatus?: string;
  assignment?: string;
  licenseType?: string;
  // Security
  risk?: string;
  certifiable?: string;
  revokeOnDisable?: string;
  sharedPwd?: string;
  sodCheck?: string;
  accessScope?: string;
  reviewSchedule?: string;
  lastReviewedOn?: string;
  privileged?: string;
  nonPersistentAccess?: string;
  auditComments?: string;
  accountTypeRestriction?: string;
  // Lifecycle
  requestable?: string;
  preRequisite?: string;
  preRequisiteDetails?: string;
  autoAssignAccessPolicy?: string;
  provisionerGroup?: string;
  provisioningSteps?: string;
  provisioningMechanism?: string;
  actionOnNativeChange?: string;
  // Table controls - per field selection
  fieldSelection?: Record<string, boolean>;
  fieldGenAI?: Record<string, boolean>;
}

export default function EntitlementManagementSettings() {
  const [rows, setRows] = useState<EntitlementRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (dataLoaded) return; // Prevent duplicate loading
    
    const controller = new AbortController();
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // TODO: Replace with actual API endpoint when available
        // const res = await fetch("API_ENDPOINT_HERE", { signal: controller.signal });
        // if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        // const data = await res.json();
        // if (isMounted) setRows(data);
        
        // Placeholder data for now - includes all fields from Entitlement Details sidebar
        const placeholderData: EntitlementRow[] = [
          {
            id: '1',
            entName: 'Administrator Access',
            entDescription: 'Full administrative access to the system',
            entId: 'ENT-001',
            entType: 'Role',
            totalAssignments: '25',
            appName: 'Active Directory',
            dynamicTag: 'IT, Admin',
            businessObjective: 'System Administration',
            businessUnit: 'IT Operations',
            entOwner: 'John Doe',
            complianceType: 'SOX',
            dataClassification: 'Confidential',
            costCenter: 'CC-IT-001',
            createdOn: '2024-01-15',
            lastSync: '2024-12-10',
            appInstance: 'AD-PROD-01',
            appOwner: 'Jane Smith',
            hierarchy: 'Domain Admin > Admin',
            mfaStatus: 'Enabled',
            assignment: 'Direct',
            licenseType: 'Enterprise',
            risk: 'High',
            certifiable: 'Yes',
            revokeOnDisable: 'Yes',
            sharedPwd: 'No',
            sodCheck: 'None',
            accessScope: 'Global',
            reviewSchedule: 'Quarterly',
            lastReviewedOn: '2024-09-15',
            privileged: 'Yes',
            nonPersistentAccess: 'No',
            auditComments: 'Regular review required',
            accountTypeRestriction: 'Service Account',
            requestable: 'Yes',
            preRequisite: 'Security Training',
            preRequisiteDetails: 'Complete security awareness training',
            autoAssignAccessPolicy: 'Policy-001',
            provisionerGroup: 'IT-Provisioning',
            provisioningSteps: 'Step 1: Create account, Step 2: Assign role',
            provisioningMechanism: 'Automated',
            actionOnNativeChange: 'Sync',
            fieldSelection: {},
            fieldGenAI: {}
          }
        ];
        if (isMounted) {
          setRows(placeholderData);
          setDataLoaded(true);
        }
      } catch (e: any) {
        if (e.name !== "AbortError" && isMounted) {
          setError(e?.message || "Failed to load data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dataLoaded]);

  const handleSelectionChange = (id: string, fieldName: string, checked: boolean) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const fieldSelection = row.fieldSelection || {};
        return { ...row, fieldSelection: { ...fieldSelection, [fieldName]: checked } };
      }
      return row;
    }));
  };

  const handleGenAIChange = (id: string, fieldName: string, checked: boolean) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const fieldGenAI = row.fieldGenAI || {};
        return { ...row, fieldGenAI: { ...fieldGenAI, [fieldName]: checked } };
      }
      return row;
    }));
  };

  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return rows;
    const start = (currentPage - 1) * (pageSize as number);
    const end = start + (pageSize as number);
    return rows.slice(start, end);
  }, [rows, currentPage, pageSize]);

  return (
    <div className="h-full p-6">
      <div className="mx-auto min-h-[calc(100vh-120px)]">
        <div className="mb-4"><BackButton /></div>

        <div className="bg-white rounded-md shadow overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 text-white" style={{ backgroundColor: '#27B973' }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(39, 185, 115, 0.6)' }}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="font-semibold">Entitlement Management</h2>
            </div>
          </div>

          <div className="overflow-x-auto mt-3">
            {isLoading && <div className="px-5 py-3 text-sm text-gray-600">Loading...</div>}
            {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}
            <div className="ag-theme-alpine w-full">
              <ClientOnlyAgGrid
                rowData={paginatedRows}
                columnDefs={[
                  { 
                    headerName: 'Entitlement Meta Data', 
                    field: 'entName',
                    flex: 2,
                    sortable: true,
                    filter: true,
                    cellRenderer: (params: any) => {
                      return (
                        <div className="py-2 text-sm">
                          {ENTITLEMENT_FIELDS.map((field, index) => (
                            <div key={field} className="h-6 flex items-center">
                              <strong>{field}</strong>
                            </div>
                          ))}
                        </div>
                      );
                    },
                    autoHeight: true
                  },
                  { 
                    headerName: 'Selection', 
                    field: 'selection',
                    width: 120,
                    cellRenderer: (params: any) => {
                      const fieldSelection = params.data.fieldSelection || {};
                      return (
                        <div className="py-2">
                          {ENTITLEMENT_FIELDS.map((field) => (
                            <div key={field} className="h-6 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={fieldSelection[field] || false}
                                onChange={(e) => handleSelectionChange(params.data.id, field, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    },
                    sortable: false,
                    filter: false,
                    autoHeight: true
                  },
                  { 
                    headerName: 'GenAI', 
                    field: 'genAI',
                    width: 120,
                    cellRenderer: (params: any) => {
                      const fieldGenAI = params.data.fieldGenAI || {};
                      return (
                        <div className="py-2">
                          {ENTITLEMENT_FIELDS.map((field) => (
                            <div key={field} className="h-6 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={fieldGenAI[field] || false}
                                onChange={(e) => handleGenAIChange(params.data.id, field, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    },
                    sortable: false,
                    filter: false,
                    autoHeight: true
                  }
                ]}
                domLayout="autoHeight"
              />
            </div>
            <div className="mt-1">
              <CustomPagination
                totalItems={rows.length}
                currentPage={currentPage}
                totalPages={pageSize === 'all' ? 1 : Math.max(1, Math.ceil(rows.length / (pageSize as number)))}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

