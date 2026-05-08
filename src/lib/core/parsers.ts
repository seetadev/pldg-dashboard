import { GITHUB_CONTRIBUTORS, CONTRIBUTOR_ALIASES } from '../constants';

/**
 * Normalizes a contributor name to their GitHub username using known aliases.
 */
export function normalizeContributorName(name: string): string {
  if (!name) return '';
  const normalized = name.toLowerCase().trim();
  return CONTRIBUTOR_ALIASES[normalized] || name;
}

/**
 * Parses a week number from various string formats.
 * Supports: 
 * - "Week X (Month Day - Month Day, Year)"
 * - "Week X"
 * - Just the number "X"
 */
export function parseWeekNumber(weekString: string): number {
  if (!weekString) return 0;

  // Handle CSV/Airtable format: "Week X (Month Day - Month Day, Year)"
  const csvMatch = weekString.match(/Week (\d+)(?:\s*\(.*?\))?/i);
  if (csvMatch) {
    const weekNum = parseInt(csvMatch[1], 10);
    if (!isNaN(weekNum) && weekNum > 0) {
      return weekNum;
    }
  }

  // Handle direct number format
  const weekNum = parseInt(weekString, 10);
  if (!isNaN(weekNum) && weekNum > 0) {
    return weekNum;
  }

  return 0;
}

/**
 * Normalizes a week string to a clean "Week X" format.
 */
export function formatWeekString(weekString: string): string {
  const weekNum = parseWeekNumber(weekString);
  return weekNum > 0 ? `Week ${weekNum}` : weekString.replace(/\(.*?\)/, '').trim();
}

/**
 * Consistently parses tech partner fields into an array of strings.
 * Handles both string arrays and comma-separated strings.
 */
export function parseTechPartners(techPartner: string | string[] | undefined): string[] {
  if (!techPartner) return [];
  
  if (Array.isArray(techPartner)) {
    return techPartner.map(p => p.trim()).filter(Boolean);
  }
  
  return techPartner.split(',').map(p => p.trim()).filter(Boolean);
}

/**
 * Extracts a single string value from a field that might be a string or a single-item array.
 */
export function getStringValue(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] || '' : value;
}
