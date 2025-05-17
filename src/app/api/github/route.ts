import { NextResponse } from "next/server";
import { GitHubData } from "@/types/dashboard";

const PROJECT_ID = "7";
const USERNAME = "kt-wawro";

const COLUMN_STATUS = {
  "In Progress": "In Progress",
  "In Review": "In Progress",
  Done: "Done",
  Backlog: "Todo",
  Tirage: "Todo",
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

export async function GET() {
  try {
    console.log("GitHub API route called");

    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GitHub token not found");
    }

    console.log("Fetching GitHub Project data...");

    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "PLDG-Dashboard",
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

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify(projectQuery),
    });

    if (!response.ok) {
      console.error("GitHub API Error:", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const rawData = await response.json();

    // Add validation and logging
    console.log("GitHub Raw Response:", {
      hasData: !!rawData?.data?.user?.projectV2,
      itemsCount: rawData?.data?.user?.projectV2?.items?.nodes?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // Validate response structure
    if (!rawData?.data?.user?.projectV2?.items?.nodes) {
      console.error("Invalid GitHub response structure:", rawData);
      throw new Error("Invalid response structure from GitHub");
    }

    const items = rawData.data.user.projectV2.items.nodes as ProjectItem[];

    // Add type annotation for item parameters
    const statusCounts = {
      todo: items.filter((item: ProjectItem) => getItemStatus(item) === "Todo")
        .length,
      inProgress: items.filter(
        (item: ProjectItem) => getItemStatus(item) === "In Progress"
      ).length,
      done: items.filter((item: ProjectItem) => getItemStatus(item) === "Done")
        .length,
    };

    console.log("Status counts:", statusCounts);

    const responseData: GitHubData = {
      project: rawData.data,
      issues: items.map((item: ProjectItem) => ({
        id: item.id,
        title: item.content?.title || "",
        state: item.content?.state || "",
        created_at: item.content?.createdAt || "",
        closed_at: item.content?.closedAt || null,
        status: getItemStatus(item),
        assignee: item.content?.assignees?.nodes[0] || undefined,
      })),
      statusGroups: statusCounts,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("GitHub API error:", {
      error,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown error",
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

function getItemStatus(item: ProjectItem): string {
  try {
    const statusField = item.fieldValues.nodes.find(
      (node) => node.field?.name?.toLowerCase() === "status"
    );
    const columnStatus = statusField?.name;

    if (!columnStatus) {
      console.warn("No status found for item:", item.id);
      return "Todo";
    }

    return COLUMN_STATUS[columnStatus as keyof typeof COLUMN_STATUS] || "Todo";
  } catch (error) {
    console.error("Error getting item status:", {
      itemId: item.id,
      error,
    });
    return "Todo";
  }
}
