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
  shouldRedirectToOAuthProvider,
  markOAuthRedirectAttempt,
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
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applySessionToState(
  setIsAuthenticated: (v: boolean) => void,
  setUser: (u: { email: string; tenantId?: string } | null) => void,
  serverSession: Awaited<ReturnType<typeof fetchServerSession>>,
  resolvedAuthType: string
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
    tenantId: serverSession.user?.tenantId ?? session.user?.tenantId ?? tenantId,
  });
  sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
  sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_REDIRECT_AT);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; tenantId?: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState<string | null>(null);
  const [isOAuthRedirecting, setIsOAuthRedirecting] = useState(false);
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  ensureAuthFetchPatched();

  useEffect(() => {
    const initializeAuth = async () => {
      let redirectingToOAuth = false;

      try {
        setAuthError(null);
        normalizeAuthCookiesFromBrowser();
        const oauthCallback = getOAuthCallbackParamsFromUrl();
        const serverSession = await fetchServerSession();
        const hasClientSession = !!(
          getCookie(COOKIE_NAMES.ACCESS_TOKEN) && getCookie(COOKIE_NAMES.JWT_TOKEN)
        );
        const hasSession = serverSession.authenticated || hasClientSession;

        // 1) OAuth return with code — exchange via our API proxy, then stay in app
        if (oauthCallback && !hasSession) {
          setIsCompletingOAuth(true);
          try {
            console.log('AuthContext: exchanging OAuth code');
            const tokens = await completeOAuthCallback(
              oauthCallback.code,
              oauthCallback.state
            );
            await establishAuthenticatedSession({
              ...tokens,
              skipJwtGeneration: false,
            });
            clearOAuthCallbackParamsFromUrl();
            const afterSession = await fetchServerSession();
            setAuthType('OAUTH');
            applySessionToState(setIsAuthenticated, setUser, afterSession, 'OAUTH');
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

        // 2) Already have tokens on this origin — restore, do not send user to IdP again
        if (hasSession) {
          const resolvedAuthType =
            getPersistedAuthType() && getPersistedAuthType() !== 'LOCAL'
              ? getPersistedAuthType()!
              : oauthCallback
                ? 'OAUTH'
                : 'LOCAL';
          console.log('AuthContext: restoring session from cookies');
          if (oauthCallback) clearOAuthCallbackParamsFromUrl();
          setAuthType(resolvedAuthType);
          applySessionToState(setIsAuthenticated, setUser, serverSession, resolvedAuthType);
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

        if (isLocalApplicationAuth(appAuth)) {
          sessionStorage.removeItem(AUTH_SESSION_KEYS.OAUTH_CALLBACK_FAILED);
          if (oauthCallback) clearOAuthCallbackParamsFromUrl();
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        // 3) No session — redirect to IdP once (not in a loop)
        const oauthUrl = getOAuthRequestUrl(appAuth);
        if (usesExternalAuthFlow(appAuth) && shouldRedirectToOAuthProvider(oauthUrl)) {
          console.log('AuthContext: redirecting to SSO provider');
          markOAuthRedirectAttempt();
          redirectingToOAuth = true;
          setIsOAuthRedirecting(true);
          window.location.assign(oauthUrl!);
          return;
        }

        if (usesExternalAuthFlow(appAuth)) {
          setAuthError(
            'Unable to start SSO. Sign-in was not attempted again to avoid a redirect loop. Refresh the page or contact support.'
          );
        }
        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error('Auth initialization error:', error);
        const serverSession = await fetchServerSession();
        if (serverSession.authenticated || normalizeAuthCookiesFromBrowser()) {
          const persistedAuthType = getPersistedAuthType();
          setAuthType(persistedAuthType && persistedAuthType !== 'LOCAL' ? persistedAuthType : 'OAUTH');
          applySessionToState(setIsAuthenticated, setUser, serverSession, 'OAUTH');
          if (getOAuthCallbackParamsFromUrl()) clearOAuthCallbackParamsFromUrl();
        } else {
          setAuthType('LOCAL');
          setIsAuthenticated(false);
          setUser(null);
          setAuthError(
            error instanceof Error ? error.message : 'Authentication initialization failed'
          );
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
      const tokenResponse = await requestToken(userid, password);
      const { accessToken, userUniqueID, userAdminRoles } = tokenResponse.tokenResponse;
      await establishAuthenticatedSession({
        accessToken,
        userUniqueID,
        userAdminRoles,
        userid,
      });
      setIsAuthenticated(true);
      setUser({ email: userid, tenantId });
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
    setAuthError(null);
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
