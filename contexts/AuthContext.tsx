'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  requestToken, 
  verifyToken, 
  requestJWTToken,
  generateJWTToken,
  extractJWTToken,
  isAuthenticated, 
  getCurrentUser, 
  clearAllAuthCookies,
  setCookie,
  getCookie,
  COOKIE_NAMES,
  forceLogout
} from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (userid: string, password: string) => Promise<boolean>;
  logout: () => void;
  user: { email: string; tenantId?: string } | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; tenantId?: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
        const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
        console.log('AuthContext: Access token found:', !!accessToken);
        console.log('AuthContext: JWT token found:', !!jwtToken);
        
        if (accessToken && jwtToken) {
          // Verify that the access token is still valid
          console.log('AuthContext: Both tokens found, verifying access token');
          const verificationResult = await verifyToken(accessToken);
          
          if (verificationResult.valid) {
            console.log('AuthContext: Token verification successful, setting authenticated');
            setIsAuthenticated(true);
            const currentUser = getCurrentUser();
            setUser(currentUser);
          } else {
            // Token verification failed - logout will be handled by verifyToken
            console.log('AuthContext: Token verification failed');
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          console.log('AuthContext: Missing tokens, not authenticated');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAllAuthCookies();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = async (userid: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('AuthContext: Starting login process');
      // Step 1: Request access token
      const tokenResponse = await requestToken(userid, password);
      console.log('AuthContext: Token response received:', tokenResponse);
      
      // Step 2: Set access token (master token) and UID tenant cookies
      // The access token is a long-lived token used to generate new JWT tokens when they expire
      const accessToken = tokenResponse.tokenResponse.accessToken;
      const userUniqueID = tokenResponse.tokenResponse.userUniqueID;
      const userAdminRoles = tokenResponse.tokenResponse.userAdminRoles;
      setCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken);
      setCookie(COOKIE_NAMES.UID_TENANT, JSON.stringify({ userid, tenantId: 'ACMECOM' }));
      // Store userUniqueID as reviewerId for use throughout the application
      if (userUniqueID) {
        setCookie(COOKIE_NAMES.REVIEWER_ID, userUniqueID);
        console.log('AuthContext: Reviewer ID (userUniqueID) cookie set:', userUniqueID);
      }
      // Store userAdminRoles for use throughout the application
      if (userAdminRoles) {
        setCookie(COOKIE_NAMES.USER_ADMIN_ROLES, userAdminRoles);
        console.log('AuthContext: User Admin Roles cookie set:', userAdminRoles);
      }
      console.log('AuthContext: Access token (master token) cookie set');
      
      // Step 3: Generate short-lived JWT token using the new API endpoint
      // This JWT token is used for API calls and will be refreshed using the access token
      const jwtResponse = await generateJWTToken(accessToken);
      console.log('AuthContext: JWT token response received:', jwtResponse);
      
      // Extract JWT token from response (handle different possible response formats)
      const jwtToken = extractJWTToken(jwtResponse);
      
      if (!jwtToken) {
        console.error('AuthContext: JWT token not found in response');
        // Logout will be handled by generateJWTToken if it detects failure
        forceLogout('JWT token not found in response');
        throw new Error('Failed to generate JWT token');
      }
      
      setCookie(COOKIE_NAMES.JWT_TOKEN, jwtToken);
      console.log('AuthContext: JWT token (for API calls) cookie set');
      
      // Update auth state
      setIsAuthenticated(true);
      setUser({ email: userid, tenantId: 'ACMECOM' });
      console.log('AuthContext: Authentication state updated');
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      clearAllAuthCookies();
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAllAuthCookies();
    setIsAuthenticated(false);
    setUser(null);
  };

  // Don't render children until auth state is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}