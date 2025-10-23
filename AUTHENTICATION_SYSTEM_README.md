# Authentication System Implementation

This document describes the implementation of the token-based authentication system as outlined in the requirements.

## Overview

The authentication system implements a secure token-based flow with the following components:

1. **Token Request**: Initial authentication with email/password
2. **Token Verification**: Validation of existing tokens
3. **JWT Token Management**: Low-span JWT tokens for API calls
4. **Cookie Management**: Secure storage of authentication tokens
5. **Token Expiration Handling**: Automatic refresh and fallback to login

## API Endpoints

### 1. Request Token
- **Endpoint**: `https://preview.keyforge.ai/RequestJWTToken/TokenProvider/requestToken`
- **Method**: POST
- **Purpose**: Initial authentication with email/password
- **Returns**: Access token for subsequent requests

### 2. Verify Token
- **Endpoint**: `https://preview.keyforge.ai/RequestJWTToken/TokenProvider/verifyToken`
- **Method**: POST
- **Purpose**: Validate existing access tokens
- **Returns**: Token validity status

### 3. Request JWT Token
- **Endpoint**: `https://preview.keyforge.ai/RequestJWTToken/TokenProvider/requestJWTToken`
- **Method**: POST
- **Purpose**: Get low-span JWT token for API calls
- **Returns**: JWT token for authenticated requests

## Authentication Flow

### Login Process

1. **User submits credentials** on login page
2. **Request Token** API is called with email/password
3. **Access token cookie** is set in browser
4. **UID tenant cookie** is set with user information
5. **Request JWT Token** API is called with access token
6. **JWT token cookie** is set for API authentication
7. **User is redirected** to dashboard

### Token Verification

1. **On page load**, system checks for access token cookie
2. **If token exists**, verify token API is called
3. **If verification succeeds**, user proceeds to dashboard
4. **If verification fails**, cookies are cleared and login page is shown

### Token Expiration Handling

1. **API requests** include JWT token in Authorization header
2. **If JWT token expires** (401 response), system attempts refresh
3. **Refresh process** calls request JWT token API with access token
4. **If refresh succeeds**, new JWT token is stored and request is retried
5. **If refresh fails**, all cookies are cleared and user is redirected to login

## File Structure

### Core Authentication Files

- **`lib/auth.ts`**: Core authentication functions and cookie management
- **`contexts/AuthContext.tsx`**: React context for authentication state
- **`app/login/page.tsx`**: Login page with token verification
- **`lib/api.ts`**: Enhanced API functions with authentication

### Key Functions

#### Cookie Management
```typescript
// Set secure cookies
setCookie(name: string, value: string, days: number)

// Get cookie values
getCookie(name: string): string | null

// Clear all authentication cookies
clearAllAuthCookies()
```

#### Authentication APIs
```typescript
// Request initial access token
requestToken(email: string, password: string): Promise<TokenResponse>

// Verify existing token
verifyToken(accessToken: string): Promise<VerifyTokenResponse>

// Request JWT token for API calls
requestJWTToken(accessToken: string): Promise<JWTTokenResponse>
```

#### Enhanced API Requests
```typescript
// Make authenticated API requests with automatic token refresh
apiRequestWithAuth<T>(url: string, options: RequestInit): Promise<T>
```

## Cookie Configuration

The system uses three main cookies:

1. **`accessToken`**: Primary authentication token
2. **`uidTenant`**: User and tenant information
3. **`jwtToken`**: Low-span token for API calls

All cookies are configured with:
- **Secure**: HTTPS only
- **SameSite**: Strict
- **Path**: Root path
- **Expiration**: 7 days (configurable)

## Security Features

### Token Security
- Tokens are stored in secure, HTTP-only cookies
- Automatic token refresh prevents session interruption
- Failed authentication clears all tokens and redirects to login

### API Security
- All API requests include JWT token in Authorization header
- Automatic retry mechanism for expired tokens
- Graceful fallback to login on authentication failure

### Cookie Security
- Secure flag prevents transmission over HTTP
- SameSite strict prevents CSRF attacks
- Automatic cleanup on authentication failure

## Usage Examples

### Making Authenticated API Calls

```typescript
import { apiRequestWithAuth } from '@/lib/auth';

// This will automatically handle token refresh
const data = await apiRequestWithAuth('/api/endpoint');
```

### Checking Authentication Status

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }
  
  return <Dashboard user={user} />;
}
```

### Manual Token Management

```typescript
import { 
  getCookie, 
  setCookie, 
  clearAllAuthCookies,
  COOKIE_NAMES 
} from '@/lib/auth';

// Check if user has valid tokens
const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);

// Clear all authentication data
clearAllAuthCookies();
```

## Error Handling

The system handles various error scenarios:

1. **Invalid credentials**: Returns to login with error message
2. **Token verification failure**: Clears cookies and redirects to login
3. **JWT token expiration**: Automatically refreshes token
4. **Refresh failure**: Clears all cookies and redirects to login
5. **Network errors**: Graceful error messages and retry mechanisms

## Integration with Existing Code

The authentication system is designed to be minimally invasive:

- **Existing API calls** can be gradually migrated to use `apiRequestWithAuth`
- **Authentication state** is managed through React context
- **Login page** automatically handles token verification
- **Protected routes** use the existing `AuthWrapper` component

## Testing

To test the authentication system:

1. **Login flow**: Submit credentials and verify token storage
2. **Token verification**: Refresh page and verify automatic login
3. **Token expiration**: Wait for token expiry and verify refresh
4. **Logout**: Clear cookies and verify redirect to login
5. **API calls**: Verify authenticated requests work correctly

## Configuration

The system can be configured by modifying constants in `lib/auth.ts`:

- **Cookie expiration**: Default 7 days
- **API endpoints**: Configurable base URLs
- **Token refresh**: Automatic retry logic
- **Error handling**: Customizable error messages

This implementation provides a robust, secure authentication system that handles all the requirements outlined in the specification.

