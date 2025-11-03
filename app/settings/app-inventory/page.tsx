"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
import "@/lib/ag-grid-setup";
import { ColDef } from "ag-grid-enterprise";
import { Pencil, Upload, Download, Search, Plus, Sparkles } from "lucide-react";
import Filters from "@/components/agTable/Filters";
import CustomPagination from "@/components/agTable/CustomPagination";
import { useRouter } from "next/navigation";
import { getAllApplications, getAllAppsForUserWithAI, type Application } from "@/lib/api";
import { getCookie, COOKIE_NAMES, getCurrentUser } from "@/lib/auth";
import HorizontalTabs from "@/components/HorizontalTabs";

interface AppInventoryItem {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  serviceUrl: string;
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

  // Convert API Application to AppInventoryItem - handle any format
  const convertApplicationToItem = (app: any): AppInventoryItem => {
    // Handle different possible field names and types
    const applicationId = app.ApplicationID || app.applicationID || app.id || app.Id || '';
    const applicationName = app.ApplicationName || app.applicationName || app.name || app.Name || '';
    const applicationType = app.ApplicationType || app.applicationType || app.type || app.Type || '';
    const tenantId = app.TenantID || app.tenantID || app.tenantId || app.tenant || '';
    const scimUrl = app.SCIMURL || app.scimURL || app.scimUrl || app.url || app.Url || '';
    
    return {
      id: String(applicationId),
      name: String(applicationName),
      description: `${applicationType} application registered for tenant ${tenantId}`,
      category: String(applicationType),
      riskLevel: "Medium", // Default risk level
      serviceUrl: String(scimUrl),
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
          const id = app.requestId || app.id || applicationName || '';

          return {
            id: String(id),
            name: String(applicationName),
            description: String(description || `${applicationType} application`),
            category: String(applicationType || 'Unknown'),
            riskLevel: 'Medium',
            serviceUrl: String(scimOrConnUrl),
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
      createdOn: "2023-08-05"
    },
    {
      id: "2", 
      name: "SAP ERP System",
      description: "Enterprise resource planning system managing financial, HR, and operational processes",
      category: "Business Applications",
      riskLevel: "Medium",
      serviceUrl: "https://sap.example.com",
      createdOn: "2022-11-20"
    },
    {
      id: "3",
      name: "Workday HCM",
      description: "Human capital management platform for employee lifecycle management and payroll processing",
      category: "HR Systems",
      riskLevel: "Low",
      serviceUrl: "https://workday.example.com",
      createdOn: "2023-02-14"
    },
    {
      id: "4",
      name: "Oracle Database",
      description: "Primary database system storing critical business data and supporting multiple applications",
      category: "Database Systems",
      riskLevel: "High",
      serviceUrl: "https://db-admin.example.com/oracle",
      createdOn: "2021-06-30"
    },
    {
      id: "5",
      name: "Salesforce CRM",
      description: "Customer relationship management platform for sales, marketing, and customer service operations",
      category: "Business Applications",
      riskLevel: "Medium",
      serviceUrl: "https://acme.my.salesforce.com",
      createdOn: "2023-09-10"
    },
    {
      id: "6",
      name: "Microsoft Office 365",
      description: "Productivity suite including email, document collaboration, and communication tools",
      category: "Productivity Tools",
      riskLevel: "Low",
      serviceUrl: "https://portal.office.com",
      createdOn: "2020-12-01"
    },
    {
      id: "7",
      name: "ServiceNow ITSM",
      description: "IT service management platform for incident, problem, and change management processes",
      category: "IT Management",
      riskLevel: "Medium",
      serviceUrl: "https://servicenow.example.com",
      createdOn: "2022-05-18"
    },
    {
      id: "8",
      name: "Confluence Wiki",
      description: "Collaborative workspace for documentation, knowledge sharing, and team collaboration",
      category: "Collaboration Tools",
      riskLevel: "Low",
      serviceUrl: "https://confluence.example.com",
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
      item.serviceUrl.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesRisk = !selectedRisk || item.riskLevel === selectedRisk;
    return matchesQuery && matchesCategory && matchesRisk;
  });
}, [searchQuery, selectedCategory, selectedRisk, applicationsData, aiApplicationsData, activeTabIndex]);

useEffect(() => {
  const total = filteredData.length;
  const isAll = pageSize === "all";
  const numericPageSize = isAll ? total || 1 : (pageSize as number);
  const startIndex = (currentPage - 1) * numericPageSize;
  const endIndex = isAll ? total : startIndex + numericPageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  setRowData(paginatedData);
  setTotalItems(total);
  setTotalPages(Math.max(1, isAll ? 1 : Math.ceil(total / numericPageSize)));
  }, [filteredData, currentPage, pageSize]);

useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, selectedCategory, selectedRisk]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Name",
        field: "name",
        width: 250,
        cellRenderer: (params: any) => {
          const name = params.data.name;
          return (
            <div className="flex items-center gap-2 py-2">
              <span className="font-semibold text-gray-900">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        headerName: "Description",
        field: "description",
        width: 450,
        wrapText: true,
        autoHeight: true,
        cellRenderer: (params: any) => (
          <div className="py-2">
            <span className="text-sm text-gray-600 leading-relaxed">
              {params.value}
            </span>
          </div>
        ),
      },
      {
        headerName: "Application Type",
        field: "category",
        width: 200,
        cellRenderer: (params: any) => (
          <span className="text-sm text-gray-700">{params.value}</span>
        ),
      },
      {
        headerName: "SCIM URL",
        field: "serviceUrl",
        width: 300,
        cellRenderer: (params: any) => (
          <a
            href={params.value}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 text-sm"
            title={params.value}
          >
            {params.value.length > 50 ? `${params.value.substring(0, 50)}...` : params.value}
          </a>
        ),
      },
      {
        headerName: "Created On",
        field: "createdOn",
        width: 150,
        cellRenderer: (params: any) => (
          <span className="text-sm text-gray-600">
            {new Date(params.value).toLocaleDateString()}
          </span>
        ),
      },
      {
        headerName: "Actions",
        field: "actions",
        width: 120,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              onClick={() => handleEdit(params.data)}
              aria-label="Edit"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const handleEdit = (item: AppInventoryItem) => {
    // Replace with your edit flow (drawer/modal/navigation)
    console.log("Edit clicked for:", item);
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
      "Created On",
    ];
    const rows = data.map((d) => [
      escapeCsv(d.name),
      escapeCsv(d.description),
      escapeCsv(d.category),
      escapeCsv(d.riskLevel),
      escapeCsv(d.serviceUrl),
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

  // Tab components
  const WithoutAIAssistTab = () => (
    <div className="w-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={false}
        domLayout="autoHeight"
        rowHeight={80}
        headerHeight={50}
        suppressRowClickSelection={true}
        suppressCellFocus={true}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
        }}
        style={{ width: "100%" }}
      />
    </div>
  );

  const WithAIAssistTab = () => (
    <div className="w-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={false}
        domLayout="autoHeight"
        rowHeight={80}
        headerHeight={50}
        suppressRowClickSelection={true}
        suppressCellFocus={true}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
        }}
        style={{ width: "100%" }}
      />
    </div>
  );

  const tabsData = [
    {
      label: "Without AI Assist",
      component: WithoutAIAssistTab,
    },
    {
      label: "With AI Assist",
      component: WithAIAssistTab,
    },
  ];

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
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
                title="Upload"
                aria-label="Upload"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Download */}
              <button
                type="button"
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => handleDownload(filteredData)}
                title="Download"
                aria-label="Download"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* AI Assist App */}
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 border border-blue-300 rounded hover:bg-blue-50 text-sm font-medium text-blue-700 bg-blue-50"
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
                className="flex items-center gap-2 px-3 py-2 border border-blue-300 rounded hover:bg-blue-50 text-sm font-medium text-blue-700 bg-blue-50"
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
    </div>
  );
}

