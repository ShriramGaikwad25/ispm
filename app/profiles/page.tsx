"use client";
import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "@/lib/ag-grid-setup";
import { ColDef, ICellRendererParams } from "ag-grid-enterprise";
import ActionButtons from "@/components/agTable/ActionButtons";
import Accordion from "@/components/Accordion";
import ChartComponent from "@/components/ChartComponent";

const Page = () => {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "profile",
        headerName: "Profile",
        flex: 4,
        cellRenderer: "agGroupCellRenderer",
      },
      { field: "users", headerName: "Users", type: "numberColumn", flex: 2 },
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
      { field: "lastUpdated", headerName: "Last Updated", flex: 2 },
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
  // const rowSelection = useMemo(() => {
  //   return {
  //     mode: "multiRow",
  //   };
  // }, []);

  const detailCellRendererParams = useMemo(() => {
    return {
      detailGridOptions: {
        columnDefs: [{ field: "info", headerName: "Detail Info", flex: 1 }],
        defaultColDef: {
          flex: 1,
        },
      },
      getDetailRowData: (params: any) => {
        params.successCallback([{ info: params.data.details }]);
      },
    };
  }, []);

  const rowData = [
    {
      profile: "Department = Engineering",
      users: 361,
      newGrants: 10,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Engineering & Title = Assistant Engineer",
      users: 6,
      newGrants: 1,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Engineering & Title = Engineer",
      users: 43,
      newGrants: 3,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile:
        "Department = Engineering & Title = Manager - Product Management",
      users: 13,
      newGrants: 6,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Engineering & Title = Senior Engineer",
      users: 85,
      newGrants: 8,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Engineering & Title = Technique Leader",
      users: 16,
      newGrants: 10,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Finance",
      users: 63,
      newGrants: 6,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
    {
      profile: "Department = Finance & Title = Senior Staff",
      users: 5,
      newGrants: 1,
      activeGrants: 0,
      lastUpdated: "6/18/24, 10:47 AM",
    },
    {
      profile: "Department = IT & Security",
      users: 85,
      newGrants: 2,
      activeGrants: 0,
      lastUpdated: "8/23/24, 10:29 AM",
    },
  ];

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
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        // rowSelection={rowSelection}
        masterDetail={true}
        detailCellRendererParams={detailCellRendererParams}

      />
    </div>
  );
};

export default Page;
