'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  requestToken, 
  clearAllAuthCookies,
  getCookie,
  COOKIE_NAMES,
  fetchApplicationAuthType,
  isLocalApplicationAuth,
  usesExternalAuthFlow,
  getApplicationAuthType,
  getOAuthRequestUrl,
  getOAuthCallbackParamsFromUrl,
  clearOAuthCallbackParamsFromUrl,
  completeOAuthCallback,
  establishAuthenticatedSession,
  restoreSessionFromCookies,
  getPersistedAuthType,
  normalizeAuthCookiesFromBrowser,
  fetchServerSession,
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

  // Patch global fetch once on the client so every request carries the JWT token
  ensureAuthFetchPatched();

  // Resolve auth mode on startup, then restore session or redirect to OAuth
  useEffect(() => {
    const initializeAuth = async () => {
      let redirectingToOAuth = false;

      try {
        normalizeAuthCookiesFromBrowser();
        const oauthCallback = getOAuthCallbackParamsFromUrl();
        const serverSession = await fetchServerSession();
        const hasClientSession = !!(
          getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN)
        );
        const hasSession = serverSession.authenticated || hasClientSession;

        // Cookies already present (SSO return or refresh): trust them — no verifyToken
        if (hasSession) {
          const resolvedAuthType =
            oauthCallback || getPersistedAuthType() === 'OAUTH' || serverSession.authenticated
              ? getPersistedAuthType() && getPersistedAuthType() !== 'LOCAL'
                ? getPersistedAuthType()!
                : 'OAUTH'
              : getPersistedAuthType() ?? 'LOCAL';

          console.log('AuthContext: restoring session from existing cookies');
          if (oauthCallback) clearOAuthCallbackParamsFromUrl();

          setAuthType(resolvedAuthType);
          const session = restoreSessionFromCookies();
          const email = String(
            serverSession.user?.email ??
              serverSession.user?.userid ??
              session.user?.email ??
              ''
          ).trim();
          setIsAuthenticated(true);
          setUser({
            email,
            tenantId: serverSession.user?.tenantId ?? session.user?.tenantId ?? tenantId,
          });
          sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);

          if (
            oauthCallback ||
            window.location.pathname === '/login' ||
            window.location.pathname.startsWith('/oauth/callback')
          ) {
            window.location.replace('/');
          }
          return;
        }

        const appAuth = await fetchApplicationAuthType();
        const resolvedAuthType = getApplicationAuthType(appAuth);
        setAuthType(resolvedAuthType);
        console.log('AuthContext: applicationType resolved:', resolvedAuthType, appAuth.AuthMethod);

        // LOCAL: username/password login page (no cookies yet)
        if (isLocalApplicationAuth(appAuth)) {
          sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
          if (oauthCallback) {
            clearOAuthCallbackParamsFromUrl();
          }
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        // Non-LOCAL without cookies: exchange code only when tokens are not already present
        if (oauthCallback) {
          setIsCompletingOAuth(true);
          try {
            console.log('AuthContext: completing OAuth callback (no cookies yet)');
            const tokens = await completeOAuthCallback(
              oauthCallback.code,
              oauthCallback.state
            );
            await establishAuthenticatedSession({
              ...tokens,
              skipJwtGeneration: !!getCookie(COOKIE_NAMES.JWT_TOKEN),
            });
            clearOAuthCallbackParamsFromUrl();
            sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
            setIsAuthenticated(true);
            setUser({
              email: tokens.userid ?? tokens.userUniqueID ?? '',
              tenantId,
            });
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
          } finally {
            setIsCompletingOAuth(false);
          }
        }

        const oauthUrl = getOAuthRequestUrl(appAuth);
        const oauthCallbackFailed =
          typeof window !== 'undefined' &&
          sessionStorage.getItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED) === '1';
        if (
          usesExternalAuthFlow(appAuth) &&
          oauthUrl &&
          !oauthCallbackFailed
        ) {
          console.log('AuthContext: external auth — redirecting to provider');
          redirectingToOAuth = true;
          setIsOAuthRedirecting(true);
          window.location.assign(oauthUrl);
          return;
        }

        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error('Auth initialization error:', error);
        const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
        const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
        const hasSession = !!(accessToken && jwtToken);
        const persistedAuthType = getPersistedAuthType();

        const serverSession = await fetchServerSession();
        if (serverSession.authenticated || normalizeAuthCookiesFromBrowser()) {
          const session = restoreSessionFromCookies();
          setAuthType(persistedAuthType && persistedAuthType !== 'LOCAL' ? persistedAuthType : 'OAUTH');
          setIsAuthenticated(true);
          setUser({
            email: String(
              serverSession.user?.email ?? serverSession.user?.userid ?? session.user?.email ?? ''
            ).trim(),
            tenantId: serverSession.user?.tenantId ?? session.user?.tenantId ?? tenantId,
          });
          if (getOAuthCallbackParamsFromUrl()) {
            clearOAuthCallbackParamsFromUrl();
          }
        } else {
          setAuthType('LOCAL');
          setIsAuthenticated(false);
          setUser(null);
        }
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
    if (authType && authType !== 'LOCAL') {
      console.warn('AuthContext: password login is only available for LOCAL auth');
      return false;
    }
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