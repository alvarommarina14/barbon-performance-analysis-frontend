// The backend's OpenAPI describes only success responses, so openapi-fetch types `error` as
// `never` even though at runtime it holds the RFC 7807 problem detail. These read it back.

export function problemDetail(error: unknown): string | undefined {
  return readString(error, 'detail');
}

export function problemType(error: unknown): string | undefined {
  return readString(error, 'type');
}

function readString(error: unknown, key: string): string | undefined {
  if (error && typeof error === 'object' && key in error) {
    const value = (error as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}
