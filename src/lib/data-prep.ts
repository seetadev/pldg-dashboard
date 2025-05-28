import { CohortId } from '@/types/cohort';
import { EngagementData } from '@/types/dashboard';
import Papa from 'papaparse';

/**
 * Normalizes and prepares raw cohort data
 */
export async function prepareCohortData(
  cohortId: CohortId,
  rawData: string
): Promise<EngagementData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<EngagementData>(rawData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        try {
          const normalized = normalizeDataFields(results.data, cohortId);
          resolve(normalized);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => reject(error),
    });
  });
}

/**
 * Normalizes data fields across different cohorts
 */
function normalizeDataFields(
  data: EngagementData[],
  cohortId: CohortId
): EngagementData[] {
  return data.map((entry) => {
    // Add cohort column
    const normalized: EngagementData = {
      ...entry,
      Cohort: cohortId,
    };

    // Normalize Program Week
    if (cohortId === '2') {
      // Example: Convert "Week 3 (Mar 4-8)" to "Week 3"
      normalized['Program Week'] =
        entry['Program Week']?.split('(')[0].trim() || '';
    }

    // Normalize Engagement Participation
    if (typeof entry['Engagement Participation '] === 'string') {
      normalized['Engagement Participation '] = entry[
        'Engagement Participation '
      ]
        .replace(/^\d\s*-\s*/, '') // Remove leading "1 - "
        .trim();
    }

    // Normalize PR/Issue Count
    if (entry['How many issues, PRs, or projects this week?']) {
      const count = entry['How many issues, PRs, or projects this week?'];
      normalized['How many issues, PRs, or projects this week?'] =
        count === '4+' ? '4' : count; // Convert 4+ to 4 for consistency
    }

    // Normalize Tech Partner field
    if (entry['Which Tech Partner']) {
      normalized['Which Tech Partner'] = Array.isArray(
        entry['Which Tech Partner']
      )
        ? entry['Which Tech Partner']
        : entry['Which Tech Partner']?.split(',').map((p: string) => p.trim());
    }

    return normalized;
  });
}

/**
 * Validates data structure against cohort-1 schema
 */
export function validateDataStructure(data: EngagementData[]): {
  isValid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // 1. Check required fields exist
  const requiredFields: Array<keyof EngagementData> = [
    'Name',
    'Program Week',
    'Engagement Participation ',
    'How many issues, PRs, or projects this week?',
    'Cohort',
  ];

  // 2. Check field value formats
  data.forEach((entry, index) => {
    // Check required fields
    requiredFields.forEach((field) => {
      if (!(field in entry)) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      } else if (
        entry[field] === undefined ||
        entry[field] === null ||
        entry[field] === ''
      ) {
        errors.push(
          `Row ${index + 1}: Empty value for required field '${field}'`
        );
      }
    });

    // Validate Program Week format
    if (
      entry['Program Week'] &&
      !/^Week\s\d+$/i.test(entry['Program Week'].trim())
    ) {
      errors.push(
        `Row ${index + 1}: Invalid Program Week format '${entry['Program Week']}'. Should be 'Week X'`
      );
    }

    // Validate Engagement Participation values
    const validEngagementLevels = ['High', 'Medium', 'Low', 'None'];
    if (
      entry['Engagement Participation '] &&
      !validEngagementLevels.includes(entry['Engagement Participation '].trim())
    ) {
      errors.push(
        `Row ${index + 1}: Invalid Engagement Participation '${entry['Engagement Participation ']}'. ` +
          `Valid values: ${validEngagementLevels.join(', ')}`
      );
    }

    // Validate PR/Issue Count
    if (
      entry['How many issues, PRs, or projects this week?'] &&
      !/^[0-4]$/.test(entry['How many issues, PRs, or projects this week?'])
    ) {
      errors.push(
        `Row ${index + 1}: Invalid issue count '${entry['How many issues, PRs, or projects this week?']}'. ` +
          `Should be 0-4`
      );
    }

    // Validate Tech Partner format
    if (entry['Which Tech Partner']) {
      const techPartners = Array.isArray(entry['Which Tech Partner'])
        ? entry['Which Tech Partner']
        : [entry['Which Tech Partner']];

      techPartners.forEach((partner) => {
        if (typeof partner !== 'string' || partner.trim() === '') {
          errors.push(
            `Row ${index + 1}: Invalid Tech Partner value '${partner}'`
          );
        }
      });
    }

    // Validate Cohort ID
    if (entry.Cohort && !['1', '2'].includes(entry.Cohort)) {
      errors.push(
        `Row ${index + 1}: Invalid Cohort '${entry.Cohort}'. Valid values: '1', '2'`
      );
    }
  });

  // 3. Check for duplicate entries
  const uniqueKeyCount = new Set(
    data.map((entry) => `${entry.Name}-${entry['Program Week']}`)
  ).size;

  if (uniqueKeyCount !== data.length) {
    errors.push(
      `Duplicate entries found. There should be only one entry per participant per week`
    );
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
