const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '—';
  }
  const diff = then - Date.now();
  if (Math.abs(diff) > 30 * 86_400_000) {
    return new Date(then).toLocaleDateString();
  }
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) {
      return capitalize(rtf.format(Math.round(diff / ms), unit));
    }
  }
  return 'Just now';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
