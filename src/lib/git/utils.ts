/**
 * Git Platform Utilities
 * Common utilities and helpers for GitHub and GitLab integrations
 */

import { GitError, RateLimitInfo, RepositoryIdentifier, ParsedRepository } from './types';

/**
 * Custom Git Error class
 */
export class GitPlatformError extends Error implements GitError {
  public status?: number;
  public response?: GitError['response'];
  public rateLimitReset?: number;
  public platform: 'github' | 'gitlab';

  constructor(
    message: string,
    platform: 'github' | 'gitlab',
    status?: number,
    response?: GitError['response']
  ) {
    super(message);
    this.name = 'GitPlatformError';
    this.platform = platform;
    this.status = status;
    this.response = response;
    
    // Extract rate limit info if available
    if (response?.headers?.['x-ratelimit-reset']) {
      this.rateLimitReset = parseInt(response.headers['x-ratelimit-reset']);
    } else if (response?.headers?.['ratelimit-reset']) {
      this.rateLimitReset = parseInt(response.headers['ratelimit-reset']);
    }
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.status === 403 && this.message.includes('rate limit');
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isServerError(): boolean {
    return this.status ? this.status >= 500 : false;
  }

  get retryAfter(): number | null {
    if (this.rateLimitReset) {
      return Math.max(0, this.rateLimitReset - Math.floor(Date.now() / 1000));
    }
    
    const retryAfter = this.response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter);
    }
    
    return null;
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly window: number;
  private readonly limit: number;

  constructor(limit: number = 60, window: number = 60000) {
    this.limit = limit;
    this.window = window;
    
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.window);
  }

  /**
   * Check if request is within rate limit
   */
  isWithinLimit(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => now - time < this.window);
    this.requests.set(key, recentRequests);
    
    return recentRequests.length < this.limit;
  }

  /**
   * Record a request
   */
  recordRequest(key: string): void {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    requests.push(now);
    this.requests.set(key, requests);
  }

  /**
   * Get remaining requests for key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const recentRequests = requests.filter(time => now - time < this.window);
    return Math.max(0, this.limit - recentRequests.length);
  }

  /**
   * Get time until next request is allowed
   */
  getResetTime(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    const resetTime = oldestRequest + this.window;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.window);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Simple in-memory cache
 */
export class ApiCache {
  private cache = new Map<string, { data: any; expires: number; tags: Set<string> }>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(defaultTtl: number = 300000, maxSize: number = 1000) {
    this.defaultTtl = defaultTtl;
    this.maxSize = maxSize;
    
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set cached data
   */
  set(key: string, data: any, ttl?: number, tags: string[] = []): void {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expires = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, {
      data,
      expires,
      tags: new Set(tags),
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.has(tag))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * HTTP client utilities
 */
export class HttpClient {
  private userAgent: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(
    userAgent: string = 'PLDG-Dashboard/1.0',
    timeout: number = 30000,
    retryAttempts: number = 3
  ) {
    this.userAgent = userAgent;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(
    url: string,
    options: RequestInit & {
      timeout?: number;
      retries?: number;
      platform?: 'github' | 'gitlab';
    } = {}
  ): Promise<{
    data: T;
    status: number;
    headers: Record<string, string>;
    rateLimitInfo?: RateLimitInfo;
  }> {
    const {
      timeout = this.timeout,
      retries = this.retryAttempts,
      platform = 'github',
      ...fetchOptions
    } = options;

    let lastError: Error;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Convert headers to plain object
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        // Extract rate limit info
        const rateLimitInfo = this.extractRateLimitInfo(headers, platform);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }

          throw new GitPlatformError(
            errorData.message || `Request failed with status ${response.status}`,
            platform,
            response.status,
            {
              status: response.status,
              statusText: response.statusText,
              data: errorData,
              headers,
            }
          );
        }

        // Parse response
        const contentType = response.headers.get('content-type') || '';
        let data: T;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        return {
          data,
          status: response.status,
          headers,
          rateLimitInfo,
        };

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry on certain errors
        if (error instanceof GitPlatformError) {
          if (error.isUnauthorized || error.isNotFound || error.isForbidden) {
            throw error;
          }

          // If rate limited, wait before retrying
          if (error.isRateLimited && attempt <= retries) {
            const waitTime = error.retryAfter ? error.retryAfter * 1000 : 60000;
            await this.sleep(waitTime);
            continue;
          }
        }

        // Exponential backoff for retries
        if (attempt <= retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Extract rate limit information from headers
   */
  private extractRateLimitInfo(
    headers: Record<string, string>,
    platform: 'github' | 'gitlab'
  ): RateLimitInfo | undefined {
    if (platform === 'github') {
      const limit = headers['x-ratelimit-limit'];
      const remaining = headers['x-ratelimit-remaining'];
      const reset = headers['x-ratelimit-reset'];
      const used = headers['x-ratelimit-used'];
      const resource = headers['x-ratelimit-resource'] || 'core';

      if (limit && remaining && reset) {
        return {
          limit: parseInt(limit),
          remaining: parseInt(remaining),
          reset: parseInt(reset),
          used: used ? parseInt(used) : parseInt(limit) - parseInt(remaining),
          resource,
        };
      }
    } else if (platform === 'gitlab') {
      const limit = headers['ratelimit-limit'];
      const remaining = headers['ratelimit-remaining'];
      const reset = headers['ratelimit-reset'];

      if (limit && remaining && reset) {
        return {
          limit: parseInt(limit),
          remaining: parseInt(remaining),
          reset: parseInt(reset),
          used: parseInt(limit) - parseInt(remaining),
          resource: 'api',
        };
      }
    }

    return undefined;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Repository identifier parser
 */
export function parseRepositoryIdentifier(identifier: RepositoryIdentifier): ParsedRepository | null {
  if (typeof identifier === 'object') {
    return {
      platform: 'github', // Default to GitHub
      owner: identifier.owner,
      repo: identifier.repo,
      fullName: `${identifier.owner}/${identifier.repo}`,
    };
  }

  // Parse string identifier
  const match = identifier.match(/^(?:(github|gitlab)[:\/])?(.+?)\/(.+?)(?:\.git)?$/);
  if (!match) return null;

  const [, platform, owner, repo] = match;
  
  return {
    platform: (platform as 'github' | 'gitlab') || 'github',
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

/**
 * URL utilities
 */
export function buildUrl(baseUrl: string, endpoint: string, params?: Record<string, any>): string {
  let url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
}

/**
 * Date utilities
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

export function isValidDate(date: string): boolean {
  return !isNaN(Date.parse(date));
}

/**
 * Pagination utilities
 */
export function extractPaginationInfo(headers: Record<string, string>): {
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage?: number;
  previousPage?: number;
  lastPage?: number;
} {
  const linkHeader = headers['link'];
  const result = {
    hasNext: false,
    hasPrevious: false,
    nextPage: undefined as number | undefined,
    previousPage: undefined as number | undefined,
    lastPage: undefined as number | undefined,
  };

  if (linkHeader) {
    // Parse GitHub/GitLab style Link headers
    const links = linkHeader.split(',').map(link => link.trim());
    
    links.forEach(link => {
      const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const [, url, rel] = match;
        const pageMatch = url.match(/[?&]page=(\d+)/);
        
        if (pageMatch) {
          const page = parseInt(pageMatch[1]);
          
          switch (rel) {
            case 'next':
              result.hasNext = true;
              result.nextPage = page;
              break;
            case 'prev':
            case 'previous':
              result.hasPrevious = true;
              result.previousPage = page;
              break;
            case 'last':
              result.lastPage = page;
              break;
          }
        }
      }
    });
  }

  return result;
}

/**
 * Data transformation utilities
 */
export function omitUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      (result as any)[key] = value;
    }
  });
  
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  
  return result;
}

/**
 * Validation utilities
 */
export function isValidToken(token: string, platform: 'github' | 'gitlab'): boolean {
  if (!token || typeof token !== 'string') return false;
  
  if (platform === 'github') {
    // GitHub tokens are alphanumeric with optional special characters and a reasonable length range
    return /^[a-zA-Z0-9_-]{20,255}$/.test(token);
  } else if (platform === 'gitlab') {
    // GitLab tokens are typically alphanumeric and at least 20 characters
    return /^[a-zA-Z0-9_-]{20,255}$/.test(token);
  }
  
  return false;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Environment validation
 */
export function validateEnvironment(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for tokens
  const githubToken = process.env.GITHUB_TOKEN;
  const gitlabToken = process.env.GITLAB_TOKEN;

  if (!githubToken && !gitlabToken) {
    errors.push('Either GITHUB_TOKEN or GITLAB_TOKEN must be provided');
  }

  if (githubToken && !isValidToken(githubToken, 'github')) {
    errors.push('Invalid GITHUB_TOKEN format');
  }

  if (gitlabToken && !isValidToken(gitlabToken, 'gitlab')) {
    errors.push('Invalid GITLAB_TOKEN format');
  }

  // Check for URLs
  const githubUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
  const gitlabUrl = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

  if (!isValidUrl(githubUrl)) {
    errors.push('Invalid GITHUB_API_URL');
  }

  if (!isValidUrl(gitlabUrl)) {
    errors.push('Invalid GITLAB_API_URL');
  }

  // Warnings for missing optional configs
  if (!process.env.GIT_USER_AGENT) {
    warnings.push('GIT_USER_AGENT not set, using default');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

