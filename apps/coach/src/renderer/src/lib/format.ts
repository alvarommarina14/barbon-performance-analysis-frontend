export function formatBytes(bytes?: number): string | null {
  if (!bytes) {
    return null;
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds?: number): string | null {
  if (!seconds) {
    return null;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// One fixed English format everywhere: the system locale would mix languages and date orders.
const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(iso?: string | null): string | null {
  return iso ? DATE.format(new Date(iso)) : null;
}

export function formatDateTime(iso?: string | null): string | null {
  return iso ? DATE_TIME.format(new Date(iso)) : null;
}
