// The `detail` string from an RFC 7807 problem body, when openapi-fetch hands one back as `error`.
export function problemDetail(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'detail' in error) {
    const detail = (error as { detail?: unknown }).detail;
    return typeof detail === 'string' ? detail : undefined;
  }
  return undefined;
}

// The RFC 7807 `type` URI ends in a slug (…/problems/analysis-not-editable).
export function problemSlug(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'type' in error) {
    const type = (error as { type?: unknown }).type;
    if (typeof type === 'string') {
      return type.split('/').pop();
    }
  }
  return undefined;
}
