/**
 * GitHub API Integration
 * Comprehensive GitHub API wrapper with advanced features
 */

import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { requestLog } from '@octokit/plugin-request-log';
import { createAppAuth } from '@octokit/auth-app';
import { createTokenAuth } from '@octokit/auth-token';

import {
  Repository,
  GitHubRepository,
  Issue,
  PullRequest,
  User,
  Commit,
  Release,
  SearchOptions,
  SearchResults,
  RateLimitInfo,
  RequestOptions,
  RepositoryIdentifier,
  IssueIdentifier,
  PullRequestIdentifier,
  GitProvider,
  WebhookPayload,
} from './git/types';

import {
  GitPlatformError,
  HttpClient,
  ApiCache,
  RateLimiter,
  parseRepositoryIdentifier,
  omitUndefined,
  isValidToken,
  validateEnvironment,
} from './git/utils';

// Create enhanced Octokit with plugins
const EnhancedOctokit = Octokit.plugin(throttling, retry, requestLog);

/**
 * GitHub API Configuration
 */
export interface GitHubConfig {
  token?: string;
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitEnabled?: boolean;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  logRequests?: boolean;
  // App authentication (for GitHub Apps)
  appId?: number;
  privateKey?: string;
  installationId?: number;
  clientId?: string;
  clientSecret?: string;
}

/**
 * GitHub API Client
 */
export class GitHubClient implements GitProvider {
  public readonly platform = 'github' as const;
  private octokit: InstanceType<typeof EnhancedOctokit>;
  private httpClient: HttpClient;
  private cache: ApiCache;
  private rateLimiter: RateLimiter;
  private config: Required<GitHubConfig>;

  constructor(config: GitHubConfig = {}) {
    // Merge with defaults
    this.config = {
      token: process.env.GITHUB_TOKEN || '',
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
      userAgent: process.env.GIT_USER_AGENT || 'PLDG-Dashboard/1.0',
      timeout: parseInt(process.env.GIT_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.GIT_RETRY_ATTEMPTS || '3'),
      rateLimitEnabled: process.env.GIT_RATE_LIMIT_ENABLED !== 'false',
      cacheEnabled: process.env.GIT_CACHE_ENABLED !== 'false',
      cacheTtl: parseInt(process.env.GIT_CACHE_TTL || '300000'),
      logRequests: process.env.GIT_LOG_REQUESTS === 'true',
      ...omitUndefined(config),
    };

    // Validate configuration
    this.validateConfig();

    // Initialize utilities
    this.httpClient = new HttpClient(
      this.config.userAgent,
      this.config.timeout,
      this.config.retryAttempts
    );
    
    this.cache = new ApiCache(this.config.cacheTtl);
    this.rateLimiter = new RateLimiter();

    // Initialize Octokit
    this.initializeOctokit();
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const { isValid, errors } = validateEnvironment();
    
    if (!isValid) {
      throw new GitPlatformError(
        `GitHub configuration invalid: ${errors.join(', ')}`,
        'github'
      );
    }

    if (this.config.token && !isValidToken(this.config.token, 'github')) {
      throw new GitPlatformError('Invalid GitHub token format', 'github');
    }
  }

  /**
   * Initialize Octokit with proper authentication and plugins
   */
  private initializeOctokit(): void {
    const authConfig = this.getAuthConfig();
    
    this.octokit = new EnhancedOctokit({
      ...authConfig,
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      request: {
        timeout: this.config.timeout,
      },
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          this.octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );

          // Retry twice after hitting rate limit
          if (options.request.retryCount === 0) {
            this.octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onAbuseLimit: (retryAfter: number, options: any) => {
          this.octokit.log.warn(
            `Abuse detected for request ${options.method} ${options.url}`
          );
        },
      },
      retry: {
        doNotRetry: ['429'], // Let throttling plugin handle rate limits
      },
      log: this.config.logRequests ? console : undefined,
    });
  }

  /**
   * Get authentication configuration
   */
  private getAuthConfig(): any {
    // App authentication (GitHub Apps)
    if (this.config.appId && this.config.privateKey) {
      return {
        authStrategy: createAppAuth,
        auth: {
          appId: this.config.appId,
          privateKey: this.config.privateKey,
          installationId: this.config.installationId,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        },
      };
    }

    // Token authentication (Personal Access Tokens, etc.)
    if (this.config.token) {
      return {
        authStrategy: createTokenAuth,
        auth: this.config.token,
      };
    }

    // No authentication
    return {};
  }

  /**
   * Make cached API request
   */
  private async makeRequest<T>(
    key: string,
    request: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const cacheKey = `github:${key}`;
    
    // Check cache first
    if (this.config.cacheEnabled && !options.refresh) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Check rate limit
    if (this.config.rateLimitEnabled && !this.rateLimiter.isWithinLimit('github')) {
      const resetTime = this.rateLimiter.getResetTime('github');
      throw new GitPlatformError(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`,
        'github',
        429
      );
    }

    try {
      // Make request
      const result = await request();
      
      // Record rate limit usage
      if (this.config.rateLimitEnabled) {
        this.rateLimiter.recordRequest('github');
      }

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(
          cacheKey,
          result,
          options.ttl || this.config.cacheTtl,
          options.tags
        );
      }

      return result;
    } catch (error) {
      // Transform errors
      if (error instanceof Error) {
        throw new GitPlatformError(error.message, 'github');
      }
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(identifier: RepositoryIdentifier): Promise<GitHubRepository> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    return this.makeRequest(
      `repo:${parsed.fullName}`,
      async () => {
        const { data } = await this.octokit.rest.repos.get({
          owner: parsed.owner,
          repo: parsed.repo,
        });

        return this.transformRepository(data);
      }
    );
  }

  /**
   * Search repositories
   */
  async searchRepositories(options: SearchOptions): Promise<SearchResults<GitHubRepository>> {
    const { query, sort = 'updated', order = 'desc', page = 1, perPage = 30 } = options;

    return this.makeRequest(
      `search:repos:${query}:${sort}:${order}:${page}:${perPage}`,
      async () => {
        const { data } = await this.octokit.rest.search.repos({
          q: query,
          sort: sort === 'full_name' ? 'name' : sort as any,
          order: order as any,
          page,
          per_page: perPage,
        });

        return {
          totalCount: data.total_count,
          incompleteResults: data.incomplete_results,
          items: data.items.map(repo => this.transformRepository(repo)),
          page,
          perPage,
          hasNext: data.items.length === perPage && data.total_count > page * perPage,
          hasPrevious: page > 1,
        };
      }
    );
  }

  /**
   * Get repository issues
   */
  async getIssues(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      state?: 'open' | 'closed' | 'all';
      labels?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      since?: string;
      assignee?: string;
      creator?: string;
      mentioned?: string;
    } = {}
  ): Promise<Issue[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    const {
      state = 'open',
      labels,
      sort = 'created',
      direction = 'desc',
      since,
      assignee,
      creator,
      mentioned,
      page = 1,
      perPage = 30,
      ...requestOptions
    } = options;

    return this.makeRequest(
      `issues:${parsed.fullName}:${state}:${page}:${perPage}`,
      async () => {
        const { data } = await this.octokit.rest.issues.listForRepo({
          owner: parsed.owner,
          repo: parsed.repo,
          state: state as any,
          labels,
          sort: sort as any,
          direction: direction as any,
          since,
          assignee,
          creator,
          mentioned,
          page,
          per_page: perPage,
        });

        return data
          .filter(issue => !issue.pull_request) // Filter out pull requests
          .map(issue => this.transformIssue(issue, parsed));
      },
      requestOptions
    );
  }

  /**
   * Get specific issue
   */
  async getIssue(identifier: IssueIdentifier): Promise<Issue> {
    return this.makeRequest(
      `issue:${identifier.owner}:${identifier.repo}:${identifier.number}`,
      async () => {
        const { data } = await this.octokit.rest.issues.get({
          owner: identifier.owner,
          repo: identifier.repo,
          issue_number: identifier.number,
        });

        if (data.pull_request) {
          throw new GitPlatformError('This is a pull request, not an issue', 'github', 400);
        }

        return this.transformIssue(data, {
          owner: identifier.owner,
          repo: identifier.repo,
          fullName: `${identifier.owner}/${identifier.repo}`,
          platform: 'github',
        });
      }
    );
  }

  /**
   * Get repository pull requests
   */
  async getPullRequests(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
    } = {}
  ): Promise<PullRequest[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    const {
      state = 'open',
      head,
      base,
      sort = 'created',
      direction = 'desc',
      page = 1,
      perPage = 30,
      ...requestOptions
    } = options;

    return this.makeRequest(
      `pulls:${parsed.fullName}:${state}:${page}:${perPage}`,
      async () => {
        const { data } = await this.octokit.rest.pulls.list({
          owner: parsed.owner,
          repo: parsed.repo,
          state: state as any,
          head,
          base,
          sort: sort as any,
          direction: direction as any,
          page,
          per_page: perPage,
        });

        return data.map(pr => this.transformPullRequest(pr, parsed));
      },
      requestOptions
    );
  }

  /**
   * Get specific pull request
   */
  async getPullRequest(identifier: PullRequestIdentifier): Promise<PullRequest> {
    return this.makeRequest(
      `pr:${identifier.owner}:${identifier.repo}:${identifier.number}`,
      async () => {
        const { data } = await this.octokit.rest.pulls.get({
          owner: identifier.owner,
          repo: identifier.repo,
          pull_number: identifier.number,
        });

        return this.transformPullRequest(data, {
          owner: identifier.owner,
          repo: identifier.repo,
          fullName: `${identifier.owner}/${identifier.repo}`,
          platform: 'github',
        });
      }
    );
  }

  /**
   * Get user information
   */
  async getUser(username: string): Promise<User> {
    return this.makeRequest(
      `user:${username}`,
      async () => {
        const { data } = await this.octokit.rest.users.getByUsername({
          username,
        });

        return this.transformUser(data);
      }
    );
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(): Promise<User> {
    return this.makeRequest(
      'user:authenticated',
      async () => {
        const { data } = await this.octokit.rest.users.getAuthenticated();
        return this.transformUser(data);
      }
    );
  }

  /**
   * Get repository commits
   */
  async getCommits(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
    } = {}
  ): Promise<Commit[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    const {
      sha,
      path,
      author,
      since,
      until,
      page = 1,
      perPage = 30,
      ...requestOptions
    } = options;

    return this.makeRequest(
      `commits:${parsed.fullName}:${sha || 'default'}:${page}:${perPage}`,
      async () => {
        const { data } = await this.octokit.rest.repos.listCommits({
          owner: parsed.owner,
          repo: parsed.repo,
          sha,
          path,
          author,
          since,
          until,
          page,
          per_page: perPage,
        });

        return data.map(commit => this.transformCommit(commit));
      },
      requestOptions
    );
  }

  /**
   * Get repository releases
   */
  async getReleases(
    identifier: RepositoryIdentifier,
    options: RequestOptions = {}
  ): Promise<Release[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    const { page = 1, perPage = 30, ...requestOptions } = options;

    return this.makeRequest(
      `releases:${parsed.fullName}:${page}:${perPage}`,
      async () => {
        const { data } = await this.octokit.rest.repos.listReleases({
          owner: parsed.owner,
          repo: parsed.repo,
          page,
          per_page: perPage,
        });

        return data.map(release => this.transformRelease(release));
      },
      requestOptions
    );
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      
      return {
        limit: data.resources.core.limit,
        remaining: data.resources.core.remaining,
        reset: data.resources.core.reset,
        used: data.resources.core.used,
        resource: 'core',
      };
    } catch (error) {
      throw new GitPlatformError(
        `Failed to get rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'github'
      );
    }
  }

  /**
   * Create issue
   */
  async createIssue(
    identifier: RepositoryIdentifier,
    data: {
      title: string;
      body?: string;
      assignees?: string[];
      milestone?: number;
      labels?: string[];
    }
  ): Promise<Issue> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'github', 400);
    }

    try {
      const { data: issue } = await this.octokit.rest.issues.create({
        owner: parsed.owner,
        repo: parsed.repo,
        ...data,
      });

      // Clear related cache
      this.cache.clearByTags([`issues:${parsed.fullName}`]);

      return this.transformIssue(issue, parsed);
    } catch (error) {
      throw new GitPlatformError(
        `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'github'
      );
    }
  }

  /**
   * Update issue
   */
  async updateIssue(
    identifier: IssueIdentifier,
    data: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      assignees?: string[];
      milestone?: number | null;
      labels?: string[];
    }
  ): Promise<Issue> {
    try {
      const { data: issue } = await this.octokit.rest.issues.update({
        owner: identifier.owner,
        repo: identifier.repo,
        issue_number: identifier.number,
        ...data,
      });

      // Clear related cache
      this.cache.clearByTags([
        `issue:${identifier.owner}:${identifier.repo}:${identifier.number}`,
        `issues:${identifier.owner}/${identifier.repo}`,
      ]);

      return this.transformIssue(issue, {
        owner: identifier.owner,
        repo: identifier.repo,
        fullName: `${identifier.owner}/${identifier.repo}`,
        platform: 'github',
      });
    } catch (error) {
      throw new GitPlatformError(
        `Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'github'
      );
    }
  }

  /**
   * Validate webhook payload
   */
  validateWebhookPayload(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Process webhook payload
   */
  processWebhookPayload(payload: WebhookPayload): {
    event: string;
    action: string;
    repository: Repository;
    data: any;
  } {
    const event = payload.action || 'unknown';
    
    return {
      event,
      action: payload.action,
      repository: this.transformRepository(payload.repository as any),
      data: payload,
    };
  }

  // Private transformation methods
  private transformRepository(data: any): GitHubRepository {
    return {
      platform: 'github',
      id: data.id,
      nodeId: data.node_id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
      gitUrl: data.git_url,
      svnUrl: data.svn_url,
      private: data.private,
      fork: data.fork,
      defaultBranch: data.default_branch,
      language: data.language,
      starCount: data.stargazers_count,
      forkCount: data.forks_count,
      issueCount: data.open_issues_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      owner: {
        id: data.owner.id,
        login: data.owner.login,
        name: data.owner.name,
        type: data.owner.type as 'User' | 'Organization',
        avatarUrl: data.owner.avatar_url,
        url: data.owner.html_url,
      },
      topics: data.topics || [],
      archived: data.archived,
      disabled: data.disabled,
      size: data.size,
      openIssuesCount: data.open_issues_count,
      visibility: data.visibility || (data.private ? 'private' : 'public'),
      homepage: data.homepage,
      hasIssues: data.has_issues,
      hasProjects: data.has_projects,
      hasWiki: data.has_wiki,
      hasPages: data.has_pages,
      hasDownloads: data.has_downloads,
      allowForking: data.allow_forking,
      isTemplate: data.is_template,
      webCommitSignoffRequired: data.web_commit_signoff_required,
      subscribersCount: data.subscribers_count,
      networkCount: data.network_count,
      watchersCount: data.watchers_count,
      permissions: data.permissions ? {
        admin: data.permissions.admin,
        maintain: data.permissions.maintain,
        push: data.permissions.push,
        triage: data.permissions.triage,
        pull: data.permissions.pull,
      } : undefined,
      license: data.license ? {
        key: data.license.key,
        name: data.license.name,
        spdxId: data.license.spdx_id,
      } : undefined,
    };
  }

  private transformIssue(data: any, repo: { owner: string; repo: string; fullName: string }): Issue {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      labels: data.labels?.map(this.transformLabel) || [],
      assignees: data.assignees?.map(this.transformUser) || [],
      author: this.transformUser(data.user),
      milestone: data.milestone ? this.transformMilestone(data.milestone) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      url: data.html_url,
      repository: {
        name: repo.repo,
        fullName: repo.fullName,
        url: `https://github.com/${repo.fullName}`,
      },
      comments: data.comments,
      locked: data.locked,
      stateReason: data.state_reason,
    };
  }

  private transformPullRequest(data: any, repo: { owner: string; repo: string; fullName: string }): PullRequest {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.merged ? 'merged' : data.state,
      draft: data.draft,
      labels: data.labels?.map(this.transformLabel) || [],
      assignees: data.assignees?.map(this.transformUser) || [],
      reviewers: data.requested_reviewers?.map(this.transformUser) || [],
      author: this.transformUser(data.user),
      milestone: data.milestone ? this.transformMilestone(data.milestone) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      mergedAt: data.merged_at,
      url: data.html_url,
      repository: {
        name: repo.repo,
        fullName: repo.fullName,
        url: `https://github.com/${repo.fullName}`,
      },
      head: this.transformBranch(data.head),
      base: this.transformBranch(data.base),
      mergeable: data.mergeable,
      rebaseable: data.rebaseable,
      mergeableState: data.mergeable_state,
      merged: data.merged,
      mergedBy: data.merged_by ? this.transformUser(data.merged_by) : undefined,
      comments: data.comments,
      reviewComments: data.review_comments,
      commits: data.commits,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
    };
  }

  private transformUser(data: any): User {
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      url: data.html_url,
      type: data.type,
      company: data.company,
      location: data.location,
      bio: data.bio,
      blog: data.blog,
      twitterUsername: data.twitter_username,
      publicRepos: data.public_repos,
      publicGists: data.public_gists,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private transformLabel(data: any): any {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      default: data.default,
    };
  }

  private transformMilestone(data: any): any {
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      description: data.description,
      state: data.state,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      dueDate: data.due_on,
      closedAt: data.closed_at,
      creator: this.transformUser(data.creator),
      openIssues: data.open_issues,
      closedIssues: data.closed_issues,
    };
  }

  private transformBranch(data: any): any {
    return {
      name: data.ref,
      ref: data.ref,
      sha: data.sha,
      repository: {
        name: data.repo.name,
        fullName: data.repo.full_name,
      },
      user: this.transformUser(data.user),
    };
  }

  private transformCommit(data: any): Commit {
    return {
      sha: data.sha,
      message: data.commit.message,
      author: {
        name: data.commit.author.name,
        email: data.commit.author.email,
        date: data.commit.author.date,
      },
      committer: {
        name: data.commit.committer.name,
        email: data.commit.committer.email,
        date: data.commit.committer.date,
      },
      url: data.url,
      htmlUrl: data.html_url,
      tree: {
        sha: data.commit.tree.sha,
        url: data.commit.tree.url,
      },
      parents: data.parents || [],
      verification: data.commit.verification,
      stats: data.stats,
    };
  }

  private transformRelease(data: any): Release {
    return {
      id: data.id,
      tagName: data.tag_name,
      name: data.name,
      body: data.body,
      draft: data.draft,
      prerelease: data.prerelease,
      createdAt: data.created_at,
      publishedAt: data.published_at,
      author: this.transformUser(data.author),
      url: data.url,
      htmlUrl: data.html_url,
      assets: data.assets?.map(this.transformReleaseAsset) || [],
      tarballUrl: data.tarball_url,
      zipballUrl: data.zipball_url,
    };
  }

  private transformReleaseAsset(data: any): any {
    return {
      id: data.id,
      name: data.name,
      label: data.label,
      contentType: data.content_type,
      size: data.size,
      downloadCount: data.download_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      downloadUrl: data.browser_download_url,
      uploader: this.transformUser(data.uploader),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats() {
    return {
      remaining: this.rateLimiter.getRemaining('github'),
      resetTime: this.rateLimiter.getResetTime('github'),
    };
  }
}

// Create singleton instance
export const githubClient = new GitHubClient();

// Export helper functions
export function createGitHubClient(config?: GitHubConfig): GitHubClient {
  return new GitHubClient(config);
}

// Legacy compatibility - keep existing useGitHubData hook
import useSWR from 'swr';
import { GitHubData } from '@/types/dashboard';

const legacyFetcher = async (): Promise<GitHubData> => {
  const response = await fetch('/api/github');

  if (!response.ok) {
    console.error('GitHub API error:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const rawData = await response.json();

  if (!rawData || !rawData.statusGroups) {
    console.error('Invalid GitHub response format:', {
      hasData: !!rawData,
      statusGroups: rawData?.statusGroups,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid GitHub response format');
  }

  return {
    issues: rawData.issues || [],
    statusGroups: rawData.statusGroups,
    project: rawData.project || {
      user: { projectV2: { items: { nodes: [] } } },
    },
    projectBoard: rawData.projectBoard || {
      issues: [],
      statusGroups: { todo: 0, inProgress: 0, done: 0 },
      project: {},
    },
    userContributions: rawData.userContributions || {},
    timestamp: Date.now(),
  };
};

export function useGitHubData() {
  const { data, error, isValidating, mutate } = useSWR<GitHubData>(
    '/api/github',
    legacyFetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  return {
    data,
    isLoading: !error && !data && isValidating,
    isError: !!error,
    mutate,
    timestamp: data?.timestamp,
  };
}

export default GitHubClient;