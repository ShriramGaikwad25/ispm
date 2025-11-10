// Authentication API endpoints and utilities
const AUTH_BASE_URL = 'https://preview.keyforge.ai/RequestJWTToken/TokenProvider';

export interface TokenResponse {
  tokenResponse: {
    userUniqueID: string;
    userAdminRoles: string;
    accessToken: string;
    statusMessage: string;
    status: string;
  };
  statusMessage: string;
  status: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  expiresAt?: number;
  userId?: string;
  tenantId?: string;
}

export interface JWTTokenResponse {
  jwtToken?: string;
  token?: string;
  tokenResponse?: {
    jwtToken?: string;
    token?: string;
  };
  data?: {
    jwtToken?: string;
    token?: string;
  };
  expiresIn?: number;
}

// Cookie management utilities
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',  // Master token - long-lived, used to generate new JWT tokens
  UID_TENANT: 'uidTenant',      // User information (userid, tenantId)
  JWT_TOKEN: 'jwtToken',        // Short-lived JWT token - used for API calls in Authorization header
  REVIEWER_ID: 'reviewerId',    // User unique ID used as reviewerId throughout the application
  USER_ADMIN_ROLES: 'userAdminRoles',  // User admin roles from the token response
} as const;

export function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Encode the value to handle special characters
  const encodedValue = encodeURIComponent(value);
  
  // Build cookie string with security attributes
  // Use secure flag only in production (HTTPS)
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? ';secure' : '';
  
  // Set cookie with proper attributes
  document.cookie = `${name}=${encodedValue};expires=${expires.toUTCString()};path=/;samesite=strict${secureFlag}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      // Decode the value to handle special characters
      const value = c.substring(nameEQ.length, c.length);
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  // Set cookie with expired date to delete it
  // Also clear for both secure and non-secure contexts
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;`;
}

export function clearAllAuthCookies(): void {
  Object.values(COOKIE_NAMES).forEach(cookieName => {
    deleteCookie(cookieName);
  });
}

// Force logout when tokens fail - clears cookies and redirects to login
export function forceLogout(reason?: string): void {
  console.error('🚨 FORCE LOGOUT TRIGGERED 🚨:', reason || 'Token verification/generation failed');
  
  // Clear cookies first
  try {
    clearAllAuthCookies();
    console.log('Cookies cleared');
  } catch (e) {
    console.error('Error clearing cookies:', e);
  }
  
  // Redirect to login page immediately - use multiple methods to ensure redirect
  if (typeof window !== 'undefined') {
    console.log('Redirecting to login page...');
    try {
      // Method 1: Use replace (doesn't add to history)
      window.location.replace('/login');
    } catch (e) {
      console.error('Replace failed, trying href:', e);
      try {
        // Method 2: Use href
        window.location.href = '/login';
      } catch (e2) {
        console.error('Href failed, trying assign:', e2);
        // Method 3: Use assign
        window.location.assign('/login');
      }
    }
    
    // Fallback: Force redirect after a short delay if still not redirected
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        console.error('Still not on login page, forcing redirect again');
        window.location.href = '/login';
      }
    }, 50);
  }
}

// API functions
export async function requestToken(userid: string, password: string): Promise<TokenResponse> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/requestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestToken: {
          registeredAppName: "ACMECOM",
          userid: userid,
          password: password
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check if the response indicates a failed status
    if (data.status === 'failed' || data.status === 'error' || 
        data.tokenResponse?.status === 'failed' || data.tokenResponse?.status === 'error') {
      throw new Error(`Token request returned failed status: ${data.statusMessage || 'Authentication failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error('Request token error:', error);
    throw error;
  }
}

export async function verifyToken(accessToken: string): Promise<VerifyTokenResponse> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/verifyToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registeredAppName: "ACMECOM",
        accessToken: accessToken
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token verification failed:', response.status, errorText);
      forceLogout(`Token verification failed with status ${response.status}`);
      return { valid: false };
    }

    const data = await response.json();
    console.log('Verify token response:', data);
    
    // Handle different possible response formats
    if (data.status === 'success' || data.valid === true) {
      return { valid: true };
    } else if (data.status === 'error' || data.valid === false || data.status === 'failed') {
      // Token verification failed
      forceLogout('Token verification returned failed status');
      return { valid: false };
    } else {
      // If we can't determine validity, assume valid for now
      return { valid: true };
    }
  } catch (error) {
    console.error('Verify token error:', error);
    forceLogout('Token verification error occurred');
    return { valid: false };
  }
}

export async function requestJWTToken(accessToken: string): Promise<JWTTokenResponse> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/requestJWTToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registeredAppName: "ACMECOM",
        accessToken: accessToken
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JWT token request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Request JWT token error:', error);
    throw error;
  }
}

// Helper function to extract JWT token from response
export function extractJWTToken(jwtResponse: JWTTokenResponse): string | null {
  return jwtResponse.jwtToken 
    || jwtResponse.token 
    || jwtResponse.tokenResponse?.jwtToken 
    || jwtResponse.tokenResponse?.token
    || jwtResponse.data?.jwtToken
    || jwtResponse.data?.token
    || null;
}

// Generate JWT token using the new authservice API
export async function generateJWTToken(accessToken: string): Promise<JWTTokenResponse> {
  try {
    const response = await fetch('https://preview.keyforge.ai/authservice/api/v1/ACMECOM/generateJWTToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JWT token generation failed:', response.status, errorText);
      forceLogout(`JWT token generation failed with status ${response.status}`);
      throw new Error(`JWT token generation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check if the response indicates a failed status
    if (data.status === 'failed' || data.status === 'error' || data.valid === false) {
      forceLogout('JWT token generation returned failed status');
      throw new Error('JWT token generation returned failed status');
    }
    
    return data;
  } catch (error) {
    console.error('Generate JWT token error:', error);
    // Don't force logout again if it was already called
    if (!(error instanceof Error && error.message.includes('JWT token generation'))) {
      forceLogout('JWT token generation error occurred');
    }
    throw error;
  }
}

// Token refresh functionality
export async function refreshJWTToken(): Promise<boolean> {
  try {
    const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      forceLogout('Access token not found during refresh');
      return false;
    }

    // Generate new JWT token using the access token
    const jwtResponse = await generateJWTToken(accessToken);
    
    // Extract JWT token from response (handle different possible response formats)
    const jwtToken = extractJWTToken(jwtResponse);
    
    if (!jwtToken) {
      console.error('JWT token not found in response');
      forceLogout('JWT token not found in refresh response');
      return false;
    }

    // Save the new JWT token to cookie
    setCookie(COOKIE_NAMES.JWT_TOKEN, jwtToken);
    return true;
  } catch (error) {
    console.error('JWT token refresh failed:', error);
    // generateJWTToken already handles logout on failure
    return false;
  }
}

// Enhanced API request with automatic token refresh
export async function apiRequestWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
  
  if (!jwtToken) {
    throw new Error('No JWT token available');
  }

  // For GET requests, don't include Content-Type header (some servers reject it)
  const isGetRequest = (options.method || 'GET').toUpperCase() === 'GET';
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${jwtToken}`,
    ...(options.headers as Record<string, string>),
  };

  // Only add Content-Type for non-GET requests
  if (!isGetRequest && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If JWT token is expired or unauthorized, try to refresh it
    if (response.status === 401 || response.status === 403) {
      const refreshSuccess = await refreshJWTToken();
      
      if (refreshSuccess) {
        // Retry the request with the new token
        const newJwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${newJwtToken}`,
        };

        const retryResponse = await fetch(url, {
          ...options,
          headers: newHeaders,
        });

        if (!retryResponse.ok) {
          // If retry still fails, logout
          if (retryResponse.status === 401 || retryResponse.status === 403) {
            forceLogout(`API request failed with status ${retryResponse.status} after token refresh`);
            throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        // Check retry response for error status
        const retryText = await retryResponse.text();
        let retryData: any;
        
        try {
          retryData = JSON.parse(retryText);
        } catch (e) {
          console.error('Failed to parse retry response as JSON');
          throw new Error('Invalid retry response format');
        }
        
        // Check if retry response has error status
        if (retryData && typeof retryData === 'object') {
          const retryStatus = retryData.status || retryData.Status || retryData.STATUS;
          if (retryStatus !== undefined && retryStatus !== null) {
            const retryStatusStr = String(retryStatus).toLowerCase().trim();
            console.log('Checking retry response status:', retryStatusStr);
            if (retryStatusStr === 'error' || retryStatusStr === 'failed' || retryStatusStr === 'unauthorized') {
              console.error('Retry response has error status, logging out');
              forceLogout(`JWT token status is ${retryStatusStr} in retry response`);
              throw new Error(`JWT token status is ${retryStatusStr}`);
            }
          }
          
          // Also check for error field in retry response
          if (retryData.error || retryData.Error) {
            console.error('Retry response contains error field, logging out');
            forceLogout('JWT token retry response contains error');
            throw new Error('JWT token retry response contains error');
          }
        }
        
        return retryData;
      } else {
        // Refresh failed - logout already handled in refreshJWTToken
        throw new Error('Authentication failed - please login again');
      }
    }

    if (!response.ok) {
      // Get error details from response body
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        }
      } catch (e) {
        // If we can't read the error body, use the default message
      }
      
      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        forceLogout(`API request failed with status ${response.status}`);
      }
      
      throw new Error(errorMessage);
    }

    // First, read response as text to check for error status before parsing
    const responseText = await response.clone().text();
    console.log('Raw API Response text (first 500 chars):', responseText.substring(0, 500));
    
    // Check raw text for error indicators
    const textLower = responseText.toLowerCase();
    if (textLower.includes('"status":"error"') || 
        textLower.includes('"status":"failed"') || 
        textLower.includes('"status": "error"') ||
        textLower.includes('"status": "failed"') ||
        textLower.includes('"status":\'error\'') ||
        textLower.includes('"status":\'failed\'')) {
      console.error('🚨 ERROR STATUS DETECTED IN RAW TEXT - FORCING LOGOUT 🚨');
      clearAllAuthCookies();
      forceLogout('Error status detected in raw response text');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Error status detected in response');
    }
    
    // Parse response as JSON - handle any type issues
    try {
      const data = JSON.parse(responseText);
      
      // Log the response for debugging
      console.log('API Response received:', data);
      console.log('Response structure:', {
        hasApplications: !!data?.Applications,
        applicationsType: typeof data?.Applications,
        isArray: Array.isArray(data?.Applications),
        hasStatus: 'status' in data,
        statusType: typeof data?.status,
        statusValue: data?.status
      });
      
      // Check if JWT token status is error - logout if so (must happen before returning)
      // Check multiple possible locations for status field
      console.log('Checking JWT response for error status. Full data:', JSON.stringify(data, null, 2));
      
      if (data && typeof data === 'object') {
        // Check status in multiple possible locations
        const status = data.status || data.Status || data.STATUS || 
                      (data.response && data.response.status) ||
                      (data.data && data.data.status) ||
                      (data.tokenResponse && data.tokenResponse.status);
        
        if (status !== undefined && status !== null) {
          const statusStr = String(status).toLowerCase().trim();
          console.log('JWT Status found:', statusStr, 'Type:', typeof status);
          
          if (statusStr === 'error' || statusStr === 'failed' || statusStr === 'unauthorized') {
            console.error('!!! JWT TOKEN STATUS IS ERROR - FORCING LOGOUT !!!');
            // Clear cookies immediately
            clearAllAuthCookies();
            // Force logout immediately - this will redirect
            forceLogout(`JWT token status is ${statusStr}`);
            // Use a synchronous redirect to ensure it happens
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            // Don't continue - redirect should happen
            throw new Error(`JWT token status is ${statusStr}`);
          }
        }
        
        // Also check for error message or error field
        if (data.error || data.Error || data.message === 'error' || data.message === 'failed') {
          console.error('!!! JWT TOKEN RESPONSE CONTAINS ERROR - FORCING LOGOUT !!!');
          clearAllAuthCookies();
          forceLogout('JWT token response contains error');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('JWT token response contains error');
        }
        
        // Check response message for error indicators
        const message = data.message || data.Message || data.errorMessage || data.error_message;
        if (message && typeof message === 'string') {
          const msgLower = message.toLowerCase();
          if (msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('invalid') || msgLower.includes('unauthorized')) {
            console.error('!!! JWT TOKEN MESSAGE INDICATES ERROR - FORCING LOGOUT !!!');
            clearAllAuthCookies();
            forceLogout(`JWT token message indicates error: ${message}`);
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            throw new Error(`JWT token message indicates error: ${message}`);
          }
        }
      }
      
      // Return as any to avoid type checking issues - don't validate structure
      return data as any;
    } catch (parseError) {
      // If JSON parsing fails, try to get the text response
      console.error('JSON parse error:', parseError);
      
      // Check if this is a status error that we threw
      if (parseError instanceof Error && parseError.message.includes('JWT token status')) {
        // Force logout was already called, just re-throw
        throw parseError;
      }
      
      try {
        const text = await response.text();
        console.error('Raw response text:', text.substring(0, 500));
        
        // Check if the text contains status error
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            const status = parsed.status;
            if (status !== undefined && status !== null) {
              const statusStr = String(status).toLowerCase();
              if (statusStr === 'error' || statusStr === 'failed') {
                console.error('JWT token status is error/failed in text response, logging out');
                forceLogout(`JWT token status is ${statusStr}`);
                throw new Error(`JWT token status is ${statusStr}`);
              }
            }
          }
        } catch {}
        
        const parsed = JSON.parse(text);
        return parsed as any;
      } catch (e) {
        console.error('Failed to parse as text or JSON:', e);
        throw new Error(`Invalid JSON response: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Check if user is authenticated based on cookies
export function isAuthenticated(): boolean {
  const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
  const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
  return !!(accessToken && jwtToken);
}

// Get current user info from cookies
export function getCurrentUser(): { email?: string; tenantId?: string } | null {
  const uidTenant = getCookie(COOKIE_NAMES.UID_TENANT);
  if (!uidTenant) return null;
  
  try {
    return JSON.parse(uidTenant);
  } catch {
    return null;
  }
}

// Get reviewerId (userUniqueID) from cookies
export function getReviewerId(): string | null {
  return getCookie(COOKIE_NAMES.REVIEWER_ID);
}

// Get userAdminRoles from cookies
export function getUserAdminRoles(): string | null {
  return getCookie(COOKIE_NAMES.USER_ADMIN_ROLES);
}
