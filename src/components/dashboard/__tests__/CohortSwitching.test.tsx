/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeveloperEngagementDashboard from '../DeveloperEngagementDashboard';
import { DashboardSystemProvider } from '@/context/DashboardSystemContext';
import { TooltipProvider } from '@radix-ui/react-tooltip';

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

// Mock problematic modules
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn(),
    xlsx: {
      writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    },
  })),
}));

// Mock fetch for data loading
global.fetch = jest.fn((url) => {
  if (url.includes('cohort-1')) {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`Name,Github Username,Email Address,Program Week,Engagement Tracking,Engagement Participation ,"Which session(s) did you find most informative or impactful, and why?",Tech Partner Collaboration?,Which Tech Partner,Describe your work with the tech partner,"Did you work on an issue, PR, or project this week?","How many issues, PRs, or projects this week?"
Alice,alice123,alice@test.com,"Week 1 (2024-10-01)",Weekly Cohort Call,3 - Highly engaged,Great session,Yes,IPFS,Working on documentation,Yes,2
Bob,bob456,bob@test.com,"Week 1 (2024-10-01)",Weekly Cohort Call,2 - Participated occasionally,Good discussion,Yes,Libp2p,Code review,Yes,1`),
    });
  }
  if (url.includes('cohort-2')) {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`Name,Github Username,Email Address,Program Week,Engagement Tracking,Engagement Participation ,"Which session(s) did you find most informative or impactful, and why?",Tech Partner Collaboration?,Which Tech Partner,Describe your work with the tech partner,"Did you work on an issue, PR, or project this week?","How many issues, PRs, or projects this week?"
Carol,carol789,carol@test.com,"Week 1 (2024-01-13)",Weekly Standup,3 - Highly engaged,Onboarding was great,Yes,Drand,Started looking at issues,Yes,1
Dave,dave101,dave@test.com,"Week 1 (2024-01-13)",Weekly Standup,3 - Highly engaged,Technical discussion was helpful,Yes,Fil-B,Working on PR,Yes,2`),
    });
  }
  return Promise.resolve({
    ok: false,
    text: () => Promise.reject(new Error('Not found')),
  });
}) as jest.Mock;

// Mock the data processing functions
jest.mock('@/lib/data-processing', () => ({
  processData: jest.fn((data) => {
    const techPartners = new Set(data.map((d: any) => d['Which Tech Partner']));
    return {
      weeklyChange: 0,
      activeContributors: data.length,
      totalContributions: data.reduce(
        (acc: number, curr: any) =>
          acc +
          parseInt(
            curr['How many issues, PRs, or projects this week?'] || '0',
            10
          ),
        0
      ),
      programHealth: {
        activeTechPartners: techPartners.size,
        npsScore: 0,
        engagementRate: 0,
      },
      keyHighlights: {
        activeContributorsAcrossTechPartners: `${data.length} active contributors across ${techPartners.size} tech partners`,
        totalContributions: `${data.reduce((acc: number, curr: any) => acc + parseInt(curr['How many issues, PRs, or projects this week?'] || '0', 10), 0)} total contributions`,
        positiveFeedback: '0 positive feedback',
        weeklyContributions: '0% increase in weekly contributions',
      },
      feedbackSentiment: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      engagementTrends: [
        {
          week: 'Week 1',
          total: data.length,
          'High Engagement': data.filter((d: any) =>
            d['Engagement Participation ']?.includes('3')
          ).length,
          'Medium Engagement': data.filter((d: any) =>
            d['Engagement Participation ']?.includes('2')
          ).length,
          'Low Engagement': data.filter((d: any) =>
            d['Engagement Participation ']?.includes('1')
          ).length,
        },
      ],
      technicalProgress: [
        {
          week: 'Week 1',
          'Total Issues': data.reduce(
            (acc: number, curr: any) =>
              acc +
              parseInt(
                curr['How many issues, PRs, or projects this week?'] || '0',
                10
              ),
            0
          ),
        },
      ],
      issueMetrics: [
        {
          week: 'Week 1',
          open: 0,
          closed: 0,
          total: 0,
        },
      ],
      topPerformers: [],
      actionItems: [],
      techPartnerMetrics: data.map((d: any) => ({
        partner: d['Which Tech Partner'],
        totalIssues: parseInt(
          d['How many issues, PRs, or projects this week?'] || '0',
          10
        ),
        activeContributors: 1,
        avgIssuesPerContributor: parseInt(
          d['How many issues, PRs, or projects this week?'] || '0',
          10
        ),
        collaborationScore: 0,
      })),
      techPartnerPerformance: Array.from(techPartners as Set<string>).map(
        (partner) => ({
          partner,
          issues: data
            .filter((d: any) => d['Which Tech Partner'] === partner)
            .reduce(
              (acc: number, curr: any) =>
                acc +
                parseInt(
                  curr['How many issues, PRs, or projects this week?'] || '0',
                  10
                ),
              0
            ),
          contributors: data.filter(
            (d: any) => d['Which Tech Partner'] === partner
          ).length,
          engagement: 0,
          weeklyChange: 0,
        })
      ),
      contributorGrowth: [
        {
          week: 'Week 1',
          newContributors: data.length,
          returningContributors: 0,
          totalActive: data.length,
        },
      ],
      rawEngagementData: data,
    };
  }),
  loadCohortData: jest.requireActual('@/lib/data-processing').loadCohortData,
}));

describe('Cohort Switching', () => {
  // Helper functions for common setup and actions
  const renderDashboard = () => {
    return render(
      <TooltipProvider>
        <DashboardSystemProvider>
          <DeveloperEngagementDashboard />
        </DashboardSystemProvider>
      </TooltipProvider>
    );
  };

  const switchCohort = async (
    user: ReturnType<typeof userEvent.setup>,
    targetCohort: string
  ) => {
    // Find and click the cohort selector
    const cohortSelector = screen.getByRole('combobox', {
      name: /cohort selector/i,
    });
    await user.click(cohortSelector);

    // Wait for the listbox to be visible and select the target cohort
    await waitFor(async () => {
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      const option = within(listbox).getByRole('option', {
        name: new RegExp(targetCohort, 'i'),
      });
      await user.click(option);
    });
  };

  const waitForDataLoad = async () => {
    // Wait for loading state to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading CSV data/i)).not.toBeInTheDocument();
    });

    // Wait for data to be processed and displayed
    await waitFor(
      () => {
        expect(
          screen.getByText(/active contributors across/i)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should load and switch between cohorts', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Initial load (Cohort 2)
    await waitForDataLoad();

    // Verify we're on Cohort 2
    const cohortSelector = screen.getByRole('combobox', {
      name: /cohort selector/i,
    });
    expect(cohortSelector).toHaveTextContent(/Cohort 2/i);
    expect(
      screen.getByText(/2 active contributors across 2 tech partners/i)
    ).toBeInTheDocument();

    // Switch to Cohort 1
    await switchCohort(user, 'Cohort 1');
    await waitForDataLoad();

    // Wait for and verify we're on Cohort 1
    await waitFor(() => {
      const updatedSelector = screen.getByRole('combobox', {
        name: /cohort selector/i,
      });
      expect(updatedSelector).toHaveTextContent(/Cohort 1/i);
    });
    expect(
      screen.getByText(/2 active contributors across 2 tech partners/i)
    ).toBeInTheDocument();

    // Verify fetch was called for each cohort
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('cohort-2')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('cohort-1')
    );
  });

  it('should show error message when data loading fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to load cohort data')
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  it('should handle loading state during cohort switching', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Initial load
    await waitForDataLoad();

    // Switch cohorts and verify loading state
    await switchCohort(user, 'Cohort 1');
    await waitForDataLoad();

    // Verify data was updated
    expect(
      screen.getByText(/2 active contributors across 2 tech partners/i)
    ).toBeInTheDocument();
  });
});
