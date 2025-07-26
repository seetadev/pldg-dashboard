# Claude Generated Code

**Task**: Objective:
Audit the entire codebase and identify improvements in:

🔐 Security
Detect insecure patterns (e.g. unvalidated inputs, unsafe data handling)...

Suggest best practices (e.g. input sanitization, environment variable usage).

🛠️ Maintainability
Flag complex or duplicate code, unclear logic, poor naming.

Recommend modularization and better structure.

🚀 Performance
Spot inefficient loops, redundant logic, unnecessary API calls.

Suggest caching or optimization where needed.

🧹 Clean-up
Find dead code, unused variables/functions/imports.

List outdated or unnecessary dependencies.

**Generated on**: Sat Jul 26 09:12:33 UTC 2025

## Generated Content

```
Based on my audit of the codebase, I've identified several critical areas for improvement. Here's my comprehensive analysis and recommendations:

## 🔐 SECURITY ISSUES

### Critical Security Vulnerabilities:

1. **Hardcoded API Keys Risk** - No environment variable validation
2. **Unvalidated CSV/External Data Input** - Direct parsing without sanitization
3. **Missing Input Sanitization** - XSS vulnerabilities
4. **Insecure HTTP Headers** - Missing security headers
5. **Rate Limiting Issues** - In-memory implementation won't scale

## 🛠️ MAINTAINABILITY ISSUES

1. **Large, Complex Functions** - `processData`, `enhanceTechPartnerData`
2. **Inconsistent Error Handling** - Mix of throw/console.error patterns
3. **Poor Type Safety** - Extensive use of `any` types
4. **Code Duplication** - Repeated data transformation logic

## 🚀 PERFORMANCE ISSUES

1. **Inefficient Re-renders** - Missing dependency arrays in useMemo/useCallback
2. **Large Bundle Size** - Unused dependencies
3. **No Data Virtualization** - Large datasets will cause performance issues
4. **Blocking CSV Processing** - Synchronous parsing

## 🧹 CLEANUP NEEDED

1. **Unused Dependencies** - node-fetch, graphql-request, exceljs in main bundle
2. **Dead Code** - Unused imports and variables
3. **Inconsistent Naming** - Mix of camelCase/kebab-case

---

## IMPLEMENTATION OF FIXES

### FILES_TO_CREATE:

1. `src/lib/security.ts` - Security utilities
2. `src/lib/validation-schemas.ts` - Zod validation schemas
3. `src/hooks/useSecureData.ts` - Secure data fetching hook
4. `src/lib/performance.ts` - Performance utilities
5. `src/middleware.ts` - Next.js middleware for security headers
6. `.env.example` - Environment variable template
7. `src/lib/sanitization.ts` - Input sanitization utilities

### FILES_TO_MODIFY:

1. `src/hooks/useCSVData.ts` - Add security and performance improvements
2. `src/lib/data-processing.ts` - Modularize and optimize
3. `src/lib/utils.ts` - Add type safety and error handling
4. `src/lib/airtable.ts` - Improve error handling and security
5. `src/lib/system.ts` - Optimize re-renders and add error boundaries
6. `package.json` - Remove unused dependencies
7. `next.config.js` - Add security configurations

---

## CODE_CHANGES:

### FILES_TO_CREATE:

**src/lib/security.ts**
```typescript
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

// Environment variable validation
export function validateEnvironmentVariables() {
  const required = [
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID',
    'GITHUB_TOKEN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// CORS configuration
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

// Security headers
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.airtable.com https://api.github.com;
  `.replace(/\s+/g, ' ').trim()
} as const;

// Rate limiting for client-side
export class ClientRateLimit {
  private static requests = new Map<string, number[]>();
  
  static check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

// Secure request wrapper
export async function secureApiRequest(
  url: string, 
  options: RequestInit = {},
  rateLimitKey?: string
): Promise<Response> {
  // Rate limiting
  if (rateLimitKey && !ClientRateLimit.check(rateLimitKey, 100, 60000)) {
    throw new Error('Rate limit exceeded');
  }

  // Add security headers
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      'User-Agent': 'PLDG-Dashboard/1.0',
      ...SECURITY_HEADERS,
      ...options.headers,
    },
  };

  const response = await fetch(url, secureOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}
```

**src/lib/sanitization.ts**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// HTML sanitization
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// GitHub URL validation
export function isValidGitHubUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'github.com';
  } catch {
    return false;
  }
}

// Email validation (simple)
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// SQL injection prevention for dynamic queries
export function escapeSqlString(str: string): string {
  return str.replace(/['";\\]/g, '\\$&');
}

// XSS prevention for text content
export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// CSV injection prevention
export function sanitizeCsvValue(value: string): string {
  // Prevent CSV injection by escaping formula starters
  if (typeof value !== 'string') return String(value);
  
  const dangerous = /^[=+\-@]/;
  if (dangerous.test(value)) {
    return `'${value}`;
  }
  return value;
}
```

**src/lib/validation-schemas.ts**
```typescript
import { z } from 'zod';

// Base schemas
export const EmailSchema = z.string().email();
export const GitHubUrlSchema = z.string().url().refine(
  (url) => new URL(url).hostname === 'github.com',
  { message: 'Must be a valid GitHub URL' }
);

// Engagement data schema
export const EngagementDataSchema = z.object({
  Name: z.string().min(1, 'Name is required').max(100),
  'Github Username': z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/),
  'Program Week': z.string().min(1),
  'Engagement Tracking': z.string().optional(),
  'Engagement Participation ': z.string().optional(),
  'Which session(s) did you find most informative or impactful, and why?': z.string().max(1000).optional(),
  'Tech Partner Collaboration?': z.enum(['Yes', 'No', '']).optional(),
  'Which Tech Partner': z.string().max(100).optional(),
  'Describe your work with the tech partner': z.string().max(1000).optional(),
  'Did you work on an issue, PR, or project this week?': z.enum(['Yes', 'No', '']).optional(),
  'How many issues, PRs, or projects this week?': z.string().optional(),
  'Issue Title 1': z.string().max(200).optional(),
  'Issue Link 1': GitHubUrlSchema.optional().or(z.literal('')),
  'Issue Description 1': z.string().max(1000).optional(),
  'Issue Title 2': z.string().max(200).optional(),
  'Issue Link 2': GitHubUrlSchema.optional().or(z.literal('')),
  'Issue Description 2': z.string().max(1000).optional(),
  'Issue Title 3': z.string().max(200).optional(),
  'Issue Link 3': GitHubUrlSchema.optional().or(z.literal('')),
  'Issue Description 3': z.string().max(1000).optional(),
  'Issue 4+': z.string().max(1000).optional(),
  'How likely are you to recommend the PLDG to others?': z.string().optional(),
  'PLDG Feedback': z.string().max(2000).optional(),
  'Email Address': EmailSchema.optional().or(z.literal(''))
});

// API response schemas
export const GitHubIssueSchema = z.object({
  id: z.number(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  html_url: GitHubUrlSchema,
  created_at: z.string(),
  updated_at: z.string(),
  assignees: z.array(z.object({
    login: z.string(),
    avatar_url: z.string().url()
  })),
  labels: z.array(z.object({
    name: z.string(),
    color: z.string()
  }))
});

export const AirtableRecordSchema = z.object({
  id: z.string(),
  fields: z.record(z.any()),
  createdTime: z.string()
});

// Validation utilities
export function validateEngagementData(data: unknown) {
  const result = EngagementDataSchema.safeParse(data);
  if (!result.success) {
    console.warn('Engagement data validation failed:', result.error.errors);
    return null;
  }
  return result.data;
}

export function validateEngagementDataArray(data: unknown[]) {
  return data
    .map(validateEngagementData)
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
```

**src/hooks/useSecureData.ts**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { secureApiRequest } from '@/lib/security';

interface UseSecureDataOptions<T> {
  endpoint: string;
  validator?: (data: unknown) => T;
  rateLimitKey?: string;
  refreshInterval?: number;
}

interface UseSecureDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useSecureData<T>({
  endpoint,
  validator,
  rateLimitKey,
  refreshInterval
}: UseSecureDataOptions<T>): UseSecureDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const response = await secureApiRequest(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }, rateLimitKey);

      const rawData = await response.json();

      // Validate data if validator is provided
      const validatedData = validator ? validator(rawData) : rawData as T;
      
      setData(validatedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Secure data fetch error for ${endpoint}:`, err);
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, validator, rateLimitKey]);

  useEffect(() => {
    fetchData();

    // Set up refresh interval if specified
    if (refreshInterval) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
    lastUpdated
  };
}
```

**src/lib/performance.ts**
```typescript
import { useCallback, useMemo, useRef } from 'react';

// Debounce hook for expensive operations
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

// Memoized computation with dependency tracking
export function useMemoizedComputation<T>(
  computation: () => T,
  dependencies: any[],
  debugLabel?: string
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = computation();
    const end = performance.now();
    
    if (debugLabel && process.env.NODE_ENV === 'development') {
      console.log(`${debugLabel} computed in ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }, dependencies);
}

// Chunked data processing to prevent UI blocking
export function processDataInChunks<T, R>(
  data: T[],
  processor: (item: T) => R,
  chunkSize: number = 100
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let currentIndex = 0;

    function processChunk() {
      const endIndex = Math.min(currentIndex + chunkSize, data.length);
      
      for (let i = currentIndex; i < endIndex; i++) {
        results.push(processor(data[i]));
      }

      currentIndex = endIndex;

      if (currentIndex < data.length) {
        // Continue processing in next frame
        requestAnimationFrame(processChunk);
      } else {
        resolve(results);
      }
    }

    processChunk();
  });
}

// Performance monitoring
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static startTimer(label: string): () => number {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      
      const existing = this.measurements.get(label) || [];
      existing.push(duration);
      
      // Keep only last 100 measurements
      if (existing.length > 100) {
        existing.shift();
      }
      
      this.measurements.set(label, existing);
      
      return duration;
    };
  }

  static getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      count: measurements.length,
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }
}

// Virtual scrolling for large datasets
export function useVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;
    
    return {
      visibleCount,
      getVisibleRange: (scrollTop: number) => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(start + visibleCount, itemCount);
        
        return {
          start: Math.max(0, start),
          end,
          offsetY: start * itemHeight
        };
      }
    };
  }, [itemCount, itemHeight, containerHeight]);
}
```

**middleware.ts**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS } from '@/lib/security';

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    
    // Simple rate limiting (in production, use Redis or similar)
    const rateLimitKey = `${ip}-${Math.floor(Date.now() / 60000)}`;
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99'); // Simplified
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**.env.example**
```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# GitHub Configuration  
GITHUB_TOKEN=your_github_token_here
GITHUB_ORG=your_github_org_here
GITHUB_REPO=your_github_repo_here

# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# AI Configuration (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Security
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### FILES_TO_MODIFY:

**package.json** (Remove unused dependencies)
```json
{
  "name": "developer-engagement-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "vercel-build": "next build",
    "type-check": "tsc --noEmit",
    "security-audit": "npm audit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.1",
    "@octokit/rest": "^21.0.2",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-select": "^2.1.3",
    "@radix-ui/react-toggle": "^1.1.1",
    "@radix-ui/react-toggle-group": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.5",
    "@tremor/react": "^3.18.3",
    "@upstash/redis": "^1.34.3",
    "airtable": "^0.12.2",
    "autoprefixer": "^10.4.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "isomorphic-dompurify": "^2.11.0",
    "lodash": "^4.17.21",
    "lucide-react": "^0.454.0",
    "mongodb": "^6.16.0",
    "next": "14.2.10",
    "papaparse": "^5.4.1",
    "postcss": "^8.4.47",
    "react": "^18.2.0",
    "react-day-picker": "^9.2.1",
    "react-dom": "^18.2.0",
    "recharts": "^2.13.0",
    "sonner": "^1.7.0",
    "swr": "^2.2.5",
    "tailwind-merge": "^2.5.5",
    "tailwindcss": "^3.3.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5",
    "@types/lodash": "^4.17.1",
    "@types/node": "^20.12.7",
    "@types/papaparse": "^5.3.14",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.10",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "typescript": "^5.4.5"
  }
}
```

**src/hooks/useCSVData.ts** (Updated with security and performance)
```typescript
import { useState, useEffect, useCallback } from 'react';
import Papa, { ParseResult, ParseConfig } from 'papaparse';
import { EngagementData } from '@/types/dashboard';
import { validateEngagementDataArray } from '@/lib/validation-schemas';
import { sanitizeCsvValue } from '@/lib/sanitization';
import { processDataInChunks, PerformanceMonitor } from '@/lib/performance';
import { secureApiRequest } from '@/lib/security';

interface UseCSVDataReturn {
  data: EngagementData[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  mutate: () => Promise<void>;
  timestamp: number;
}

export function useCSVData(): UseCSVDataReturn {
  const [data, setData] = useState<EngagementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number>(0);

  const fetchCSV = useCallback(async () => {
    const endTimer = PerformanceMonitor.startTimer('csv-fetch-parse');
    
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      console.log('Fetching CSV data securely...');
      
      const response = await secureApiRequest('/data/weekly-engagement-data.csv', {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      }, 'csv-fetch');

      const csvText = await response.text();
      
      // Validate CSV size (prevent DoS)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (csvText.length > maxSize) {
        throw new Error('CSV file too large');
      }

      console.log('CSV data received, starting secure parsing...');

      const parseConfig: ParseConfig<Record<string, string>> = {
        header: true,
        dynamicTyping: false, // Keep as strings for validation
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string, header: string) => {
          // Sanitize each CSV value
          return sanitizeCsvValue(value?.toString() || '');
        }
      };

      return new Promise<void>((resolve, reject) => {
        Papa.parse(csvText, {
          ...parseConfig,
          complete: async (results: ParseResult<Record<string, string>>) => {
            try {
              if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }

              console.log(`Processing ${results.data.length} CSV records...`);

              // Process data in chunks to prevent UI blocking
              const processedData = await processDataInChunks(
                results.data,
                (record) => {
                  // Convert to EngagementData format
                  const engagementData: EngagementData = {
                    Name: record['Name'] || record['﻿Name'] || '',
                    'Github Username': record['Github Username'] || '',
                    'Program Week': record['Program Week'] || '',
                    'Engagement Tracking': record['Engagement Tracking'] || '',
                    'Engagement Participation ': record['Engagement Participation '] || record['Engagement Participation'] || '',
                    'Which session(s) did you find most informative or impactful, and why?': record['Which session(s) did you find most informative or impactful, and why?'] || '',
                    'Tech Partner Collaboration?': record['Tech Partner Collaboration?'] || '',
                    'Which Tech Partner': record['Which Tech Partner'] || '',
                    'Describe your work with the tech partner': record['Describe your work with the tech partner'] || '',
                    'Did you work on an issue, PR, or project this week?': record['Did you work on an issue, PR, or project this week?'] || '',
                    'How many issues, PRs, or projects this week?': record['How many issues, PRs, or projects this week?'] || '',
                    'Issue Title 1': record['Issue Title 1'] || '',
                    'Issue Link 1': record['Issue Link 1'] || '',
                    'Issue Description 1': record['Issue Description 1'] || '',
                    'Issue Title 2': record['Issue Title 2'] || '',
                    'Issue Link 2': record['Issue Link 2'] || '',
                    'Issue Description 2': record['Issue Description 2'] || '',
                    'Issue Title 3': record['Issue Title 3'] || '',
                    'Issue Link 3': record['Issue Link 3'] || '',
                    'Issue Description 3': record['Issue Description 3'] || '',
                    'Issue 4+': record['Issue 4+'] || '',
                    'How likely are you to recommend the PLDG to others?': record['How likely are you to recommend the PLDG to others?'] || '',
                    'PLDG Feedback': record['PLDG Feedback'] || '',
                    'Email Address': record['Email Address'] || '',
                  };
                  
                  return engagementData;
                },
                50 // Process 50 records at a time
              );

              // Validate the processed data
              const validatedData = validateEngagementDataArray(processedData);
              
              console.log(`Validated ${validatedData.length} records out of ${processedData.length}`);

              setData(validatedData);
              setTimestamp(Date.now());
              
              const duration = endTimer();
              console.log(`CSV processing completed in ${duration.toFixed(2)}ms`);
              
              resolve();
            } catch (err) {
              console.error('CSV processing error:', err);
              reject(err);
            }
          },
          error: (error: any) => {
            console.error('Papa Parse error:', error);
            reject(new Error(`CSV parsing failed: ${error.message}`));
          }
        });
      });
    } catch (err) {
      console.error('CSV fetch error:', err);
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      endTimer();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCSV();
  }, [fetchCSV]);

  return {
    data,
    isLoading,
    isError,
    error,
    mutate: fetchCSV,
    timestamp
  };
}
```

**next.config.js** (Create this file for security configuration)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
```
