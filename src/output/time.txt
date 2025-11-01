// src/lib/utils/time.ts

/**
 * Parses a time string (e.g., "10m", "1d", "30s") into milliseconds.
 * Supports seconds (s), minutes (m), hours (h), and days (d).
 * @param timeStr The time string to parse.
 * @returns The equivalent time in milliseconds, or 0 if the format is invalid.
 */
export function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  const match = timeStr.trim().match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}
