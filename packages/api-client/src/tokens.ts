export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStore {
  read(): Promise<TokenPair | null>;
  write(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryTokenStore(): TokenStore {
  let tokens: TokenPair | null = null;
  return {
    async read() {
      return tokens;
    },
    async write(next) {
      tokens = next;
    },
    async clear() {
      tokens = null;
    },
  };
}
