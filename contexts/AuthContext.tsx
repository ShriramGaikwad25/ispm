'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
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
  shouldRedirectToOAuthProvider,
  markOAuthRedirectAttempt,
  AUTH_SESSION_KEYS,
  clearLastAuthTypeOnLocalLogin,
  performUserLogout,
  syncAuthTypeToSession,
  loadExposedTokens,
  clearLogoutRedirectFlag,
} from '@/lib/auth';
import {
  getActiveTenantId,
  hasActiveTenant,
  isLoggedOutPath,
  isTenantAuthPath,
  parseTenantFromPathname,
  setActiveTenantId,
} from '@/lib/tenant';
import { ensureAuthFetchPatched } from '@/lib/authFetch';
import { setHttpOnlySession } from '@/lib/kfProxy';
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
  authError: string | null;
  activeTenantId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applySessionToState(
  setIsAuthenticated: (v: boolean) => void,
  setUser: (u: { email: string; tenantId?: string } | null) => void,
  serverSession: Awaited<ReturnType<typeof fetchServerSession>>
) {
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
    tenantId:
      serverSession.user?.tenantId ??
      session.user?.tenantId ??
      getActiveTenantId() ??
      undefined,
  });
  sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
  sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_REDIRECT_AT);
  // A previous SSO logout in this tab leaves this set; with a live session again it is stale,
  // and AuthWrapper would keep sending every page to /logged-out.
  sessionStorage.removeItem(AUTH_SESSION_KEYS.LOGOUT_REDIRECT);
  // Valid session whose tokens are still unreadable (HttpOnly and /api/auth/tokens failed):
  // fall back to routing calls via the token proxy.
  setHttpOnlySession(!(getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN)));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; tenantId?: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState<string | null>(null);
  const [isOAuthRedirecting, setIsOAuthRedirecting] = useState(false);
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);

  ensureAuthFetchPatched();

  useEffect(() => {
    const initializeAuth = async () => {
      let redirectingToOAuth = false;

      try {
        setAuthError(null);
        const path = pathname ?? window.location.pathname;

        const pathTenant = parseTenantFromPathname(path);
        if (pathTenant) {
          setActiveTenantId(pathTenant);
        }
        // Opening the tenant sign-in URL is a new sign-in: drop the flag an earlier SSO logout left.
        if (isTenantAuthPath(path)) clearLogoutRedirectFlag();
        let tenant = getActiveTenantId();
        setActiveTenantIdState(tenant);

        if (isLoggedOutPath(path)) {
          setAuthType(null);
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        // After an external (e.g. Oracle) SSO sign-in the tenant is only in HttpOnly cookies
        // (tenantId / REGISTERED_APPNAME) that JS cannot read: take it from the server session.
        if (!tenant) {
          const session = await fetchServerSession();
          const fromCookies = session.authenticated ? session.user?.tenantId?.trim() : '';
          if (fromCookies) {
            setActiveTenantId(fromCookies);
            tenant = fromCookies;
            setActiveTenantIdState(tenant);
          }
        }

        if (!tenant) {
          setAuthType(null);
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        normalizeAuthCookiesFromBrowser();
        const oauthCallback = getOAuthCallbackParamsFromUrl();
        const serverSession = await fetchServerSession();
        // Valid session but HttpOnly tokens (external SSO): fetch them so calls can send Bearer themselves.
        if (serverSession.authenticated && !(getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN))) {
          await loadExposedTokens();
        }
        const hasClientSession = !!(
          getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN)
        );
        const hasSession = serverSession.authenticated || hasClientSession;

        if (oauthCallback && !hasSession) {
          setIsCompletingOAuth(true);
          try {
            const tokens = await completeOAuthCallback(
              oauthCallback.code,
              oauthCallback.state
            );
            await establishAuthenticatedSession({
              ...tokens,
              skipJwtGeneration: false,
              tenantId: tenant,
            });
            clearOAuthCallbackParamsFromUrl();
            const afterSession = await fetchServerSession();
            setAuthType('OAUTH');
            syncAuthTypeToSession('OAUTH', 'IDCS');
            applySessionToState(setIsAuthenticated, setUser, afterSession);
            window.location.replace('/');
            return;
          } catch (oauthError) {
            console.error('AuthContext: OAuth callback failed:', oauthError);
            clearOAuthCallbackParamsFromUrl();
            sessionStorage.setItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED, '1');
            setAuthType('OAUTH');
            setAuthError(
              oauthError instanceof Error
                ? oauthError.message
                : 'SSO sign-in failed. Please try again.'
            );
            setIsAuthenticated(false);
            setUser(null);
            return;
          } finally {
            setIsCompletingOAuth(false);
          }
        }

        if (hasSession) {
          let resolvedAuthType =
            getPersistedAuthType() && getPersistedAuthType() !== 'LOCAL'
              ? getPersistedAuthType()!
              : oauthCallback
                ? 'OAUTH'
                : null;
          if (!resolvedAuthType) {
            try {
              const appAuth = await fetchApplicationAuthType(tenant);
              resolvedAuthType = getApplicationAuthType(appAuth);
            } catch {
              resolvedAuthType = 'LOCAL';
            }
          }
          if (oauthCallback) clearOAuthCallbackParamsFromUrl();
          setAuthType(resolvedAuthType);
          syncAuthTypeToSession(resolvedAuthType);
          applySessionToState(setIsAuthenticated, setUser, serverSession);
          if (oauthCallback || isTenantAuthPath(path) || path.startsWith('/oauth/callback')) {
            window.location.replace('/');
          }
          return;
        }

        const appAuth = await fetchApplicationAuthType(tenant);
        const resolvedAuthType = getApplicationAuthType(appAuth);
        setAuthType(resolvedAuthType);
        syncAuthTypeToSession(resolvedAuthType, appAuth.AuthMethod);

        if (isLocalApplicationAuth(appAuth)) {
          sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
          if (oauthCallback) clearOAuthCallbackParamsFromUrl();
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        const oauthUrl = getOAuthRequestUrl(appAuth);
        if (usesExternalAuthFlow(appAuth) && shouldRedirectToOAuthProvider(oauthUrl)) {
          markOAuthRedirectAttempt();
          redirectingToOAuth = true;
          setIsOAuthRedirecting(true);
          window.location.assign(oauthUrl!);
          return;
        }

        if (usesExternalAuthFlow(appAuth)) {
          setAuthError(
            `Unable to start SSO. Refresh /${tenant} to try again.`
          );
        }
        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error('Auth initialization error:', error);
        const serverSession = await fetchServerSession();
        if (serverSession.authenticated && !(getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN))) {
          await loadExposedTokens();
        }
        if (hasActiveTenant() && (serverSession.authenticated || normalizeAuthCookiesFromBrowser())) {
          const fallbackAuth = getPersistedAuthType() ?? 'OAUTH';
          setAuthType(fallbackAuth);
          syncAuthTypeToSession(fallbackAuth);
          applySessionToState(setIsAuthenticated, setUser, serverSession);
          if (getOAuthCallbackParamsFromUrl()) clearOAuthCallbackParamsFromUrl();
        } else {
          setAuthType(null);
          setIsAuthenticated(false);
          setUser(null);
          setAuthError(
            error instanceof Error ? error.message : 'Authentication initialization failed'
          );
        }
      } finally {
        setIsCompletingOAuth(false);
        setActiveTenantIdState(getActiveTenantId());
        if (!redirectingToOAuth) {
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();
  }, [pathname]);

  const login = async (userid: string, password: string): Promise<boolean> => {
    if (authType && authType !== 'LOCAL') {
      console.warn('AuthContext: password login is only available for LOCAL auth');
      return false;
    }
    setIsLoading(true);
    try {
      const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
      const loginApp = getActiveTenantId() ?? parseTenantFromPathname(path);
      if (!loginApp) {
        throw new Error('Open the app at /YOUR_TENANT_ID (e.g. /ACMECOM or /KFPRODOCI).');
      }
      const tokenResponse = await requestToken(userid, password, loginApp);
      const { accessToken, userUniqueID, userAdminRoles } = tokenResponse.tokenResponse;
      await establishAuthenticatedSession({
        accessToken,
        userUniqueID,
        userAdminRoles,
        userid,
        tenantId: loginApp,
      });
      clearLastAuthTypeOnLocalLogin();
      setIsAuthenticated(true);
      setUser({ email: userid, tenantId: loginApp });
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
    const tenant = getActiveTenantId() ?? user?.tenantId;
    performUserLogout(authType, tenant);
  };

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
        authError,
        activeTenantId,
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
