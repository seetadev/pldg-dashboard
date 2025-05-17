import { enhanceTechPartnerData } from '../utils';
import { TechPartnerPerformance, EngagementData } from '../../types/dashboard';
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';

describe('enhanceTechPartnerData', () => {
  const mockBaseData: TechPartnerPerformance[] = [
    {
      partner: 'Partner A',
      issues: 10,
      timeSeriesData: [],
      contributorDetails: [],
    },
  ];

  const mockEngagementData: EngagementData[] = [
    {
      Name: 'John Doe',
      'Github Username': 'johndoe',
      'Email Address': 'john@example.com',
      'Program Week': 'Week 1',
      'Which Tech Partner': 'Partner A',
      'How many issues, PRs, or projects this week?': '2',
      'Engagement Participation ': '3 - Highly engaged',
      'Which session(s) did you find most informative or impactful, and why?':
        'Technical Review, Planning',
      'PLDG Feedback': 'Great collaboration',
      'Tech Partner Collaboration?': 'Yes',
    },
  ];

  describe('timeSeriesData processing', () => {
    it('should process time series data correctly', () => {
      const result = enhanceTechPartnerData(mockBaseData, mockEngagementData);
      const timeSeriesData = result[0].timeSeriesData[0];

      expect(timeSeriesData).toEqual({
        week: 'Week 1',
        issueCount: 2,
        contributors: ['John Doe'],
        engagementLevel: 3,
        issues: [],
        weekEndDate: expect.any(String),
      });
    });

    it('should handle empty engagement data', () => {
      const result = enhanceTechPartnerData(mockBaseData, []);
      expect(result[0].timeSeriesData).toHaveLength(0);
    });
  });

  describe('contributorDetails processing', () => {
    it('should process contributor details correctly', () => {
      const result = enhanceTechPartnerData(mockBaseData, mockEngagementData);
      const contributorDetails = result[0].contributorDetails[0];

      expect(contributorDetails).toEqual({
        name: 'John Doe',
        githubUsername: 'johndoe',
        email: 'john@example.com',
        issuesCompleted: 2,
        engagementScore: 3,
        recentIssues: [],
      });
    });

    it('should handle missing GitHub usernames', () => {
      const dataWithoutGithub = [
        {
          ...mockEngagementData[0],
          'Github Username': '',
        },
      ];
      const result = enhanceTechPartnerData(mockBaseData, dataWithoutGithub);
      const contributor = result[0].contributorDetails[0];
      expect(contributor.githubUsername).toBe('john-doe');
      expect(contributor.name).toBe('John Doe');
    });
  });
});
