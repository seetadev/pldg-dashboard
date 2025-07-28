import { NextRequest, NextResponse } from 'next/server';
import { GitHubData } from '@/types/dashboard';
import { withMiddleware } from '@/lib/middleware';
import { Logger } from '@/lib/logger';

const PROJECT_ID = '7';
const USERNAME = 'kt-wawro';

const COLUMN_STATUS = {
  'In Progress': 'In Progress',
  'In Review': 'In Progress',
  Done: 'Done',
  Backlog: 'Todo',
  Tirage: 'Todo',
} as const;

interface ProjectItem {
  id: string;
  fieldValues: {
    nodes: Array<{
      field?: {
        name?: string;
      };
      name?: string;
    }>;
  };
  content?: {
    title: string;
    state: string;
    createdAt: string;
    closedAt: string | null;
    assignees?: {
      nodes: Array<{ login: string }>;
    };
  };
}

const logger = Logger.getInstance();

async function handleGET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    logger.info('GitHub data request started', {
      requestId,
      operation: 'github_data_fetch',
      projectId: PROJECT_ID,
      username: USERNAME,
    });

    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GitHub token not found');
    }

    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'PLDG-Dashboard',
    };

    const projectQuery = {
      query: `
        query {
          user(login: "${USERNAME}") {
            projectV2(number: ${PROJECT_ID}) {
              items(first: 100) {
                nodes {
                  id
                  fieldValues(first: 8) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                        name
                      }
                    }
                  }
                  content {
                    ... on Issue {
                      title
                      state
                      createdAt
                      closedAt
                      assignees(first: 1) {
                        nodes {
                          login
                        }
                      }
                    }
                    ... on PullRequest {
                      title
                      state
                      createdAt
                      closedAt
                      assignees(first: 1) {
                        nodes {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    };

    const apiStartTime = Date.now();
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify(projectQuery),
    });

    const apiDuration = Date.now() - apiStartTime;

    logger.logExternalAPI('github', 'https://api.github.com/graphql', 'POST', response.status, apiDuration, {
      requestId,
      rateLimit: {
        limit: response.headers.get('x-ratelimit-limit'),
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset'),
      }
    });

    if (!response.ok) {
      logger.warn('GitHub API error response', {
        requestId,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const rawData = await response.json();

    if (!rawData?.data?.user?.projectV2?.items?.nodes) {
      logger.error('Invalid GitHub response structure', undefined, {
        requestId,
        hasData: !!rawData.data,
        hasUser: !!rawData.data?.user,
        hasProject: !!rawData.data?.user?.projectV2,
        hasItems: !!rawData.data?.user?.projectV2?.items,
      });
      throw new Error('Invalid response structure from GitHub');
    }

    const items = rawData.data.user.projectV2.items.nodes as ProjectItem[];

    // Add type annotation for item parameters
    const statusCounts = {
      todo: items.filter((item: ProjectItem) => getItemStatus(item) === 'Todo')
        .length,
      inProgress: items.filter(
        (item: ProjectItem) => getItemStatus(item) === 'In Progress'
      ).length,
      done: items.filter((item: ProjectItem) => getItemStatus(item) === 'Done')
        .length,
    };

    const responseData: GitHubData = {
      project: rawData.data,
      issues: items.map((item: ProjectItem) => ({
        id: item.id,
        title: item.content?.title || '',
        state: item.content?.state || '',
        created_at: item.content?.createdAt || '',
        closed_at: item.content?.closedAt || null,
        status: getItemStatus(item),
        assignee: item.content?.assignees?.nodes[0] || undefined,
      })),
      statusGroups: statusCounts,
      timestamp: Date.now(),
    };

    const totalDuration = Date.now() - startTime;
    logger.info('GitHub data fetched successfully', {
      requestId,
      duration: totalDuration,
      apiDuration,
      itemCount: items.length,
      statusCounts,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('GitHub API error', error as Error, {
      requestId,
      duration,
      operation: 'github_data_fetch',
    });

    // Return a properly structured empty response
    return NextResponse.json({
      project: {
        user: {
          projectV2: {
            items: {
              nodes: [],
            },
          },
        },
      },
      issues: [],
      statusGroups: {
        todo: 0,
        inProgress: 0,
        done: 0,
      },
      timestamp: Date.now(),
    } as GitHubData);
  }
}

export const GET = withMiddleware(handleGET);

function getItemStatus(item: ProjectItem): string {
  try {
    const statusField = item.fieldValues.nodes.find(
      (node) => node.field?.name?.toLowerCase() === 'status'
    );
    const columnStatus = statusField?.name;

    if (!columnStatus) {
      console.warn('No status found for item:', item.id);
      return 'Todo';
    }

    return COLUMN_STATUS[columnStatus as keyof typeof COLUMN_STATUS] || 'Todo';
  } catch (error) {
    console.error('Error getting item status:', {
      itemId: item.id,
      error,
    });
    return 'Todo';
  }
}
