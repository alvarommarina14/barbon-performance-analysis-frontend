import { createApiClient, type TokenPair, type TokenStore } from '@court-proof/api-client';

const vaultTokenStore: TokenStore = {
  async read() {
    const raw = await window.courtProof.session.read();
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      await window.courtProof.session.clear();
      return null;
    }
  },

  async write(tokens) {
    await window.courtProof.session.write(JSON.stringify(tokens));
  },

  async clear() {
    await window.courtProof.session.clear();
  },
};

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

let sessionExpiredHandler: () => void = () => {};

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

export const tokenStore = vaultTokenStore;

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  tokenStore: vaultTokenStore,
  onSessionExpired: () => sessionExpiredHandler(),
});
