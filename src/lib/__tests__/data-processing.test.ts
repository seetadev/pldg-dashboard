import { processData } from '../data-processing';
import { EngagementData } from '../../types/dashboard';

describe('processData tech partner metrics', () => {
  const createEntry = (
    name: string,
    partner: string,
    issueCount: string
  ): EngagementData => ({
    Name: name,
    'Github Username': name.toLowerCase(),
    'Program Week': 'Week 1',
    'Engagement Participation ': '3 - Highly engaged',
    'Tech Partner Collaboration?': 'Yes',
    'Which Tech Partner': partner,
    'How many issues, PRs, or projects this week?': issueCount
  });

  it('calculates average issues per contributor and collaboration score', () => {
    const result = processData([
      createEntry('Alice', 'Libp2p', '3'),
      createEntry('Bob', 'Libp2p', '3'),
      createEntry('Alice', 'Storacha', '2'),
      createEntry('Carol', 'Storacha', '3'),
      createEntry('Dave', 'Storacha', '2'),
      createEntry('Eve', 'Drand', '4+')
    ]);

    expect(result.techPartnerMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partner: 'Libp2p',
          totalIssues: 6,
          activeContributors: 2,
          avgIssuesPerContributor: 3,
          collaborationScore: 44
        }),
        expect.objectContaining({
          partner: 'Storacha',
          totalIssues: 7,
          activeContributors: 3,
          avgIssuesPerContributor: 2.3,
          collaborationScore: 40
        }),
        expect.objectContaining({
          partner: 'Drand',
          totalIssues: 4,
          activeContributors: 1,
          avgIssuesPerContributor: 4,
          collaborationScore: 52
        })
      ])
    );
  });

  it('counts multi-partner rows for each normalized partner', () => {
    const result = processData([
      createEntry('Alice', 'Libp2p, Storacha', '2'),
      createEntry('Bob', 'Libp2p', '4')
    ]);

    expect(result.techPartnerMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partner: 'Libp2p',
          totalIssues: 6,
          activeContributors: 2,
          avgIssuesPerContributor: 3,
          collaborationScore: 44
        }),
        expect.objectContaining({
          partner: 'Storacha',
          totalIssues: 2,
          activeContributors: 1,
          avgIssuesPerContributor: 2,
          collaborationScore: 28
        })
      ])
    );
  });
});
