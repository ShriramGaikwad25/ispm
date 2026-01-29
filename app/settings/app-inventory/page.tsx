"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
import "@/lib/ag-grid-setup";
import { ColDef } from "ag-grid-enterprise";
import { Pencil, Upload, Download, Search, Plus, Sparkles, Eye, X, Copy, RefreshCw, Settings, Network } from "lucide-react";
import Filters from "@/components/agTable/Filters";
import CustomPagination from "@/components/agTable/CustomPagination";
import { useRouter } from "next/navigation";
import { getAllApplications, getAllAppsForUserWithAI, regenerateApiToken, getApplicationDetails, type Application } from "@/lib/api";
import { getCookie, COOKIE_NAMES, getCurrentUser } from "@/lib/auth";
import HorizontalTabs from "@/components/HorizontalTabs";

interface AppInventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  serviceUrl: string;
  apiToken?: string;
  createdOn: string;
}

export default function AppInventoryPage() {
  const router = useRouter();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [rowData, setRowData] = useState<AppInventoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState<number | "all">(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRisk, setSelectedRisk] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [valueModal, setValueModal] = useState<{ open: boolean; title: string; value: string; appId?: string }>({
    open: false,
    title: "",
    value: "",
    appId: undefined,
  });
  const [regenerating, setRegenerating] = useState(false);
  const openValueModal = (title: string, value: string, appId?: string) => {
    setValueModal({ open: true, title, value: value ?? "", appId });
  };
  const closeValueModal = () => setValueModal((p) => ({ ...p, open: false }));

  // Convert API Application to AppInventoryItem - handle any format
  const convertApplicationToItem = (app: any): AppInventoryItem => {
    // Handle different possible field names and types
    const applicationId = app.ApplicationID || app.applicationID || app.id || app.Id || '';
    const applicationName = app.ApplicationName || app.applicationName || app.name || app.Name || '';
    const applicationType = app.ApplicationType || app.applicationType || app.type || app.Type || '';
    const tenantId = app.TenantID || app.tenantID || app.tenantId || app.tenant || '';
    const scimUrl = app.SCIMURL || app.scimURL || app.scimUrl || app.url || app.Url || '';
    const apiToken = app.APIToken || app.apiToken || app.api_token || app.token || '';
    
    return {
      id: String(applicationId),
      name: String(applicationName),
      description: `${applicationType} application registered for tenant ${tenantId}`,
      category: String(applicationType),
      riskLevel: "Medium", // Default risk level
      serviceUrl: String(scimUrl),
      apiToken: String(apiToken || ''),
      createdOn: new Date().toISOString().split('T')[0], // Current date as placeholder
    };
  };

  const [applicationsData, setApplicationsData] = useState<AppInventoryItem[]>([]);
  const [aiApplicationsData, setAiApplicationsData] = useState<AppInventoryItem[]>([]);

  // Fetch applications from API
  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use any type to avoid strict type checking issues
        const response: any = await getAllApplications();
        console.log('API Response received:', response);
        console.log('Response type:', typeof response);
        console.log('Response Applications:', response?.Applications);
        console.log('Response status:', response?.status, typeof response?.status);
        
        // Handle different possible response formats - be very flexible
        if (response && response.Applications) {
          // Ensure Applications is an array
          const applications = Array.isArray(response.Applications) 
            ? response.Applications 
            : [];
          
          if (applications.length === 0) {
            console.warn('Applications array is empty');
          }
          
          // Check status only if it exists and indicates an error
          const status = response.status;
          if (status !== undefined && status !== null) {
            const statusStr = String(status).toLowerCase();
            if (statusStr === 'error' || statusStr === 'failed') {
              const message = response.message || 'Failed to fetch applications';
              throw new Error(message);
            }
          }
          
          const convertedData = applications.map(convertApplicationToItem);
          setApplicationsData(convertedData);
        } else {
          throw new Error(response?.message || 'Invalid response format: Applications array not found');
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Fetch AI Assist apps when switching to the AI tab
  useEffect(() => {
    const fetchAiApps = async () => {
      try {
        // Determine login id from cookie or current user
        let loginId = '';
        const raw = getCookie(COOKIE_NAMES.UID_TENANT);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            loginId = parsed?.userid || parsed?.email || '';
          } catch {}
        }
        if (!loginId) {
          const current = getCurrentUser();
          loginId = (current?.email as string) || '';
        }
        if (!loginId) return;

        const resp: any = await getAllAppsForUserWithAI(loginId);
        // API returns { items: [...] , status: 'success' }
        const appsArray = Array.isArray(resp)
          ? resp
          : (resp?.items || resp?.Applications || resp?.apps || resp?.data || []);

        const converted = (appsArray as any[]).map((app: any) => {
          // Map AI Assist item shape to AppInventoryItem
          const applicationName = app.applicationName || app.name || '';
          const applicationType = app.applicationType || app.type || '';
          const description = app.applicationDescription || app.comments || '';
          const scimOrConnUrl = app.connectionDetails?.connectionURL || app.url || '';
          const apiToken = app.apiToken || app.api_token || app.APIToken || app.token || '';
          const id = app.requestId || app.id || applicationName || '';

          return {
            id: String(id),
            name: String(applicationName),
            description: String(description || `${applicationType} application`),
            category: String(applicationType || 'Unknown'),
            riskLevel: 'Medium',
            serviceUrl: String(scimOrConnUrl),
            apiToken: String(apiToken || ''),
            createdOn: new Date().toISOString().split('T')[0],
          } as AppInventoryItem;
        });
        setAiApplicationsData(converted);
      } catch (e) {
        console.error('AI Assist fetch error', e);
      }
    };

    if (mounted && activeTabIndex === 1 && aiApplicationsData.length === 0) {
      fetchAiApps();
    }
  }, [activeTabIndex, mounted]);

  // Sample data - fallback if API fails
  const sampleData: AppInventoryItem[] = [
    {
      id: "1",
      name: "Active Directory",
      description: "Centralized directory service for user authentication and authorization across the organization",
      category: "Identity Management",
      riskLevel: "Low",
      serviceUrl: "https://intranet.example.com/ad",
      apiToken: "",
      createdOn: "2023-08-05"
    },
    {
      id: "2",
      name: "SAP ERP System",
      description: "Enterprise resource planning system managing financial, HR, and operational processes",
      category: "Business Applications",
      riskLevel: "Medium",
      serviceUrl: "https://sap.example.com",
      apiToken: "",
      createdOn: "2022-11-20"
    },
    {
      id: "3",
      name: "Workday HCM",
      description: "Human capital management platform for employee lifecycle management and payroll processing",
      category: "HR Systems",
      riskLevel: "Low",
      serviceUrl: "https://workday.example.com",
      apiToken: "",
      createdOn: "2023-02-14"
    },
    {
      id: "4",
      name: "Oracle Database",
      description: "Primary database system storing critical business data and supporting multiple applications",
      category: "Database Systems",
      riskLevel: "High",
      serviceUrl: "https://db-admin.example.com/oracle",
      apiToken: "",
      createdOn: "2021-06-30"
    },
    {
      id: "5",
      name: "Salesforce CRM",
      description: "Customer relationship management platform for sales, marketing, and customer service operations",
      category: "Business Applications",
      riskLevel: "Medium",
      serviceUrl: "https://acme.my.salesforce.com",
      apiToken: "",
      createdOn: "2023-09-10"
    },
    {
      id: "6",
      name: "Microsoft Office 365",
      description: "Productivity suite including email, document collaboration, and communication tools",
      category: "Productivity Tools",
      riskLevel: "Low",
      serviceUrl: "https://portal.office.com",
      apiToken: "",
      createdOn: "2020-12-01"
    },
    {
      id: "7",
      name: "ServiceNow ITSM",
      description: "IT service management platform for incident, problem, and change management processes",
      category: "IT Management",
      riskLevel: "Medium",
      serviceUrl: "https://servicenow.example.com",
      apiToken: "",
      createdOn: "2022-05-18"
    },
    {
      id: "8",
      name: "Confluence Wiki",
      description: "Collaborative workspace for documentation, knowledge sharing, and team collaboration",
      category: "Collaboration Tools",
      riskLevel: "Low",
      serviceUrl: "https://confluence.example.com",
      apiToken: "",
      createdOn: "2021-03-22"
    }
  ];

useEffect(() => {
  setMounted(true);
}, []);

const categoryOptions = useMemo(() => {
  const set = new Set<string>();
  const base = activeTabIndex === 0
    ? (applicationsData.length > 0 ? applicationsData : sampleData)
    : aiApplicationsData;
  const data = base || [];
  for (const item of data) set.add(item.category);
  return Array.from(set).sort();
}, [applicationsData, aiApplicationsData, activeTabIndex]);

const filteredData = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  const base = activeTabIndex === 0
    ? (applicationsData.length > 0 ? applicationsData : sampleData)
    : aiApplicationsData;
  const data = base || [];
  return data.filter((item) => {
    const matchesQuery =
      q.length === 0 ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.serviceUrl.toLowerCase().includes(q) ||
      (item.apiToken ?? "").toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesRisk = !selectedRisk || item.riskLevel === selectedRisk;
    return matchesQuery && matchesCategory && matchesRisk;
  });
}, [searchQuery, selectedCategory, selectedRisk, applicationsData, aiApplicationsData, activeTabIndex]);

// Interleave each item with a full-width description row
const rowsWithDesc = useMemo(() => {
  if (!filteredData.length) return [];
  const rows: (AppInventoryItem & { __isDescRow?: boolean })[] = [];
  for (const item of filteredData) {
    rows.push(item);
    rows.push({ ...item, __isDescRow: true });
  }
  return rows;
}, [filteredData]);

useEffect(() => {
  const total = filteredData.length;
  const isAll = pageSize === "all";
  const numericPageSize = isAll ? total || 1 : (pageSize as number);
  const startIndex = (currentPage - 1) * numericPageSize * 2;
  const endIndex = isAll ? rowsWithDesc.length : startIndex + numericPageSize * 2;
  const paginatedRows = rowsWithDesc.slice(startIndex, endIndex);
  setRowData(paginatedRows);
  setTotalItems(total);
  setTotalPages(Math.max(1, isAll ? 1 : Math.ceil(total / numericPageSize)));
}, [filteredData, rowsWithDesc, currentPage, pageSize]);

useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, selectedCategory, selectedRisk]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        flex: 2,
        minWidth: 100,
        wrapText: true,
        autoHeight: true,
        colSpan: (params: any) => {
          if (!params.data?.__isDescRow) return 1;
          try {
            const center = params.api?.getDisplayedCenterColumns?.() || [];
            const left = params.api?.getDisplayedLeftColumns?.() || [];
            const right = params.api?.getDisplayedRightColumns?.() || [];
            const total = center.length + left.length + right.length;
            if (total > 0) return total;
          } catch {
            // ignore
          }
          return 1;
        },
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) {
            return (
              <div className="text-gray-600 text-sm w-full break-words whitespace-pre-wrap py-1 pr-4">
                {params.data?.description ?? "—"}
              </div>
            );
          }
          const appId = params.data?.id ?? "";
          const appName = params.data?.name ?? "";
          return (
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (appId) {
                    const apiToken = params.data?.apiToken ?? "";
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem(`app-inventory-token-${appId}`, apiToken);
                    }
                    router.push(`/settings/app-inventory/${appId}`);
                  }
                }}
                className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
              >
                {appName}
              </button>
            </div>
          );
        },
      },
      {
        headerName: "Application Type",
        field: "category",
        flex: 1,
        minWidth: 80,
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) return null;
          return <span className="text-sm text-gray-700">{params.value}</span>;
        },
      },
      {
        headerName: "SCIM URL",
        field: "serviceUrl",
        flex: 0.6,
        minWidth: 56,
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) return null;
          const url = params.value ?? "";
          return (
            <div className="flex items-center justify-center w-full h-full min-h-[42px]">
              <button
                type="button"
                className="rounded-full p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  openValueModal("SCIM URL", url);
                }}
                aria-label="View SCIM URL"
                title="View SCIM URL"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
      {
        headerName: "API Token",
        field: "apiToken",
        flex: 0.6,
        minWidth: 56,
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) return null;
          const token = params.data?.apiToken ?? params.value ?? "";
          if (!token) return <div className="flex items-center justify-center w-full h-full min-h-[42px]"><span className="text-sm text-gray-400">—</span></div>;
          return (
            <div className="flex items-center justify-center w-full h-full min-h-[42px]">
              <button
                type="button"
                className="rounded-full p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  const appId = params.data?.id ?? "";
                  openValueModal("API Token", token, appId);
                }}
                aria-label="View API Token"
                title="View API Token"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
      {
        headerName: "Created On",
        field: "createdOn",
        flex: 1,
        minWidth: 88,
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) return null;
          return (
            <span className="text-sm text-gray-600">
              {params.value ? new Date(params.value).toLocaleDateString() : ""}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        field: "actions",
        flex: 0.6,
        minWidth: 140,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: any) => {
          if (params.data?.__isDescRow) return null;
          return (
            <div className="flex items-center justify-center gap-2 w-full h-full min-h-[42px]">
              <button
                type="button"
                className="rounded-full p-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEdit(params.data);
                }}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleSchemaMapping(params.data);
                }}
                aria-label="Schema Mapping"
                title="Schema Mapping"
              >
                <Network className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleSettings(params.data);
                }}
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  // Must be before any conditional return so hook order is stable (Rules of Hooks)
  const getRowHeight = useCallback(
    (params: any) => (params?.data?.__isDescRow ? 52 : 42),
    []
  );

  const tabsData = useMemo(() => {
    const gridProps = {
      rowData,
      columnDefs,
      getRowHeight,
      headerHeight: 44,
      suppressRowClickSelection: true,
      suppressCellFocus: true,
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
      },
    };
    const GridTab = () => (
      <div className="w-full">
        <AgGridReact
          pagination={false}
          domLayout="autoHeight"
          style={{ width: "100%" }}
          {...gridProps}
        />
      </div>
    );
    return [
      { label: "Without AI Assist", component: GridTab },
      { label: "With AI Assist", component: GridTab },
    ];
  }, [rowData, columnDefs, getRowHeight]);

  const handleEdit = (item: AppInventoryItem) => {
    const appId = item?.id ?? "";
    if (!appId) return;
    const apiToken = item?.apiToken ?? "";
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`app-inventory-token-${appId}`, apiToken);
    }
    router.push(`/settings/app-inventory/${appId}?edit=true`);
  };

  const handleSchemaMapping = (item: AppInventoryItem) => {
    // Navigate to schema mapping page for this application
    router.push(`/settings/app-inventory/${item.id}/schema-mapping`);
  };

  const handleSettings = (item: AppInventoryItem) => {
    // Navigate to settings page for this application
    router.push(`/settings/app-inventory/${item.id}/settings`);
  };

  const handleAddApplication = () => {
    router.push("/settings/app-inventory/add-application");
  };

  const handleDownload = (data: AppInventoryItem[]) => {
    const headers = [
      "Name",
      "Description",
      "Category",
      "Risk",
      "Service URL",
      "API Token",
      "Created On",
    ];
    const rows = data.map((d) => [
      escapeCsv(d.name),
      escapeCsv(d.description),
      escapeCsv(d.category),
      escapeCsv(d.riskLevel),
      escapeCsv(d.serviceUrl),
      escapeCsv(d.apiToken ?? ""),
      escapeCsv(d.createdOn),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "app-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (value: string) => {
    if (value == null) return "";
    const needsQuotes = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      console.log("Uploaded file content:", reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!mounted || isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">App Inventory</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading applications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">App Inventory</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 w-full">
        <h1 className="text-2xl font-bold text-gray-900">App Inventory</h1>
      </div>
      
      {/* Content Area with Tabs */}
      <div className="flex-1 flex flex-col w-full overflow-visible">
        {/* Toolbar: search, filters, upload/download */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 w-full">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, description, URL..."
                className="outline-none text-sm placeholder:text-gray-400"
              />
            </div>

            {/* Filters (TreeClient-style) */}
            <Filters
              appliedFilter={(filters) => {
                const f = (filters && filters[0]) || "";
                if (f === "High" || f === "Medium" || f === "Low") {
                  setSelectedRisk(f);
                } else if (!f) {
                  setSelectedRisk("");
                }
              }}
              onFilterChange={(filter) => {
                if (!filter) return;
              }}
              context="status"
              initialSelected=""
            />

            <div className="ml-auto flex items-center gap-2">
              {/* Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => handleUpload(e)}
              />
              <button
                type="button"
                className="rounded-full p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                title="Upload"
                aria-label="Upload"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Download */}
              <button
                type="button"
                className="rounded-full p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                onClick={() => handleDownload(filteredData)}
                title="Download"
                aria-label="Download"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* AI Assist App */}
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-violet-100 text-violet-700 hover:bg-violet-200 text-sm font-medium transition-colors"
                onClick={() => router.push("/settings/app-inventory/ai-assist-app")}
                title="AI Assist App"
                aria-label="AI Assist App"
              >
                <Sparkles className="w-4 h-4" />
                AI Assist App
              </button>

              {/* Add Application */}
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-medium transition-colors"
                onClick={handleAddApplication}
                title="Add Application"
                aria-label="Add Application"
              >
                <Plus className="w-4 h-4" />
                Add Application
              </button>
            </div>
          </div>
        </div>

        {/* Top pagination */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 w-full">
          <CustomPagination
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100, "all"]}
          />
        </div>

        {/* Tabs only switch the table */}
        <div className="flex flex-col w-full px-6 py-4">
          <HorizontalTabs tabs={tabsData} defaultIndex={0} activeIndex={activeTabIndex} onChange={setActiveTabIndex} />
        </div>

        {/* Bottom pagination */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 w-full">
          <CustomPagination
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </div>

      {/* Value view popup (SCIM URL / API Token) */}
      {valueModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="value-modal-title"
          onClick={closeValueModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 id="value-modal-title" className="text-lg font-semibold text-gray-900">
                {valueModal.title}
              </h2>
            </div>
            <div className="p-4 overflow-auto flex-1 min-h-0">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap break-all font-sans bg-gray-50 p-3 rounded border border-gray-200">
                {valueModal.value || "—"}
              </pre>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              {valueModal.title === "API Token" && (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full px-4 py-2 bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={regenerating || !valueModal.value || !valueModal.appId}
                  onClick={async () => {
                    const oldToken = valueModal.value?.trim() || "";
                    const appId = valueModal.appId?.trim();
                    if (!oldToken || !appId) return;
                    setRegenerating(true);
                    try {
                      const res = await regenerateApiToken(oldToken, appId);
                      const newToken =
                        res?.APIToken ?? res?.NewAPIToken ?? res?.apiToken ?? res?.token ?? res?.newToken;
                      if (newToken != null && typeof newToken === "string") {
                        setValueModal((p) => ({ ...p, value: newToken }));
                      }
                      closeValueModal();
                    } catch (err) {
                      console.error("Regenerate token failed:", err);
                      alert(err instanceof Error ? err.message : "Failed to regenerate token");
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                  aria-label="Generate Token"
                  title="Generate new API token"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Regenerating…" : "Generate Token"}
                </button>
              )}
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
                onClick={() => {
                  const text = valueModal.value || "";
                  if (text && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text);
                  }
                }}
                aria-label="Copy"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors text-sm font-medium"
                onClick={closeValueModal}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

