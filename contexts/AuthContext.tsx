'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  requestToken, 
  verifyToken, 
  getCurrentUser, 
  clearAllAuthCookies,
  getCookie,
  COOKIE_NAMES,
  fetchApplicationAuthType,
  getCachedApplicationAuthType,
  getPersistedAuthType,
  isOAuthApplicationAuth,
  getOAuthRequestUrl,
  getOAuthCallbackParamsFromUrl,
  clearOAuthCallbackParamsFromUrl,
  completeOAuthCallback,
  establishAuthenticatedSession,
  hasOAuthRedirectBeenAttempted,
  markOAuthRedirectAttempted,
  clearOAuthRedirectAttempted,
  syncKeyforgeOAuthSession,
  getOAuthTokensFromUrl,
  clearOAuthTokensFromUrl,
  hasReadableAuthCookies,
  AUTH_SESSION_KEYS,
} from '@/lib/auth';
import { tenantId } from '@/lib/config';
import { ensureAuthFetchPatched } from '@/lib/authFetch';
import { clearJitAccessHistoryStore } from '@/lib/jitAccessHistoryStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (userid: string, password: string) => Promise<boolean>;
  logout: () => void;
  user: { email: string; tenantId?: string } | null;
  isLoading: boolean;
  authType: string | null;
  isOAuthRedirecting: boolean;
  isCompletingOAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; tenantId?: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState<string | null>(null);
  const [isOAuthRedirecting, setIsOAuthRedirecting] = useState(false);
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(false);
  const initStartedRef = useRef(false);

  // Patch global fetch once on the client so every request carries the JWT token
  ensureAuthFetchPatched();

  const restoreAuthenticatedSession = async (): Promise<boolean> => {
    const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
    const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
    if (!jwtToken && !accessToken) return false;

    const verificationResult = await verifyToken(accessToken ?? undefined);
    if (!verificationResult.valid) {
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    setIsAuthenticated(true);
    const currentUser = getCurrentUser() as { email?: string; userid?: string; tenantId?: string } | null;
    const email = currentUser?.email ?? currentUser?.userid ?? '';
    setUser({ email, tenantId: currentUser?.tenantId ?? tenantId });
    const persistedAuthType = getPersistedAuthType();
    if (persistedAuthType) {
      setAuthType(persistedAuthType.trim().toUpperCase());
    }
    return true;
  };

  const finishAuthenticatedUser = (email: string) => {
    setIsAuthenticated(true);
    setUser({ email, tenantId });
    clearOAuthRedirectAttempted();
    sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
  };

  // Resolve auth mode once per app load; cache applicationType for the session
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const initializeAuth = async () => {
      let redirectingToOAuth = false;

      try {
        const oauthCallback = getOAuthCallbackParamsFromUrl();
        if (oauthCallback) {
          setIsCompletingOAuth(true);
          try {
            console.log('AuthContext: completing OAuth callback');
            const tokens = await completeOAuthCallback(
              oauthCallback.code,
              oauthCallback.state
            );
            await establishAuthenticatedSession(tokens);
            clearOAuthCallbackParamsFromUrl();
            sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
            clearOAuthRedirectAttempted();
            finishAuthenticatedUser(tokens.userid ?? tokens.userUniqueID ?? '');
            setAuthType('OAUTH');
            if (
              window.location.pathname === '/login' ||
              window.location.pathname.startsWith('/oauth/callback') ||
              window.location.search.includes('code=')
            ) {
              window.location.replace('/');
            }
            return;
          } catch (oauthError) {
            console.error('AuthContext: OAuth callback failed:', oauthError);
            clearOAuthCallbackParamsFromUrl();
            sessionStorage.setItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED, '1');
            setAuthType('OAUTH');
          } finally {
            setIsCompletingOAuth(false);
          }
        }

        const urlTokens = getOAuthTokensFromUrl();
        if (urlTokens?.accessToken || urlTokens?.jwtToken) {
          setIsCompletingOAuth(true);
          try {
            await establishAuthenticatedSession({
              accessToken: urlTokens.accessToken,
              jwtToken: urlTokens.jwtToken,
              userid: urlTokens.userid,
            });
            clearOAuthTokensFromUrl();
            finishAuthenticatedUser(urlTokens.userid ?? '');
            setAuthType('OAUTH');
            if (window.location.pathname === '/login') {
              window.location.replace('/');
            }
            return;
          } catch (urlTokenError) {
            console.error('AuthContext: URL token import failed:', urlTokenError);
            clearOAuthTokensFromUrl();
          } finally {
            setIsCompletingOAuth(false);
          }
        }

        if (hasReadableAuthCookies()) {
          await restoreAuthenticatedSession();
          return;
        }

        // Keyforge OAuth sets HttpOnly cookies on .keyforge.ai — import into app-readable cookies
        if (hasOAuthRedirectBeenAttempted() || getPersistedAuthType()?.toUpperCase() === 'OAUTH') {
          setIsCompletingOAuth(true);
          try {
            const synced = await syncKeyforgeOAuthSession();
            if (synced) {
              await restoreAuthenticatedSession();
              setAuthType('OAUTH');
              if (window.location.pathname === '/login') {
                window.location.replace('/');
              }
              return;
            }
          } finally {
            setIsCompletingOAuth(false);
          }
        }

        const appAuth =
          getCachedApplicationAuthType() ?? (await fetchApplicationAuthType());
        const resolvedAuthType = String(appAuth.AuthType ?? '').trim().toUpperCase() || 'LOCAL';
        setAuthType(resolvedAuthType);
        console.log('AuthContext: applicationType resolved:', resolvedAuthType, appAuth.AuthMethod);

        const oauthUrl = getOAuthRequestUrl(appAuth);
        const oauthCallbackFailed =
          sessionStorage.getItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED) === '1';
        if (
          isOAuthApplicationAuth(appAuth) &&
          oauthUrl &&
          !getOAuthCallbackParamsFromUrl() &&
          !oauthCallbackFailed &&
          !hasOAuthRedirectBeenAttempted()
        ) {
          console.log('AuthContext: OAuth tenant — redirecting to provider');
          redirectingToOAuth = true;
          markOAuthRedirectAttempted();
          setIsOAuthRedirecting(true);
          window.location.assign(oauthUrl);
          return;
        }

        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthType(getPersistedAuthType()?.trim().toUpperCase() || 'LOCAL');
        await restoreAuthenticatedSession();
      } finally {
        setIsCompletingOAuth(false);
        if (!redirectingToOAuth) {
          setIsInitialized(true);
        }
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

      const { accessToken, userUniqueID, userAdminRoles } = tokenResponse.tokenResponse;
      await establishAuthenticatedSession({
        accessToken,
        userUniqueID,
        userAdminRoles,
        userid,
      });

      setIsAuthenticated(true);
      setUser({ email: userid, tenantId });
      clearOAuthRedirectAttempted();
      sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
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
    clearJitAccessHistoryStore();
    setIsAuthenticated(false);
    setUser(null);
  };

  // Don't render children until auth state is initialized (or OAuth redirect is in progress)
  if (!isInitialized || isOAuthRedirecting || isCompletingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isCompletingOAuth
              ? 'Completing sign in...'
              : isOAuthRedirecting
                ? 'Redirecting to sign in...'
                : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        user,
        isLoading,
        authType,
        isOAuthRedirecting,
        isCompletingOAuth,
      }}
    >
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