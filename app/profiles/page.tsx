"use client";
import React, { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
const AgGridReact = dynamic(() => import("ag-grid-react").then(mod => mod.AgGridReact), { ssr: false });
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams, IDetailCellRendererParams } from "ag-grid-enterprise";
import ActionButtons from "@/components/agTable/ActionButtons";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";
import { formatDateMMDDYY } from "../access-review/page";
import { apiRequestWithAuth } from "@/lib/auth";
import { useLoading } from "@/contexts/LoadingContext";

// Custom detail cell renderer for profileanalytics
const ProfileAnalyticsDetailRenderer = (params: IDetailCellRendererParams) => {
  const profileData = params.data?.profileData;
  const profileanalytics = profileData?.profileanalytics;

  if (!profileanalytics) {
    return (
      <div className="p-4 bg-gray-50">
        <p className="text-gray-600">No profile analytics data available</p>
      </div>
    );
  }

  const { entitlementCounts } = profileanalytics;

  // Flatten entitlements with application names for table display
  const tableData = entitlementCounts?.flatMap((app: any) =>
    (app.entitlements || []).map((entitlement: any) => ({
      applicationName: app.applicationname || "N/A",
      entitlementName: entitlement.name || "N/A",
      userCount: entitlement.userCount ?? 0,
    }))
  ) || [];

  return (
    <div className="w-full profile-detail-table" style={{ margin: 0, padding: '8px', paddingBottom: '16px' }}>
      {tableData.length > 0 ? (
        <div className="bg-white border border-gray-200 overflow-hidden w-full rounded-md">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Application Name</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Entitlement Name</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">User Count</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row: any, index: number) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0"
                >
                  <td className="px-4 py-2 text-sm text-gray-700">{row.applicationName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.entitlementName}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-600">{row.userCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 p-2">No entitlement data available</p>
      )}
    </div>
  );
};

const Page = () => {
  const [selectedProfile, setSelectedProfile] = useState<string>("Q1 Profiling");
  const [apiData, setApiData] = useState<any[]>([]);
  const { showApiLoader, hideApiLoader } = useLoading();
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "profile",
        headerName: "Profile",
        flex: 4,
        cellRenderer: "agGroupCellRenderer",
      },
      { field: "users", headerName: "Users", flex: 2 },
      {
        field: "newGrants",
        headerName: "New Grants",
        type: "numberColumn",
        flex: 2,
      },
      {
        field: "activeGrants",
        headerName: "Active Grants",
        type: "numberColumn",
        flex: 2,
      },
      { field: "lastUpdated", headerName: "Last Updated", flex: 2,      valueFormatter: (params) => formatDateMMDDYY(params.value),
       },
      {
        field: "actions",
        headerName: "Actions",
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <ActionButtons api={params.api} selectedRows={[params.data]} />
          );
        },
      },
    ],
    []
  );
  //     mode: "multiRow",
  //   };
  // }, []);


  // Extract unique profile names for the dropdown
  const profileNames = useMemo(() => {
    // Only include Q1 Profiling in the dropdown
    return ["Q1 Profiling"];
  }, []);

  // Call API when Q1 Profiling is selected
  useEffect(() => {
    const fetchProfileData = async () => {
      if (selectedProfile === "Q1 Profiling") {
        try {
          showApiLoader("Loading profile data...");
          const profileName = encodeURIComponent("Q1 Profiling");
          const apiUrl = `https://preview.keyforge.ai/profiling/api/v1/ACMECOM/getProfileByname/${profileName}`;
          const response = await apiRequestWithAuth<any>(apiUrl);
          
          // Transform API response to match table structure
          // Handle both array and single object responses
          const responseArray = Array.isArray(response) ? response : (response ? [response] : []);
          const transformedData = responseArray.map((item: any) => {
            // Calculate total number of entitlements from entitlementCounts
            const totalEntitlements = item.profileanalytics?.entitlementCounts?.reduce((count: number, app: any) => {
              return count + (app.entitlements?.length || 0);
            }, 0) || 0;
            
            // Format profiledefinition for display
            const formatProfileDefinition = (profiledefinition: any) => {
              if (!profiledefinition) return item.nameofanalytics || item.profilename || "Q1 Profiling";
              if (typeof profiledefinition === 'string') return profiledefinition;
              // Convert object to readable string format (e.g., "location = ID")
              return Object.entries(profiledefinition)
                .map(([key, value]) => `${key} = ${value}`)
                .join(' & ');
            };
            
            // Format users as numOfUsers/totalUsers
            const numOfUsers = item.profileanalytics?.numOfUsers ?? 0;
            const totalUsers = item.profileanalytics?.totalUsers ?? 0;
            const usersDisplay = `${numOfUsers}/${totalUsers}`;
            
            return {
              profile: formatProfileDefinition(item.profiledefinition),
              users: usersDisplay,
              newGrants: 0, // Not available in API response
              activeGrants: totalEntitlements,
              lastUpdated: formatDateMMDDYY(item.createtime) || "",
              details: item.profiledescription || JSON.stringify(item.profileanalytics, null, 2),
              profileData: item, // Store full data for detail view
            };
          });
          
          setApiData(transformedData);
        } catch (error) {
          console.error("Error fetching profile data:", error);
          setApiData([]);
        } finally {
          hideApiLoader();
        }
      } else {
        setApiData([]);
      }
    };

    fetchProfileData();
  }, [selectedProfile, showApiLoader, hideApiLoader]);

  // Use only API data
  const filteredRowData = useMemo(() => {
    return apiData;
  }, [apiData]);

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  return (
    <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
      <div className="relative mb-4">
        <h1 className="text-xl font-bold border-b border-gray-300 pb-2 text-blue-950">
          Profiles
        </h1>
        <Accordion
          iconClass="absolute top-1 right-0 rounded-full text-white bg-purple-800"
          title="Expand/Collapse"
        >
          <ChartComponent />
        </Accordion>
      </div>
      <div className="mb-4">
        <label htmlFor="profile-name-select" className="block text-sm font-medium text-gray-700 mb-2">
          Profile Name
        </label>
        <select
          id="profile-name-select"
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          {profileNames.map((profileName, index) => (
            <option key={index} value={profileName}>
              {profileName}
            </option>
          ))}
        </select>
      </div>
      <style>{`
        .ag-row-group-expanded,
        .expanded-row-highlight {
          background-color: #E5EEFC !important;
        }
        .ag-row-group-expanded:hover,
        .expanded-row-highlight:hover {
          background-color: #D0E0F5 !important;
        }
        .ag-row-group-expanded .ag-cell,
        .expanded-row-highlight .ag-cell {
          background-color: #E5EEFC !important;
        }
        .expanded-row-highlight.ag-row:hover {
          background-color: #D0E0F5 !important;
        }
      `}</style>
      <AgGridReact
        rowData={filteredRowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        // rowSelection={rowSelection}
        masterDetail={true}
        detailCellRenderer={ProfileAnalyticsDetailRenderer}
        detailRowAutoHeight={true}
        getRowClass={(params) => {
          if (params.node.expanded) {
            return 'expanded-row-highlight';
          }
          return '';
        }}
      />
    </div>
  );
};

export default Page;
