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
  // No `new URL()`: React Native ships no complete URL implementation. Every anonymous path is
  // a full path suffix and the base URL never contains one, so a suffix match is enough.
  const path = url.split(/[?#]/, 1)[0] ?? url;
  return ANONYMOUS_PATHS.some((anon) => path.endsWith(anon));
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

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/auth/refresh`, {
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
    // openapi-fetch rejects any hook return value that is not a Request/Response instance, and
    // React Native's Hermes runtime does not recognise its own fetch primitives as instances of
    // the globals. So return nothing unless a value is genuinely being swapped in: the header
    // mutation below sticks on the request openapi-fetch keeps.
    async onRequest({ request }) {
      if (isAnonymous(request.url)) {
        return;
      }
      const tokens = await tokenStore.read();
      if (tokens) {
        request.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      }
    },

    async onResponse({ request, response }) {
      if (response.status !== 401 || isAnonymous(request.url)) {
        return;
      }

      const tokens = await refreshOnce();
      if (!tokens) {
        return;
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
