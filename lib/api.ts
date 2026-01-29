import { LineItemDetail } from "@/types/lineItem";
import { PaginatedResponse, CertAnalyticsResponse } from "@/types/api";
import { string } from "yup";
import { apiRequestWithAuth, checkTokenExpiredError, getCookie, COOKIE_NAMES } from "./auth";
import { getOriginalFetch } from "./authFetch";

const BASE_URL = "https://preview.keyforge.ai/certification/api/v1/ACMECOM";

const BASE_URL2 = "https://preview.keyforge.ai/entities/api/v1/ACMECOM";

// Uses apiRequestWithAuth so JWT expire -> refresh via access token -> retry once; access token expire -> logout
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers as Record<string, string>),
    };

    return apiRequestWithAuth<T>(url.toString(), { ...options, headers });
  } catch (error) {
    throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// New authenticated API function
export async function fetchApiWithAuth<T>(
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

    return apiRequestWithAuth<T>(url.toString(), options);
  } catch (error) {
    throw new Error(`Authenticated API request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getCertifications<T>(
  reviewerId: string,
  pageSize?: number,
  pageNumber?: number
): Promise<{ certifications: PaginatedResponse<T>; analytics: CertAnalyticsResponse }> {
  // Call both APIs in parallel for better performance
  const [certifications, analytics] = await Promise.all([
    fetchApi<PaginatedResponse<T>>(`${BASE_URL}/getCertificationList/${reviewerId}`, pageSize, pageNumber),
    getCertAnalytics(reviewerId)
  ]);

  return {
    certifications,
    analytics
  };
}

export async function getCertAnalytics(
  reviewerId: string
): Promise<CertAnalyticsResponse> {
  const endpoint = `https://preview.keyforge.ai/certification/api/v1/ACMECOM/getCertAnalytics/${reviewerId}`;
  return fetchApi(endpoint);
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
  pageNumber?: number,
  filter?: string,
  retryCount: number = 0
): Promise<PaginatedResponse<T>> {
  if (!taskId && !all) {
    throw new Error("Either taskId or all must be provided");
  }
  const finalPart = all ? "All" : taskId!;
  let endpoint = `${BASE_URL}/getAccessDetails/${reviewerId}/${certId}/${finalPart}`;
  
  // Add filter as query parameter if provided
  if (filter) {
    const url = new URL(endpoint);
    url.searchParams.append("filter", filter);
    endpoint = url.toString();
  }
  
  return fetchApi(endpoint, pageSize, pageNumber);
}

export async function getLineItemDetails(
  reviewerId: string,
  certId: string,
  taskId: string,
  lineItemId: string,
  pageSize?: number,
  pageNumber?: number,
  /**
   * Optional filter expression, e.g. "action eq Reject" | "action eq Approve" | "action eq Pending"
   */
  filter?: string
): Promise<LineItemDetail[]> {
  const baseEndpoint = `${BASE_URL}/getLineItemDetails/${reviewerId}/${certId}/${taskId}/${lineItemId}`;
  const url = new URL(baseEndpoint);

  if (filter) {
    url.searchParams.append("filter", filter);
  }

  const response: { items?: LineItemDetail[] } = await fetchApi(
    url.toString(),
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

export async function getApplications(
reviewerId: string,
):Promise<void>{
  const endpoint = `${BASE_URL2}/getApplications/${reviewerId}`
  return fetchApi(endpoint)
}
  
export async function getGroupedAppOwnerDetails<T>(
  reviewerId: string,
  certId: string,
  pageSize?: number,
  pageNumber?: number,
  /**
   * Optional filter expression, e.g. "action eq Pending" | "action eq Approve" | "action eq Reject"
   */
  filter?: string
): Promise<PaginatedResponse<T>> {
  const baseEndpoint = `${BASE_URL}/getAPPOGroupByEntsCertDetails/${reviewerId}/${certId}`;
  const url = new URL(baseEndpoint);

  if (filter) {
    url.searchParams.append("filter", filter);
  }
  if (pageSize !== undefined) {
    url.searchParams.append("pageSize", pageSize.toString());
  }
  if (pageNumber !== undefined) {
    url.searchParams.append("pageNumber", pageNumber.toString());
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  return apiRequestWithAuth<PaginatedResponse<T>>(url.toString(), { headers });
}

export async function getAppAccounts(
reviewerId: string,
applicationinstanceid:string
):Promise<void>{
  const endpoint = `${BASE_URL2}/getAppAccounts/${reviewerId}/${applicationinstanceid}`
  return fetchApi(endpoint)
}

export async function getAppEntitlement(
reviewerId: string,
applicationinstanceid:string
):Promise<void>{
  const endpoint = `${BASE_URL2}/getAppEntitlements/${reviewerId}/${applicationinstanceid}`
  return fetchApi(endpoint)
}

export async function getAllRegisteredApps(
  reviewerId: string
): Promise<{ items: Array<{ applicationId: string; applicationName: string; scimurl: string; filter: string }>; executionStatus: string }> {
  const endpoint = `https://preview.keyforge.ai/entities/api/v1/ACMECOM/getAllRegisteredApp/${reviewerId}`;
  return fetchApi(endpoint);
}

export async function searchUsers(
  payload: { filter: string; applicationId: string; scimurl: string; applicationName: string }
): Promise<any> {
  const endpoint = `https://preview.keyforge.ai/entities/api/v1/ACMECOM/search/user`;
  return apiRequestWithAuth<any>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(payload),
  });
}

export async function getAPPOCertificationDetailsWithFilter<T>(
  reviewerId: string,
  certificationId: string,
  filter: string,
  pageSize?: number,
  pageNumber?: number
): Promise<PaginatedResponse<T>> {
  const endpoint = `https://preview.keyforge.ai/certification/api/v1/ACMECOM/getAPPOCertificationDetails/${reviewerId}/${certificationId}`;
  
  const url = new URL(endpoint);
  url.searchParams.append("filter", filter);
  if (pageSize !== undefined) {
    url.searchParams.append("pageSize", pageSize.toString());
  }
  if (pageNumber !== undefined) {
    url.searchParams.append("pageNumber", pageNumber.toString());
  }

  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  return apiRequestWithAuth<PaginatedResponse<T>>(url.toString(), { headers });
}

export async function getEntitlementDetails(
  appInstanceId: string,
  entitlementId: string
): Promise<any> {
  const endpoint = `https://preview.keyforge.ai/catalog/api/v1/ACMECOM/app/${appInstanceId}/entitlement/${entitlementId}`;
  
  // Use apiRequestWithAuth to automatically handle token refresh and authentication
  return apiRequestWithAuth<any>(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}

export async function getCatalogEntitlements<T>(
  appInstanceId: string,
  reviewerId: string,

): Promise<T> {
  const endpoint = `https://preview.keyforge.ai/catalog/api/v1/ACMECOM/app/${appInstanceId}/entitlement`;
  
  const url = new URL(endpoint);
  url.searchParams.append("filter", `appownerid eq ${reviewerId}`);
  
  // Use apiRequestWithAuth to automatically handle token refresh and authentication
  return apiRequestWithAuth<T>(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}

export async function executeQuery<T>(
  query: string,
  parameters: string[]
): Promise<T> {
  const endpoint = "https://preview.keyforge.ai/entities/api/v1/ACMECOM/executeQuery";
  
  const payload = {
    query,
    parameters
  };

  // apiRequestWithAuth already handles token expiration and refresh internally
  const result = await apiRequestWithAuth<T>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  return result;
}

// Update campaign schedule
export async function updateCampaignSchedule(payload: {
  campaignName: string;
  campaignId: string;
  description: string;
  startDate: string;
  zoneId: string;
  runItOnce: string;
  neverEnds: string;
  endsOn?: string;
  enableStaging: string;
  frequency?: {
    period: string;
    periodValue: string;
  };
}): Promise<any> {
  const endpoint = "https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/updateschedule/campaign";
  
  // apiRequestWithAuth already handles token expiration and refresh internally
  const result = await apiRequestWithAuth<any>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "ISPM-Scheduler/1.0",
    },
    body: JSON.stringify(payload),
  });

  return result;
}

// Get all supported application types for registration
export async function getAllSupportedApplicationTypes(): Promise<any> {
  const endpoint = "https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/getAllSupportedObjects";
  return fetchApi(endpoint);
}

// Get all registered applications
export interface Application {
  ApplicationType: string;
  TenantID: string;
  ApplicationName: string;
  SCIMURL: string;
  APIToken: string;
  ApplicationID: string;
}

export interface GetAllApplicationsResponse {
  Applications: Application[];
  message?: string;
  status?: string;
}

export async function getAllApplications(): Promise<any> {
  const endpoint = "https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/getAllApplications";
  
  try {
    // Get access token for authentication
    const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Use Headers object to ensure accessToken is used (not JWT from global patch)
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    // Use original fetch (before JWT patch) to ensure accessToken is used, not JWT
    // This bypasses the global fetch patch that adds JWT tokens
    const fetchFn = typeof window !== 'undefined' ? getOriginalFetch() : fetch;
    
    // Make request with required headers for registerscimapp endpoints
    // Using original fetch ensures the Authorization header with accessToken is used
    // and won't be overridden by the global JWT patch
    const response = await fetchFn(endpoint, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check if error body contains token expired error
      try {
        const errorData = JSON.parse(errorText);
        if (await checkTokenExpiredError(errorData)) {
          throw new Error('Token Expired');
        }
      } catch (e) {
        // If parsing fails, continue with original error
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    // Check for token expired error in successful responses
    if (await checkTokenExpiredError(data)) {
      throw new Error('Token Expired');
    }
    
    console.log('getAllApplications response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
}

export async function regenerateApiToken(oldApiToken: string, applicationId: string): Promise<any> {
  const endpoint = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/regenerateToken/${applicationId}`;

  const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
  if (!accessToken) {
    throw new Error("No access token available");
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("Authorization", `Bearer ${accessToken}`);

  const fetchFn = typeof window !== "undefined" ? getOriginalFetch() : fetch;
  const response = await fetchFn(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ OldAPIToken: oldApiToken }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      if (await checkTokenExpiredError(errorData)) {
        throw new Error("Token Expired");
      }
    } catch (e) {
      // ignore parse errors
    }
    throw new Error(`Regenerate token failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (await checkTokenExpiredError(data)) {
    throw new Error("Token Expired");
  }
  return data;
}

export async function getApplicationDetails(applicationId: string, apiToken: string): Promise<any> {
  const endpoint = `https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/getApp/${applicationId}`;

  const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
  if (!accessToken) {
    throw new Error("No access token available");
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("Authorization", `Bearer ${accessToken}`);

  const fetchFn = typeof window !== "undefined" ? getOriginalFetch() : fetch;
  const response = await fetchFn(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ APIToken: apiToken || "" }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      if (await checkTokenExpiredError(errorData)) {
        throw new Error("Token Expired");
      }
    } catch (e) {
      // ignore parse errors
    }
    throw new Error(`Get application details failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (await checkTokenExpiredError(data)) {
    throw new Error("Token Expired");
  }
  return data;
}

// Get all applications for a user (AI Assist) - requires JWT in Authorization header
export async function getAllAppsForUserWithAI(loginId: string): Promise<any> {
  const encoded = encodeURIComponent(loginId);
  const endpoint = `https://preview.keyforge.ai/aiagentcontroller/api/v1/ACMECOM/getallapps/${encoded}`;
  // Use authenticated request to include JWT token
  return apiRequestWithAuth<any>(endpoint, { method: 'GET' });
}

// Client-safe proxy call (avoids CORS by using Next.js API route)
export async function getAllSupportedApplicationTypesViaProxy(): Promise<any> {
  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const res = await fetch(`/api/supported-objects`, { headers, cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Proxy fetch failed: ${res.status} ${res.statusText}\n${errorBody}`);
  }
  return res.json();
}

// Validate password for sign-off
export async function validatePassword(userName: string, password: string): Promise<boolean> {
  const endpoint = "https://preview.keyforge.ai/nativeusers/api/v1/ACMECOM/validatepassword";
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        userName,
        password,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // Check if error body contains token expired error
      try {
        const errorData = JSON.parse(errorBody);
        if (await checkTokenExpiredError(errorData)) {
          throw new Error('Token Expired');
        }
      } catch (e) {
        // If parsing fails, continue with original error
      }
      throw new Error(`Password validation failed: ${response.status} ${response.statusText}\n${errorBody}`);
    }

    const responseData = await response.json();
    // Check for token expired error in successful responses
    if (await checkTokenExpiredError(responseData)) {
      throw new Error('Token Expired');
    }
    
    // Response should be true or false
    return responseData === true || responseData === "true";
  } catch (error) {
    console.error('Password validation error:', error);
    throw error;
  }
}

// Sign off certification
export async function signOffCertification(
  reviewerId: string,
  certId: string,
  comments: string
): Promise<void> {
  const endpoint = `${BASE_URL}/signoff/${reviewerId}/${certId}`;
  
  return apiRequestWithAuth<void>(endpoint, {
    method: "POST",
    body: JSON.stringify({
      comments,
    }),
  });
}

// Schedule campaign template
export async function scheduleCampaign(payload: {
  campaignName: string;
  campaignId: string;
  description: string;
  startDate: string;
  zoneId: string;
  runItOnce: string;
  neverEnds: string;
  endsOn?: string;
  enableStaging: string;
  frequency?: {
    period: string;
    periodValue: string;
  };
}): Promise<any> {
  const endpoint = "https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/schedule/campaign";
  
  // apiRequestWithAuth already handles token expiration and refresh internally
  const result = await apiRequestWithAuth<any>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "ISPM-Scheduler/1.0",
    },
    body: JSON.stringify(payload),
  });

  return result;
}