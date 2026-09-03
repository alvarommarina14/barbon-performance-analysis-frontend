import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './generated/schema';
import type { TokenPair, TokenStore } from './tokens';

export interface ApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  onSessionExpired?: () => void;
}

const ANONYMOUS_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

function isAnonymous(url: string): boolean {
  return ANONYMOUS_PATHS.some((path) => new URL(url, 'http://placeholder').pathname === path);
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, tokenStore, onSessionExpired } = options;

  // A single in-flight refresh, shared by every request that hits a 401 at once. Without
  // this, a screen firing four queries on mount would burn four refresh tokens and — since
  // refresh tokens rotate — three of them would be rejected.
  let refreshInFlight: Promise<TokenPair | null> | null = null;

  async function refreshTokens(): Promise<TokenPair | null> {
    const current = await tokenStore.read();
    if (!current) {
      return null;
    }

    const response = await fetch(new URL('/api/v1/auth/refresh', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });

    if (!response.ok) {
      await tokenStore.clear();
      onSessionExpired?.();
      return null;
    }

    const next = (await response.json()) as TokenPair;
    await tokenStore.write(next);
    return next;
  }

  function refreshOnce(): Promise<TokenPair | null> {
    refreshInFlight ??= refreshTokens().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (isAnonymous(request.url)) {
        return request;
      }
      const tokens = await tokenStore.read();
      if (tokens) {
        request.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      }
      return request;
    },

    async onResponse({ request, response }) {
      if (response.status !== 401 || isAnonymous(request.url)) {
        return response;
      }

      const tokens = await refreshOnce();
      if (!tokens) {
        return response;
      }

      // Retry once with the new access token. A second 401 is a real authorisation
      // failure, not an expired token, so it is returned as-is.
      const retry = request.clone();
      retry.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return fetch(retry);
    },
  };

  const client = createClient<paths>({ baseUrl });
  client.use(authMiddleware);
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
