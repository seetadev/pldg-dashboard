import { NextRequest, NextResponse } from 'next/server';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Metrics storage (in production, use a proper metrics store like Prometheus)
interface Metrics {
  httpRequests: Map<string, number>;
  httpRequestDurations: Map<string, number[]>;
  errorCounts: Map<string, number>;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  lastUpdated: number;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metrics;
  private readonly cleanupInterval: NodeJS.Timeout;

  private constructor() {
    this.metrics = {
      httpRequests: new Map(),
      httpRequestDurations: new Map(),
      errorCounts: new Map(),
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
      lastUpdated: Date.now(),
    };

    // Conditionally update memory metrics every 30 seconds
    if (process.env.ENABLE_CLEANUP_INTERVAL === 'true') {
      this.cleanupInterval = setInterval(() => {
        this.metrics.memoryUsage = process.memoryUsage();
        this.metrics.lastUpdated = Date.now();
        this.cleanup();
      }, 30000);
    }
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    const key = `${method}_${this.normalizePath(path)}_${Math.floor(statusCode / 100)}xx`;
    
    // Increment request count
    this.metrics.httpRequests.set(key, (this.metrics.httpRequests.get(key) || 0) + 1);
    
    // Record duration
    const durations = this.metrics.httpRequestDurations.get(key) || [];
    durations.push(duration);
    
    // Keep only last 1000 durations to prevent memory bloat
    if (durations.length > 1000) {
      durations.shift();
    }
    
    this.metrics.httpRequestDurations.set(key, durations);
  }

  public recordError(path: string, errorType: string): void {
    const key = `${this.normalizePath(path)}_${errorType}`;
    this.metrics.errorCounts.set(key, (this.metrics.errorCounts.get(key) || 0) + 1);
  }

  public incrementActiveConnections(): void {
    this.metrics.activeConnections++;
  }

  public decrementActiveConnections(): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
  }

  public getPrometheusMetrics(): string {
    let metrics = '';
    
    // HTTP request metrics
    metrics += '# HELP http_requests_total Total number of HTTP requests\n';
    metrics += '# TYPE http_requests_total counter\n';
    for (const [key, count] of this.metrics.httpRequests.entries()) {
      const [method, path, status] = key.split('_');
      metrics += `http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}\n`;
    }
    
    // HTTP request duration metrics
    metrics += '\n# HELP http_request_duration_seconds HTTP request duration in seconds\n';
    metrics += '# TYPE http_request_duration_seconds histogram\n';
    for (const [key, durations] of this.metrics.httpRequestDurations.entries()) {
      const [method, path] = key.split('_');
      const sorted = durations.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      
      metrics += `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${p50 / 1000}\n`;
      metrics += `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.95"} ${p95 / 1000}\n`;
      metrics += `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.99"} ${p99 / 1000}\n`;
    }
    
    // Error metrics
    metrics += '\n# HELP application_errors_total Total number of application errors\n';
    metrics += '# TYPE application_errors_total counter\n';
    for (const [key, count] of this.metrics.errorCounts.entries()) {
      const [path, errorType] = key.split('_');
      metrics += `application_errors_total{path="${path}",error_type="${errorType}"} ${count}\n`;
    }
    
    // Memory metrics
    metrics += '\n# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes\n';
    metrics += '# TYPE nodejs_memory_usage_bytes gauge\n';
    metrics += `nodejs_memory_usage_bytes{type="rss"} ${this.metrics.memoryUsage.rss}\n`;
    metrics += `nodejs_memory_usage_bytes{type="heapUsed"} ${this.metrics.memoryUsage.heapUsed}\n`;
    metrics += `nodejs_memory_usage_bytes{type="heapTotal"} ${this.metrics.memoryUsage.heapTotal}\n`;
    metrics += `nodejs_memory_usage_bytes{type="external"} ${this.metrics.memoryUsage.external}\n`;
    
    // Active connections
    metrics += '\n# HELP active_connections Current number of active connections\n';
    metrics += '# TYPE active_connections gauge\n';
    metrics += `active_connections ${this.metrics.activeConnections}\n`;
    
    // Process uptime
    metrics += '\n# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds\n';
    metrics += '# TYPE nodejs_process_uptime_seconds counter\n';
    metrics += `nodejs_process_uptime_seconds ${process.uptime()}\n`;
    
    return metrics;
  }

  public getMetricsSummary(): Record<string, unknown> {
    const requests: Record<string, number> = {};
    const errors: Record<string, number> = {};

    // Summary of request counts
    for (const [key, count] of this.metrics.httpRequests.entries()) {
      requests[key] = count;
    }

    // Summary of error counts
    for (const [key, count] of this.metrics.errorCounts.entries()) {
      errors[key] = count;
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(this.metrics.memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(this.metrics.memoryUsage.external / 1024 / 1024),
      },
      activeConnections: this.metrics.activeConnections,
      requests,
      errors,
    };
  }

  private normalizePath(path: string): string {
    // Normalize dynamic paths to reduce cardinality
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId')
      .replace(/\?.*$/, ''); // Remove query parameters
  }

  private cleanup(): void {
    // Clean up old metrics to prevent memory leaks
    
    // Clear old duration data
    for (const [key, durations] of this.metrics.httpRequestDurations.entries()) {
      if (durations.length > 100) {
        this.metrics.httpRequestDurations.set(key, durations.slice(-100));
      }
    }
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

export const metricsCollector = MetricsCollector.getInstance();

// Middleware wrapper to collect metrics
export const withMetrics = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    metricsCollector.incrementActiveConnections();
    
    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      
      metricsCollector.recordHttpRequest(
        request.method,
        request.nextUrl.pathname,
        response.status,
        duration
      );
      
      // Log slow requests
      if (duration > 5000) {
        logger.logPerformanceMetric('slow_request', duration, 'ms', {
          method: request.method,
          url: request.nextUrl.pathname,
          statusCode: response.status,
        });
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordHttpRequest(
        request.method,
        request.nextUrl.pathname,
        500,
        duration
      );
      
      metricsCollector.recordError(
        request.nextUrl.pathname,
        error instanceof Error ? error.constructor.name : 'UnknownError'
      );
      
      throw error;
    } finally {
      metricsCollector.decrementActiveConnections();
    }
  };
};

// Health check with metrics
export async function getHealthWithMetrics() {
  const metrics = metricsCollector.getMetricsSummary();
  const memoryUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    metrics: metrics,
  };
}