import { processData, loadCohortData } from '../data-processing';
import { CohortId } from '@/types/cohort';

// Mock fetch globally
global.fetch = jest.fn((url: string) => {
  if (url.includes('cohort-1')) {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`Name,Github Username,Email Address,Program Week,Engagement Tracking,Engagement Participation
Alice,alice123,alice@test.com,Week 1 (2024-01-01),Weekly Cohort Call,3 - Highly engaged
Bob,bob456,bob@test.com,Week 1 (2024-01-01),Weekly Cohort Call,2 - Participated occasionally`),
    });
  }
  if (url.includes('cohort-2')) {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`Name,Github Username,Email Address,Program Week,Engagement Tracking,Engagement Participation
Carol,carol789,carol@test.com,Week 1 (2024-01-20),Weekly Standup,3 - Highly engaged
Dave,dave101,dave@test.com,Week 1 (2024-01-20),Weekly Standup,3 - Highly engaged`),
    });
  }
  return Promise.resolve({
    ok: false,
    text: () => Promise.reject(new Error('Not found')),
  });
}) as jest.Mock;

describe('Data Processing', () => {
  describe('loadCohortData', () => {
    it('should load data for cohort 1', async () => {
      const data = await loadCohortData('1' as CohortId);
      expect(data).toContain('Alice');
      expect(data).toContain('Bob');
    });

    it('should load data for cohort 2', async () => {
      const data = await loadCohortData('2' as CohortId);
      expect(data).toContain('Carol');
      expect(data).toContain('Dave');
    });

    it('should handle invalid cohort IDs', async () => {
      await expect(loadCohortData('3' as CohortId)).rejects.toThrow();
    });
  });

  describe('processData', () => {
    const mockCsvData = [
      {
        Name: 'Test User',
        'Program Week': 'Week 1 (2024-01-01)',
        'Engagement Participation ': '3 - High',
        'How many issues, PRs, or projects this week?': '2',
        'Which Tech Partner': 'Partner A',
      },
    ];

    it('should process data correctly', () => {
      const result = processData(mockCsvData, null, '2');
      expect(result).toHaveProperty('activeContributors', 1);
      expect(result).toHaveProperty('cohortInfo');
      expect(result.cohortInfo?.id).toBe('2');
    });

    it('should filter data by cohort date range', () => {
      const testData = [
        {
          Name: 'Test User',
          'Program Week': 'Week 1 (2024-01-01)',
          'Engagement Participation ': '3 - High',
          'How many issues, PRs, or projects this week?': '2',
          'Which Tech Partner': 'Partner A',
        },
      ];

      const result = processData(testData, null, '1' as CohortId);

      // Data is within cohort 1's date range (2024-01-01 to 2024-01-19)
      expect(result.activeContributors).toBe(1);
    });
  });
});
