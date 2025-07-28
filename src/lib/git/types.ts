/**
 * Common types for GitHub and GitLab integrations
 * Unified interfaces for cross-platform compatibility
 */

export interface GitPlatformConfig {
  baseUrl: string;
  token: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitEnabled?: boolean;
}

export interface Repository {
  id: number | string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  cloneUrl: string;
  sshUrl: string;
  private: boolean;
  fork: boolean;
  defaultBranch: string;
  language?: string;
  starCount: number;
  forkCount: number;
  issueCount: number;
  createdAt: string;
  updatedAt: string;
  pushedAt?: string;
  owner: RepositoryOwner;
  topics: string[];
  archived: boolean;
  disabled: boolean;
  size: number; // in KB
  openIssuesCount: number;
  visibility: 'public' | 'private' | 'internal';
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
  license?: {
    key: string;
    name: string;
    spdxId?: string;
  };
}

export interface RepositoryOwner {
  id: number | string;
  login: string;
  name?: string;
  type: 'User' | 'Organization';
  avatarUrl: string;
  url: string;
}

export interface Issue {
  id: number | string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: Label[];
  assignees: User[];
  author: User;
  milestone?: Milestone;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  url: string;
  repository: {
    name: string;
    fullName: string;
    url: string;
  };
  comments: number;
  locked: boolean;
  draft?: boolean;
  stateReason?: 'completed' | 'not_planned' | 'reopened';
}

export interface PullRequest {
  id: number | string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  labels: Label[];
  assignees: User[];
  reviewers: User[];
  author: User;
  milestone?: Milestone;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
  url: string;
  repository: {
    name: string;
    fullName: string;
    url: string;
  };
  head: Branch;
  base: Branch;
  mergeable?: boolean;
  rebaseable?: boolean;
  mergeableState?: 'clean' | 'dirty' | 'unstable' | 'blocked';
  merged: boolean;
  mergedBy?: User;
  comments: number;
  reviewComments: number;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface Branch {
  name: string;
  ref: string;
  sha: string;
  repository: {
    name: string;
    fullName: string;
  };
  user: User;
}

export interface User {
  id: number | string;
  login: string;
  name?: string;
  email?: string;
  avatarUrl: string;
  url: string;
  type?: 'User' | 'Organization' | 'Bot';
  company?: string;
  location?: string;
  bio?: string;
  blog?: string;
  twitterUsername?: string;
  publicRepos?: number;
  publicGists?: number;
  followers?: number;
  following?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Label {
  id: number | string;
  name: string;
  description?: string;
  color: string;
  default?: boolean;
}

export interface Milestone {
  id: number | string;
  number?: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  closedAt?: string;
  creator: User;
  openIssues: number;
  closedIssues: number;
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  htmlUrl: string;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
  }>;
  verification?: {
    verified: boolean;
    reason: string;
    signature?: string;
    payload?: string;
  };
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface Release {
  id: number | string;
  tagName: string;
  name: string;
  body?: string;
  draft: boolean;
  prerelease: boolean;
  createdAt: string;
  publishedAt?: string;
  author: User;
  url: string;
  htmlUrl: string;
  assets: ReleaseAsset[];
  tarballUrl: string;
  zipballUrl: string;
}

export interface ReleaseAsset {
  id: number | string;
  name: string;
  label?: string;
  contentType: string;
  size: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
  uploader: User;
}

export interface SearchOptions {
  query: string;
  sort?: 'updated' | 'created' | 'pushed' | 'full_name' | 'stars';
  order?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  type?: 'all' | 'owner' | 'member';
}

export interface SearchResults<T> {
  totalCount: number;
  incompleteResults: boolean;
  items: T[];
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  resource: string;
}

export interface WebhookPayload {
  action: string;
  repository: Repository;
  sender: User;
  installation?: {
    id: number;
    account: User;
  };
  [key: string]: any;
}

export interface IssueWebhookPayload extends WebhookPayload {
  issue: Issue;
  changes?: Record<string, { from: any; to?: any }>;
  assignee?: User;
  label?: Label;
}

export interface PullRequestWebhookPayload extends WebhookPayload {
  pullRequest: PullRequest;
  changes?: Record<string, { from: any; to?: any }>;
  requestedReviewer?: User;
  requestedTeam?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface GitError extends Error {
  status?: number;
  response?: {
    status: number;
    statusText: string;
    data?: any;
    headers?: Record<string, string>;
  };
  rateLimitReset?: number;
  platform: 'github' | 'gitlab';
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  rateLimitInfo?: RateLimitInfo;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  maxPages?: number;
  autoPage?: boolean;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  refresh?: boolean;
  tags?: string[];
}

export interface RequestOptions extends PaginationOptions, CacheOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

// Platform-specific type mappings
export type GitHubRepository = Repository & {
  platform: 'github';
  nodeId: string;
  gitUrl: string;
  svnUrl: string;
  homepage?: string;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  hasDownloads: boolean;
  allowForking?: boolean;
  isTemplate?: boolean;
  webCommitSignoffRequired?: boolean;
  subscribersCount?: number;
  networkCount?: number;
  watchersCount: number;
};

export type GitLabRepository = Repository & {
  platform: 'gitlab';
  pathWithNamespace: string;
  webUrl: string;
  readmeUrl?: string;
  avatarUrl?: string;
  tagList: string[];
  issuesEnabled: boolean;
  mergeRequestsEnabled: boolean;
  wikiEnabled: boolean;
  jobsEnabled: boolean;
  snippetsEnabled: boolean;
  resolveOutdatedDiffDiscussions?: boolean;
  containerRegistryEnabled?: boolean;
  creatorId: number;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    fullPath: string;
    parentId?: number;
    avatarUrl?: string;
    webUrl: string;
  };
  importStatus?: string;
  importError?: string;
  statistics?: {
    commitCount: number;
    storageSize: number;
    repositorySize: number;
    lfsObjectsSize: number;
    jobArtifactsSize: number;
  };
};

// Utility types
export type RepositoryIdentifier = string | { owner: string; repo: string };
export type IssueIdentifier = { owner: string; repo: string; number: number };
export type PullRequestIdentifier = IssueIdentifier;

export interface GitProviderOptions {
  github?: GitPlatformConfig;
  gitlab?: GitPlatformConfig;
  defaultPlatform?: 'github' | 'gitlab';
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  rateLimit?: {
    enabled: boolean;
    requests: number;
    window: number;
  };
}

// Export utility functions
export type ParsedRepository = {
  platform: 'github' | 'gitlab';
  owner: string;
  repo: string;
  fullName: string;
};

export type GitProvider = {
  platform: 'github' | 'gitlab';
  getRepository(identifier: RepositoryIdentifier): Promise<Repository>;
  searchRepositories(options: SearchOptions): Promise<SearchResults<Repository>>;
  getIssues(identifier: RepositoryIdentifier, options?: RequestOptions): Promise<Issue[]>;
  getIssue(identifier: IssueIdentifier): Promise<Issue>;
  getPullRequests(identifier: RepositoryIdentifier, options?: RequestOptions): Promise<PullRequest[]>;
  getPullRequest(identifier: PullRequestIdentifier): Promise<PullRequest>;
  getUser(username: string): Promise<User>;
  getRateLimit(): Promise<RateLimitInfo>;
};