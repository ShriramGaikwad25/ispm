'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  requestToken, 
  verifyToken, 
  requestJWTToken, 
  isAuthenticated, 
  getCurrentUser, 
  clearAllAuthCookies,
  setCookie,
  getCookie,
  COOKIE_NAMES
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
          // For now, assume authenticated if both tokens exist
          console.log('AuthContext: Both tokens found, setting authenticated');
          setIsAuthenticated(true);
          const currentUser = getCurrentUser();
          setUser(currentUser);
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
      
      // Step 2: Set access token and UID tenant cookies
      setCookie(COOKIE_NAMES.ACCESS_TOKEN, tokenResponse.tokenResponse.accessToken);
      setCookie(COOKIE_NAMES.UID_TENANT, JSON.stringify({ userid, tenantId: 'ACMECOM' }));
      console.log('AuthContext: Access token cookie set');
      
      // Step 3: Use access token as JWT token (no separate JWT request)
      setCookie(COOKIE_NAMES.JWT_TOKEN, tokenResponse.tokenResponse.accessToken);
      console.log('AuthContext: JWT token cookie set');
      
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