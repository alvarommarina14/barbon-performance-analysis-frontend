// Keys for finding rows: crypto.randomUUID exists in the Electron renderer, but keep a fallback.
export function uid(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
