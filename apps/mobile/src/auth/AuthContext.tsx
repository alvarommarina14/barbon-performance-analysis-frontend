import type { components } from '@court-proof/api-client';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSessionExpired } from '@/api/client';
import { secureTokenStore } from '@/api/tokenStore';

type CurrentUser = components['schemas']['CurrentUserResponse'];

interface AuthState {
  user: CurrentUser | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  // Restore the session on cold start: the stored refresh token outlives the access token,
  // and the client's middleware transparently refreshes on the first 401.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokens = await secureTokenStore.read();
      if (!tokens) {
        if (!cancelled) setUser(null);
        return;
      }

      const { data } = await api.GET('/api/v1/auth/me');
      if (!cancelled) setUser(data ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await api.POST('/api/v1/auth/login', {
      body: { email, password },
    });
    if (error || !data) {
      throw new Error(problemDetail(error) ?? 'Could not sign in');
    }
    await secureTokenStore.write({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await api.POST('/api/v1/auth/register', {
      body: { email, password, name },
    });
    if (error || !data) {
      throw new Error(problemDetail(error) ?? 'Could not create the account');
    }
    await secureTokenStore.write({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = await secureTokenStore.read();
    if (tokens) {
      await api.POST('/api/v1/auth/logout', { body: { refreshToken: tokens.refreshToken } });
    }
    await secureTokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}

function problemDetail(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'detail' in error) {
    const detail = (error as { detail?: unknown }).detail;
    return typeof detail === 'string' ? detail : undefined;
  }
  return undefined;
}
