import type { TokenPair, TokenStore } from '@court-proof/api-client';
import * as SecureStore from 'expo-secure-store';

const KEY = 'court-proof.session';

export const secureTokenStore: TokenStore = {
  async read() {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      // A corrupt entry is not worth recovering — force a fresh login.
      await SecureStore.deleteItemAsync(KEY);
      return null;
    }
  },

  async write(tokens) {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  },

  async clear() {
    await SecureStore.deleteItemAsync(KEY);
  },
};
