import { LineItemDetail } from "@/types/lineItem";
import { PaginatedResponse } from "@/types/api";

const BASE_URL = "https://preview.keyforge.ai/certification/api/v1/CERTTEST";

export async function fetchApi<T>(
  endpoint: string,
  pageSize?: number,
  pageNumber?: number,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = new URL(endpoint);

    if (pageSize !== undefined) {
      url.searchParams.append("pageSize", pageSize.toString());
    }

    if (pageNumber !== undefined) {
      url.searchParams.append("pageNumber", pageNumber.toString());
    }

    const headers = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...options.headers,
    };

    const res = await fetch(url.toString(), { ...options, headers });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `Fetch failed: ${res.status} ${res.statusText}\n${errorBody}`
      );
    }

    return res.json();
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

export async function getCertifications<T>(
  reviewerId: string,
  pageSize?: number,
  pageNumber?: number
): Promise<PaginatedResponse<T>> {
  const endpoint = `${BASE_URL}/getCertificationList/${reviewerId}`;
  return fetchApi(endpoint, pageSize, pageNumber);
}

export async function getCertificationDetails<T>(
  reviewerId: string,
  certId: string,
  pageSize?: number,
  pageNumber?: number
): Promise<PaginatedResponse<T>> {
  const endpoint = `${BASE_URL}/getCertificationDetails/${reviewerId}/${certId}`;
  return fetchApi(endpoint, pageSize, pageNumber);
}

export async function getAccessDetails<T>(
  reviewerId: string,
  certId: string,
  taskId?: string,
  all?: string,
  pageSize?: number,
  pageNumber?: number
): Promise<PaginatedResponse<T>> {
  if (!taskId && !all) {
    throw new Error("Either taskId or all must be provided");
  }
  const finalPart = all ? "All" : taskId!;
  const endpoint = `${BASE_URL}/getAccessDetails/${reviewerId}/${certId}/${finalPart}`;
  return fetchApi(endpoint, pageSize, pageNumber);
}

export async function getLineItemDetails(
  reviewerId: string,
  certId: string,
  taskId: string,
  lineItemId: string,
  pageSize?: number,
  pageNumber?: number
): Promise<LineItemDetail[]> {
  const endpoint = `${BASE_URL}/getLineItemDetails/${reviewerId}/${certId}/${taskId}/${lineItemId}`;
  const response: { items?: LineItemDetail[] } = await fetchApi(
    endpoint,
    pageSize,
    pageNumber
  );

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;

  return [];
}

interface UpdateActionPayload {
  useraction?: Array<{ userId: string; actionType: "Approve" | "Reject"; justification: string }>;
  accountAction?: Array<{ lineItemId: string; actionType: "Approve" | "Reject"; justification: string }>;
  entitlementAction?: Array<{ lineItemIds: string[]; actionType: "Approve" | "Reject"; justification: string }>;
}

export async function updateAction(
  reviewerId: string,
  certId: string,
  payload: UpdateActionPayload
): Promise<void> {
  const endpoint = `${BASE_URL}/updateAction/${reviewerId}/${certId}`;
  await fetchApi(endpoint, undefined, undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAppOwnerDetails<T>(
  reviewerId: string,
  certId: string,
  pageSize?: number,
  pageNumber?: number
): Promise<PaginatedResponse<T>> {
  const endpoint = `${BASE_URL}/getAPPOCertificationDetails/${reviewerId}/${certId}`;
  return fetchApi(endpoint, pageSize, pageNumber);
}