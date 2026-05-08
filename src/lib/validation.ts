import { z } from 'zod';

/**
 * Zod schema for Airtable engagement records.
 * Provides strict validation and normalization of field names.
 */
export const EngagementRecordSchema = z.object({
  'Name': z.preprocess((val) => {
    if (typeof val === 'string') return val.trim();
    return val;
  }, z.string().min(1)),
  'Program Week': z.string().min(1),
  'Engagement Participation ': z.string().optional().default('1 - Low'),
  'Tech Partner Collaboration?': z.string().optional().default('No'),
  'Which Tech Partner': z.union([z.string(), z.array(z.string())]).optional().default([]),
  'How many issues, PRs, or projects this week?': z.string().optional().default('0'),
  'PLDG Feedback': z.string().optional().default(''),
  'GitHub Issue Title': z.string().optional().default(''),
  'GitHub Issue URL': z.string().optional().default(''),
  'Created': z.string().optional().default(''),
  'Issue Title 1': z.string().optional().default(''),
  'Issue Link 1': z.string().optional().default(''),
  'Issue Title 2': z.string().optional().default(''),
  'Issue Link 2': z.string().optional().default(''),
  'Issue Title 3': z.string().optional().default(''),
  'Issue Link 3': z.string().optional().default(''),
}).passthrough();

export type ValidatedEngagementRecord = z.infer<typeof EngagementRecordSchema>;

/**
 * Normalizes and validates raw data records.
 * Handles common inconsistencies like BOM characters or alternative field names.
 */
export function normalizeAndValidateRecord(record: Record<string, any>): ValidatedEngagementRecord {
  const normalized: Record<string, any> = {};
  
  // Mapping of common variations to canonical field names
  const mapping: Record<string, string> = {
    'Name': 'Name',
    '﻿Name': 'Name', // BOM character
    'Program Week': 'Program Week',
    'Engagement Participation ': 'Engagement Participation ',
    'Engagement Participation': 'Engagement Participation ',
    'Tech Partner Collaboration?': 'Tech Partner Collaboration?',
    'Which Tech Partner': 'Which Tech Partner',
    'How many issues, PRs, or projects this week?': 'How many issues, PRs, or projects this week?',
    'PLDG Feedback': 'PLDG Feedback',
    'GitHub Issue Title': 'GitHub Issue Title',
    'GitHub Issue URL': 'GitHub Issue URL',
    'Issue Title 1': 'Issue Title 1',
    'Issue Link 1': 'Issue Link 1',
    'Issue Title 2': 'Issue Title 2',
    'Issue Link 2': 'Issue Link 2',
    'Issue Title 3': 'Issue Title 3',
    'Issue Link 3': 'Issue Link 3',
  };

  for (const [key, value] of Object.entries(record)) {
    const canonicalKey = mapping[key.trim()];
    if (canonicalKey) {
      normalized[canonicalKey] = value;
    } else {
      normalized[key] = value;
    }
  }

  return EngagementRecordSchema.parse(normalized);
}

/**
 * Validates an array of raw engagement data.
 */
export function validateEngagementData(data: any[]): ValidatedEngagementRecord[] {
  return data.map(record => {
    try {
      return normalizeAndValidateRecord(record);
    } catch (error) {
      console.warn('Record validation failed, using raw record as fallback:', { record, error });
      return record as ValidatedEngagementRecord;
    }
  });
}