"use client";

import { BackButton } from "@/components/BackButton";
import ClientOnlyAgGrid from "@/components/ClientOnlyAgGrid";
import CustomPagination from "@/components/agTable/CustomPagination";

export default function GatewayGeneralSettings() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4"><BackButton /></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Gateway - General</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="ag-theme-alpine w-full">
            <ClientOnlyAgGrid
              rowData={[]}
              columnDefs={[
                { headerName: 'Setting', field: 'setting', flex: 1 },
                { headerName: 'Value', field: 'value', flex: 2 },
              ]}
              domLayout="autoHeight"
            />
          </div>
          <div className="mt-1">
            <CustomPagination totalItems={0} currentPage={1} totalPages={1} pageSize={10} onPageChange={()=>{}} />
          </div>
        </div>
      </div>
    </div>
  );
}


