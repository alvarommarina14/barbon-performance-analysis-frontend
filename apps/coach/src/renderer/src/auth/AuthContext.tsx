import type { components } from '@court-proof/api-client';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSessionExpired, tokenStore } from '../api/client';

type CurrentUser = components['schemas']['CurrentUserResponse'];

interface AuthState {
  user: CurrentUser | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokens = await tokenStore.read();
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
    const { data, error } = await api.POST('/api/v1/auth/login', { body: { email, password } });
    if (error || !data) {
      throw new Error(problemDetail(error) ?? 'Could not sign in');
    }
    if (data.user.role !== 'COACH' && data.user.role !== 'ADMIN') {
      // The player app is the other half of this product; sending a player here would show
      // them an empty client list rather than an explanation.
      throw new Error('This app is for coaches. Players sign in on the mobile app.');
    }
    await tokenStore.write({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = await tokenStore.read();
    if (tokens) {
      await api.POST('/api/v1/auth/logout', { body: { refreshToken: tokens.refreshToken } });
    }
    await tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

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
