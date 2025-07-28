"use client";

import { ColDef, GridApi } from "ag-grid-enterprise";
import ActionButtons from "../agTable/ActionButtons";

export const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
};

interface CertificationData {
  certificationType: string;
  reviewerId: string;
  certificationCreatedOn: string;
  certificationExpiration: string;
  status: string;
  certificationSignedOff: string;
  certificateRequester: string;
  percentageCompleted: number;
  totalActions: number;
  totalActionsCompleted: number;
}

interface ActionCellRendererParams {
  api: GridApi;
  data: CertificationData;
}

export const columnDefs: ColDef[] = [
  { headerName: "Certification Type", field: "certificationType" },
  { headerName: "Reviewer ID", field: "reviewerId" },
  { headerName: "Created On", field: "certificationCreatedOn" },
  { headerName: "Expiration", field: "certificationExpiration" },
  { headerName: "Status", field: "status" },
  { headerName: "Signed Off", field: "certificationSignedOff" },
  { headerName: "Requester", field: "certificateRequester" },
  { headerName: "Completed %", field: "percentageCompleted" },
  { headerName: "Total Actions", field: "totalActions" },
  { headerName: "Actions Completed", field: "totalActionsCompleted" },
  {
    headerName: "Actions",
    width: 200,
    cellRenderer: (params: ActionCellRendererParams) => (
      <ActionButtons api={params.api} selectedRows={[params.data]} />
    ),
  },
];
