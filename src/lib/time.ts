export function formatLastUpdated(date: Date): string {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((date.getTime() - Date.now()) / (1000 * 60)),
    'minute'
  );
}

export const REFRESH_INTERVALS = {
  CRITICAL: 1000 * 60 * 60 * 12, // 12 hours
  STANDARD: 1000 * 60 * 60 * 24, // 24 hours
} as const;
