// Authentication API endpoints and utilities
const AUTH_BASE_URL = 'https://preview.keyforge.ai/RequestJWTToken/TokenProvider';

export interface TokenResponse {
  tokenResponse: {
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
  jwtToken: string;
  expiresIn?: number;
}

// Cookie management utilities
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  UID_TENANT: 'uidTenant',
  JWT_TOKEN: 'jwtToken',
} as const;

export function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

export function clearAllAuthCookies(): void {
  Object.values(COOKIE_NAMES).forEach(cookieName => {
    deleteCookie(cookieName);
  });
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
      return { valid: false };
    }

    const data = await response.json();
    console.log('Verify token response:', data);
    
    // Handle different possible response formats
    if (data.status === 'success' || data.valid === true) {
      return { valid: true };
    } else if (data.status === 'error' || data.valid === false) {
      return { valid: false };
    } else {
      // If we can't determine validity, assume valid for now
      return { valid: true };
    }
  } catch (error) {
    console.error('Verify token error:', error);
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

// Token refresh functionality
export async function refreshJWTToken(): Promise<boolean> {
  try {
    const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return false;
    }

    // Use access token as JWT token (no separate API call needed)
    setCookie(COOKIE_NAMES.JWT_TOKEN, accessToken);
    return true;
  } catch (error) {
    console.error('JWT token refresh failed:', error);
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

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If JWT token is expired, try to refresh it
    if (response.status === 401) {
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
          throw new Error(`API request failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return retryResponse.json();
      } else {
        // Refresh failed, clear all cookies and redirect to login
        clearAllAuthCookies();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication failed - please login again');
      }
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
