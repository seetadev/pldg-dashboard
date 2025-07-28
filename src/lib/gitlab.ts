/**
 * GitLab API Integration
 * Comprehensive GitLab API wrapper with advanced features and automation
 */

import {
  Repository,
  GitLabRepository,
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
  buildUrl,
  omitUndefined,
  isValidToken,
  validateEnvironment,
} from './git/utils';

import { RepositoryOwner } from './git/types';

/**
 * GitLab API Configuration
 */
export interface GitLabConfig {
  token?: string;
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitEnabled?: boolean;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  logRequests?: boolean;
  // OAuth2 authentication
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/**
 * GitLab API Client
 */
export class GitLabClient implements GitProvider {
  public readonly platform = 'gitlab' as const;
  private httpClient: HttpClient;
  private cache: ApiCache;
  private rateLimiter: RateLimiter;
  private config: Required<Omit<GitLabConfig, 'clientId' | 'clientSecret' | 'redirectUri'>> & 
    Pick<GitLabConfig, 'clientId' | 'clientSecret' | 'redirectUri'>;

  constructor(config: GitLabConfig = {}) {
    // Merge with defaults
    this.config = {
      token: process.env.GITLAB_TOKEN || '',
      baseUrl: process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4',
      userAgent: process.env.GIT_USER_AGENT || 'PLDG-Dashboard/1.0',
      timeout: parseInt(process.env.GIT_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.GIT_RETRY_ATTEMPTS || '3'),
      rateLimitEnabled: process.env.GIT_RATE_LIMIT_ENABLED !== 'false',
      cacheEnabled: process.env.GIT_CACHE_ENABLED !== 'false',
      cacheTtl: parseInt(process.env.GIT_CACHE_TTL || '300000'),
      logRequests: process.env.GIT_LOG_REQUESTS === 'true',
      clientId: config.clientId || process.env.GITLAB_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.GITLAB_CLIENT_SECRET,
      redirectUri: config.redirectUri || process.env.GITLAB_REDIRECT_URI,
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
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const { isValid, errors } = validateEnvironment();
    
    if (!isValid) {
      throw new GitPlatformError(
        `GitLab configuration invalid: ${errors.join(', ')}`,
        'gitlab'
      );
    }

    if (this.config.token && !isValidToken(this.config.token, 'gitlab')) {
      throw new GitPlatformError('Invalid GitLab token format', 'gitlab');
    }
  }

  /**
   * Make API request with authentication
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions & {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      refresh,
      ttl,
      tags,
      timeout,
      retries,
      params,
    } = options;

    const cacheKey = `gitlab:${endpoint}:${method}:${JSON.stringify(params || {})}`;
    
    // Check cache first
    if (this.config.cacheEnabled && method === 'GET' && !refresh) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Check rate limit
    if (this.config.rateLimitEnabled && !this.rateLimiter.isWithinLimit('gitlab')) {
      const resetTime = this.rateLimiter.getResetTime('gitlab');
      throw new GitPlatformError(
        `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`,
        'gitlab',
        429
      );
    }

    try {
      // Build URL with parameters
      const url = buildUrl(this.config.baseUrl, endpoint, params);

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'User-Agent': this.config.userAgent,
        'Accept': 'application/json',
        ...headers,
      };

      // Add authentication
      if (this.config.token) {
        requestHeaders['Authorization'] = `Bearer ${this.config.token}`;
      }

      // Add content type for non-GET requests
      if (method !== 'GET' && body) {
        requestHeaders['Content-Type'] = 'application/json';
      }

      // Make request
      const response = await this.httpClient.request<T>(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        timeout: timeout || this.config.timeout,
        retries: retries || this.config.retryAttempts,
        platform: 'gitlab',
      });

      // Record rate limit usage
      if (this.config.rateLimitEnabled) {
        this.rateLimiter.recordRequest('gitlab');
      }

      // Cache successful GET requests
      if (this.config.cacheEnabled && method === 'GET') {
        this.cache.set(
          cacheKey,
          response.data,
          ttl || this.config.cacheTtl,
          tags
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof GitPlatformError) {
        throw error;
      }
      
      throw new GitPlatformError(
        `GitLab API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gitlab'
      );
    }
  }

  /**
   * Get repository information
   */
  async getRepository(identifier: RepositoryIdentifier): Promise<GitLabRepository> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    // GitLab uses URL-encoded project paths
    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    
    const data = await this.makeRequest<any>(`projects/${projectPath}`);
    return this.transformRepository(data);
  }

  /**
   * Search repositories
   */
  async searchRepositories(options: SearchOptions): Promise<SearchResults<GitLabRepository>> {
    const { query, sort = 'updated_at', order = 'desc', page = 1, perPage = 20 } = options;

    const params = {
      search: query,
      order_by: sort === 'updated' ? 'updated_at' : sort,
      sort: order,
      page,
      per_page: perPage,
      simple: false, // Get full project details
    };

    const data = await this.makeRequest<any[]>('projects', { params });

    return {
      totalCount: data.length, // GitLab doesn't provide total count in simple search
      incompleteResults: false,
      items: data.map(repo => this.transformRepository(repo)),
      page,
      perPage,
      hasNext: data.length === perPage,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get repository issues
   */
  async getIssues(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      state?: 'opened' | 'closed' | 'all';
      labels?: string;
      sort?: 'created_at' | 'updated_at';
      order_by?: 'created_at' | 'updated_at';
      sort_order?: 'asc' | 'desc';
      assignee_id?: number;
      author_id?: number;
      created_after?: string;
      created_before?: string;
    } = {}
  ): Promise<Issue[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    
    const {
      state = 'opened',
      labels,
      sort = 'created_at',
      order_by = 'created_at',
      sort_order = 'desc',
      assignee_id,
      author_id,
      created_after,
      created_before,
      page = 1,
      perPage = 20,
      ...requestOptions
    } = options;

    const params = omitUndefined({
      state: state === 'all' ? undefined : state,
      labels,
      sort,
      order_by,
      sort_order,
      assignee_id,
      author_id,
      created_after,
      created_before,
      page,
      per_page: perPage,
    });

    const data = await this.makeRequest<any[]>(
      `projects/${projectPath}/issues`,
      { params, ...requestOptions }
    );

    return data.map(issue => this.transformIssue(issue, parsed));
  }

  /**
   * Get specific issue
   */
  async getIssue(identifier: IssueIdentifier): Promise<Issue> {
    const projectPath = encodeURIComponent(`${identifier.owner}/${identifier.repo}`);
    
    const data = await this.makeRequest<any>(
      `projects/${projectPath}/issues/${identifier.number}`
    );

    return this.transformIssue(data, {
      owner: identifier.owner,
      repo: identifier.repo,
      fullName: `${identifier.owner}/${identifier.repo}`,
    });
  }

  /**
   * Get repository merge requests (pull requests)
   */
  async getPullRequests(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      state?: 'opened' | 'closed' | 'merged' | 'all';
      target_branch?: string;
      source_branch?: string;
      sort?: 'created_at' | 'updated_at';
      order_by?: 'created_at' | 'updated_at';
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<PullRequest[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    
    const {
      state = 'opened',
      target_branch,
      source_branch,
      sort = 'created_at',
      order_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      perPage = 20,
      ...requestOptions
    } = options;

    const params = omitUndefined({
      state: state === 'all' ? undefined : state,
      target_branch,
      source_branch,
      sort,
      order_by,
      sort_order,
      page,
      per_page: perPage,
    });

    const data = await this.makeRequest<any[]>(
      `projects/${projectPath}/merge_requests`,
      { params, ...requestOptions }
    );

    return data.map(mr => this.transformPullRequest(mr, parsed));
  }

  /**
   * Get specific merge request
   */
  async getPullRequest(identifier: PullRequestIdentifier): Promise<PullRequest> {
    const projectPath = encodeURIComponent(`${identifier.owner}/${identifier.repo}`);
    
    const data = await this.makeRequest<any>(
      `projects/${projectPath}/merge_requests/${identifier.number}`
    );

    return this.transformPullRequest(data, {
      owner: identifier.owner,
      repo: identifier.repo,
      fullName: `${identifier.owner}/${identifier.repo}`,
    });
  }

  /**
   * Get user information
   */
  async getUser(username: string): Promise<User> {
    // First try to get user by username
    const users = await this.makeRequest<any[]>('users', {
      params: { username }
    });

    if (users.length === 0) {
      throw new GitPlatformError(`User '${username}' not found`, 'gitlab', 404);
    }

    const userData = users[0];
    
    // Get detailed user information
    const detailedUser = await this.makeRequest<any>(`users/${userData.id}`);
    
    return this.transformUser(detailedUser);
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser(): Promise<User> {
    const data = await this.makeRequest<any>('user');
    return this.transformUser(data);
  }

  /**
   * Get repository commits
   */
  async getCommits(
    identifier: RepositoryIdentifier,
    options: RequestOptions & {
      ref_name?: string;
      since?: string;
      until?: string;
      path?: string;
      author?: string;
      all?: boolean;
    } = {}
  ): Promise<Commit[]> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    
    const {
      ref_name,
      since,
      until,
      path,
      author,
      all,
      page = 1,
      perPage = 20,
      ...requestOptions
    } = options;

    const params = omitUndefined({
      ref_name,
      since,
      until,
      path,
      author,
      all,
      page,
      per_page: perPage,
    });

    const data = await this.makeRequest<any[]>(
      `projects/${projectPath}/repository/commits`,
      { params, ...requestOptions }
    );

    return data.map(commit => this.transformCommit(commit));
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
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    const { page = 1, perPage = 20, ...requestOptions } = options;

    const params = {
      page,
      per_page: perPage,
    };

    const data = await this.makeRequest<any[]>(
      `projects/${projectPath}/releases`,
      { params, ...requestOptions }
    );

    return data.map(release => this.transformRelease(release));
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    // GitLab doesn't have a dedicated rate limit endpoint
    // We'll make a simple request and extract rate limit info from headers
    try {
      const response = await this.makeRequest('user', {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
        },
      });

      const rateLimitInfo = response.rateLimitInfo;
      
      if (rateLimitInfo) {
        return rateLimitInfo;
      }

      // Return default if no rate limit info available
      return {
        limit: 2000, // GitLab default
        remaining: 2000,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 0,
        resource: 'api',
      };
    } catch (error) {
      throw new GitPlatformError(
        `Failed to get rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gitlab'
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
      description?: string;
      assignee_ids?: number[];
      milestone_id?: number;
      labels?: string[];
      due_date?: string;
    }
  ): Promise<Issue> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);

    try {
      const issue = await this.makeRequest<any>(
        `projects/${projectPath}/issues`,
        {
          method: 'POST',
          body: data,
        }
      );

      // Clear related cache
      this.cache.clearByTags([`issues:${parsed.fullName}`]);

      return this.transformIssue(issue, parsed);
    } catch (error) {
      throw new GitPlatformError(
        `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gitlab'
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
      description?: string;
      state_event?: 'close' | 'reopen';
      assignee_ids?: number[];
      milestone_id?: number | null;
      labels?: string[];
      due_date?: string | null;
    }
  ): Promise<Issue> {
    const projectPath = encodeURIComponent(`${identifier.owner}/${identifier.repo}`);

    try {
      const issue = await this.makeRequest<any>(
        `projects/${projectPath}/issues/${identifier.number}`,
        {
          method: 'PUT',
          body: data,
        }
      );

      // Clear related cache
      this.cache.clearByTags([
        `issue:${identifier.owner}:${identifier.repo}:${identifier.number}`,
        `issues:${identifier.owner}/${identifier.repo}`,
      ]);

      return this.transformIssue(issue, {
        owner: identifier.owner,
        repo: identifier.repo,
        fullName: `${identifier.owner}/${identifier.repo}`,
      });
    } catch (error) {
      throw new GitPlatformError(
        `Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gitlab'
      );
    }
  }

  /**
   * Create merge request
   */
  async createMergeRequest(
    identifier: RepositoryIdentifier,
    data: {
      title: string;
      source_branch: string;
      target_branch: string;
      description?: string;
      assignee_ids?: number[];
      reviewer_ids?: number[];
      milestone_id?: number;
      labels?: string[];
      remove_source_branch?: boolean;
    }
  ): Promise<PullRequest> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);

    try {
      const mr = await this.makeRequest<any>(
        `projects/${projectPath}/merge_requests`,
        {
          method: 'POST',
          body: data,
        }
      );

      // Clear related cache
      this.cache.clearByTags([`pulls:${parsed.fullName}`]);

      return this.transformPullRequest(mr, parsed);
    } catch (error) {
      throw new GitPlatformError(
        `Failed to create merge request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gitlab'
      );
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(identifier: RepositoryIdentifier): Promise<{
    commitCount: number;
    storageSize: number;
    repositorySize: number;
    lfsObjectsSize: number;
    jobArtifactsSize: number;
  }> {
    const parsed = parseRepositoryIdentifier(identifier);
    if (!parsed) {
      throw new GitPlatformError('Invalid repository identifier', 'gitlab', 400);
    }

    const projectPath = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
    
    const data = await this.makeRequest<any>(
      `projects/${projectPath}`,
      { params: { statistics: true } }
    );

    return {
      commitCount: data.statistics?.commit_count || 0,
      storageSize: data.statistics?.storage_size || 0,
      repositorySize: data.statistics?.repository_size || 0,
      lfsObjectsSize: data.statistics?.lfs_objects_size || 0,
      jobArtifactsSize: data.statistics?.job_artifacts_size || 0,
    };
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
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
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
  private transformRepository(data: any): GitLabRepository {
    return {
      platform: 'gitlab',
      id: data.id,
      name: data.name,
      fullName: data.path_with_namespace || `${data.namespace?.path}/${data.name}`,
      pathWithNamespace: data.path_with_namespace,
      description: data.description,
      url: data.web_url,
      cloneUrl: data.http_url_to_repo,
      sshUrl: data.ssh_url_to_repo,
      webUrl: data.web_url,
      readmeUrl: data.readme_url,
      avatarUrl: data.avatar_url,
      private: data.visibility === 'private',
      fork: data.forked_from_project != null,
      defaultBranch: data.default_branch,
      language: data.primary_language,
      starCount: data.star_count,
      forkCount: data.forks_count,
      issueCount: data.open_issues_count,
      createdAt: data.created_at,
      updatedAt: data.last_activity_at,
      pushedAt: data.last_activity_at,
      owner: this.transformRepositoryOwner(data.owner || data.namespace),
      topics: data.tag_list || [],
      tagList: data.tag_list || [],
      archived: data.archived,
      disabled: !data.jobs_enabled,
      size: 0, // GitLab doesn't provide size in basic repo info
      openIssuesCount: data.open_issues_count,
      visibility: data.visibility === 'public' ? 'public' : data.visibility === 'internal' ? 'internal' : 'private',
      issuesEnabled: data.issues_enabled,
      mergeRequestsEnabled: data.merge_requests_enabled,
      wikiEnabled: data.wiki_enabled,
      jobsEnabled: data.jobs_enabled,
      snippetsEnabled: data.snippets_enabled,
      resolveOutdatedDiffDiscussions: data.resolve_outdated_diff_discussions,
      containerRegistryEnabled: data.container_registry_enabled,
      creatorId: data.creator_id,
      namespace: data.namespace ? {
        id: data.namespace.id,
        name: data.namespace.name,
        path: data.namespace.path,
        kind: data.namespace.kind,
        fullPath: data.namespace.full_path,
        parentId: data.namespace.parent_id,
        avatarUrl: data.namespace.avatar_url,
        webUrl: data.namespace.web_url,
      } : {
        id: 0,
        name: '',
        path: '',
        kind: 'user',
        fullPath: '',
        webUrl: '',
      },
      importStatus: data.import_status,
      importError: data.import_error,
      statistics: data.statistics ? {
        commitCount: data.statistics.commit_count,
        storageSize: data.statistics.storage_size,
        repositorySize: data.statistics.repository_size,
        lfsObjectsSize: data.statistics.lfs_objects_size,
        jobArtifactsSize: data.statistics.job_artifacts_size,
      } : undefined,
      permissions: data.permissions ? {
        admin: data.permissions.project_access?.access_level >= 40,
        push: data.permissions.project_access?.access_level >= 30,
        pull: data.permissions.project_access?.access_level >= 10,
      } : undefined,
    };
  }

  private transformIssue(data: any, repo: { owner: string; repo: string; fullName: string }): Issue {
    return {
      id: data.id,
      number: data.iid, // GitLab uses iid (internal id) for display
      title: data.title,
      body: data.description,
      state: data.state === 'opened' ? 'open' : 'closed',
      labels: data.labels?.map((label: string) => ({
        id: label,
        name: label,
        color: '', // GitLab labels have different structure
        description: '',
      })) || [],
      assignees: data.assignees?.map(this.transformUser.bind(this)) || [],
      author: this.transformUser(data.author),
      milestone: data.milestone ? this.transformMilestone(data.milestone) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      url: data.web_url,
      repository: {
        name: repo.repo,
        fullName: repo.fullName,
        url: `https://gitlab.com/${repo.fullName}`,
      },
      comments: data.user_notes_count || 0,
      locked: data.discussion_locked,
    };
  }

  private transformPullRequest(data: any, repo: { owner: string; repo: string; fullName: string }): PullRequest {
    return {
      id: data.id,
      number: data.iid,
      title: data.title,
      body: data.description,
      state: data.state === 'merged' ? 'merged' : data.state === 'opened' ? 'open' : 'closed',
      draft: data.draft || data.work_in_progress,
      labels: data.labels?.map((label: string) => ({
        id: label,
        name: label,
        color: '',
        description: '',
      })) || [],
      assignees: data.assignees?.map(this.transformUser.bind(this)) || [],
      reviewers: data.reviewers?.map(this.transformUser.bind(this)) || [],
      author: this.transformUser(data.author),
      milestone: data.milestone ? this.transformMilestone(data.milestone) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      mergedAt: data.merged_at,
      url: data.web_url,
      repository: {
        name: repo.repo,
        fullName: repo.fullName,
        url: `https://gitlab.com/${repo.fullName}`,
      },
      head: {
        name: data.source_branch,
        ref: data.source_branch,
        sha: data.sha || '',
        repository: {
          name: repo.repo,
          fullName: repo.fullName,
        },
        user: this.transformUser(data.author),
      },
      base: {
        name: data.target_branch,
        ref: data.target_branch,
        sha: '',
        repository: {
          name: repo.repo,
          fullName: repo.fullName,
        },
        user: this.transformUser(data.author),
      },
      mergeable: data.merge_status === 'can_be_merged',
      rebaseable: data.rebase_in_progress === false,
      mergeableState: data.merge_status,
      merged: data.state === 'merged',
      mergedBy: data.merged_by ? this.transformUser(data.merged_by) : undefined,
      comments: data.user_notes_count || 0,
      reviewComments: 0, // GitLab doesn't separate review comments
      commits: 0, // Would need separate API call
      additions: 0, // Would need separate API call
      deletions: 0, // Would need separate API call
      changedFiles: data.changes_count || 0,
    };
  }

  private transformUser(data: any): User {
    if (!data) return {
      id: 0,
      login: 'unknown',
      avatarUrl: '',
      url: '',
      type: 'User',
    };

    return {
      id: data.id,
      login: data.username || data.path,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      url: data.web_url,
      type: data.kind === 'group' ? 'Organization' : 'User',
      company: data.organization,
      location: data.location,
      bio: data.bio,
      blog: data.website_url,
      twitterUsername: data.twitter,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.last_activity_on,
    };
  }

  private transformRepositoryOwner(data: any): RepositoryOwner {
    if (!data) return {
      id: 0,
      login: 'unknown',
      avatarUrl: '',
      url: '',
      type: 'User',
    };

    return {
      id: data.id,
      login: data.username || data.path,
      name: data.name,
      avatarUrl: data.avatar_url,
      url: data.web_url,
      type: data.kind === 'group' ? 'Organization' : 'User',
    };
  }

  private transformMilestone(data: any): any {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      state: data.state,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      dueDate: data.due_date,
      closedAt: data.closed_at || (data.state === 'closed' ? data.updated_at : undefined),
      creator: data.creator ? this.transformUser(data.creator) : undefined,
      openIssues: 0, // Would need separate API call
      closedIssues: 0, // Would need separate API call
    };
  }

  private transformCommit(data: any): Commit {
    return {
      sha: data.id,
      message: data.message,
      author: {
        name: data.author_name,
        email: data.author_email,
        date: data.authored_date,
      },
      committer: {
        name: data.committer_name,
        email: data.committer_email,
        date: data.committed_date,
      },
      url: data.web_url,
      htmlUrl: data.web_url,
      tree: {
        sha: data.tree_id || data.id,
        url: '', // GitLab doesn't provide tree URL in commit response
      },
      parents: data.parent_ids?.map((id: string) => ({ sha: id, url: '' })) || [],
      verification: data.signature ? {
        verified: true,
        reason: 'valid',
        signature: data.signature,
      } : undefined,
    };
  }

  private transformRelease(data: any): Release {
    return {
      id: data.id || data.tag_name,
      tagName: data.tag_name,
      name: data.name,
      body: data.description,
      draft: false, // GitLab doesn't have draft releases
      prerelease: false, // GitLab doesn't have prerelease flag
      createdAt: data.created_at,
      publishedAt: data.released_at || data.created_at,
      author: data.author ? this.transformUser(data.author) : {
        id: 0,
        login: 'unknown',
        avatarUrl: '',
        url: '',
        type: 'User',
      },
      url: data._links?.self || '',
      htmlUrl: data._links?.self || '',
      assets: data.assets?.links?.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        contentType: 'application/octet-stream',
        size: 0,
        downloadCount: 0,
        createdAt: data.created_at,
        updatedAt: data.created_at,
        downloadUrl: asset.url,
        uploader: data.author ? this.transformUser(data.author) : undefined,
      })) || [],
      tarballUrl: '',
      zipballUrl: '',
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
      remaining: this.rateLimiter.getRemaining('gitlab'),
      resetTime: this.rateLimiter.getResetTime('gitlab'),
    };
  }
}

// Create singleton instance
export const gitlabClient = new GitLabClient();

// Export helper functions
export function createGitLabClient(config?: GitLabConfig): GitLabClient {
  return new GitLabClient(config);
}

/**
 * GitLab OAuth2 helper
 */
export class GitLabOAuth {
  private config: Required<Pick<GitLabConfig, 'clientId' | 'clientSecret' | 'redirectUri'>> & 
    Pick<GitLabConfig, 'baseUrl'>;

  constructor(config: Required<Pick<GitLabConfig, 'clientId' | 'clientSecret' | 'redirectUri'>> & 
    Pick<GitLabConfig, 'baseUrl'>) {
    this.config = {
      baseUrl: 'https://gitlab.com',
      ...config,
    };
  }

  /**
   * Get authorization URL
   */
  getAuthorizationUrl(state?: string, scopes: string[] = ['api']): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      ...(state && { state }),
    });

    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new GitPlatformError(
        `OAuth token exchange failed: ${response.statusText}`,
        'gitlab',
        response.status
      );
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new GitPlatformError(
        `OAuth token refresh failed: ${response.statusText}`,
        'gitlab',
        response.status
      );
    }

    return response.json();
  }
}

export default GitLabClient;