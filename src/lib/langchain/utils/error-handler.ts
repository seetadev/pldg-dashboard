/**
 * Comprehensive Error Handling System
 * Advanced error handling with retry logic, circuit breaker, and recovery strategies
 */

import { Logger } from './logger';
import {
  LangChainError,
  ModelError,
  RetrieverError,
  ToolError,
  ValidationError,
} from '../types';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: Array<new (...args: any[]) => Error>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
}

export interface ErrorContext {
  operation: string;
  component: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  resolved: boolean;
  attempts: number;
  lastAttempt: Date;
}

/**
 * Circuit Breaker for preventing cascading failures
 */
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new LangChainError('Circuit breaker is OPEN', 'CIRCUIT_BREAKER_OPEN');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.config.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Advanced Error Handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger = Logger.getLogger('error-handler');
  private errorReports: Map<string, ErrorReport> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableErrors: [ModelError, RetrieverError, ToolError],
  };

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 30000,
    monitoringPeriod: 60000,
  };

  private constructor() {
    // Start monitoring error reports
    this.startErrorMonitoring();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with advanced strategies
   */
  async handleError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const finalRetryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    const finalCircuitConfig = { ...this.defaultCircuitBreakerConfig, ...circuitBreakerConfig };

    // Get or create circuit breaker for this operation
    const circuitBreakerKey = `${context.component}:${context.operation}`;
    if (!this.circuitBreakers.has(circuitBreakerKey)) {
      this.circuitBreakers.set(circuitBreakerKey, new CircuitBreaker(finalCircuitConfig));
    }
    const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey)!;

    return circuitBreaker.execute(async () => {
      return this.executeWithRetry(operation, context, finalRetryConfig);
    });
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await operation();
        
        // Log successful recovery if this wasn't the first attempt
        if (attempt > 0) {
          this.logger.info(
            `Operation recovered after ${attempt} retries`,
            context.operation,
            { ...context.metadata, attempts: attempt }
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error as Error, config.retryableErrors);
        
        if (!isRetryable || attempt > config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        const jitteredDelay = delay * (0.5 + Math.random() * 0.5);

        this.logger.warn(
          `Operation failed, retrying in ${Math.round(jitteredDelay)}ms (attempt ${attempt}/${config.maxRetries})`,
          context.operation,
          {
            ...context.metadata,
            error: error.message,
            attempt,
            delay: jitteredDelay,
          }
        );

        await this.sleep(jitteredDelay);
      }
    }

    // All retries exhausted, create error report
    const errorReport = this.createErrorReport(lastError!, context, attempt);
    this.logger.error(
      `Operation failed after ${attempt} attempts`,
      lastError!,
      context.operation,
      { ...context.metadata, errorReportId: errorReport.id }
    );

    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: Array<new (...args: any[]) => Error>): boolean {
    // Check by error type
    const isRetryableType = retryableErrors.some(ErrorType => error instanceof ErrorType);
    if (isRetryableType) return true;

    // Check for specific error patterns
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate limit/i,
      /quota exceeded/i,
      /temporary/i,
      /service unavailable/i,
      /internal server error/i,
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Create error report
   */
  private createErrorReport(error: Error, context: ErrorContext, attempts: number): ErrorReport {
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      context,
      severity: this.determineSeverity(error, context),
      resolved: false,
      attempts,
      lastAttempt: new Date(),
    };

    this.errorReports.set(report.id, report);
    return report;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    // Critical errors
    if (error instanceof ValidationError || context.operation === 'initialization') {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (error instanceof ModelError && context.component === 'agent') {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (error instanceof RetrieverError) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start error monitoring
   */
  private startErrorMonitoring(): void {
    setInterval(() => {
      this.analyzeErrorPatterns();
      this.cleanupOldReports();
    }, 60000); // Run every minute
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(): void {
    const recentReports = Array.from(this.errorReports.values())
      .filter(report => Date.now() - report.timestamp.getTime() < 300000); // Last 5 minutes

    if (recentReports.length === 0) return;

    // Group by operation and component
    const patterns = new Map<string, ErrorReport[]>();
    
    recentReports.forEach(report => {
      const key = `${report.context.component}:${report.context.operation}`;
      if (!patterns.has(key)) {
        patterns.set(key, []);
      }
      patterns.get(key)!.push(report);
    });

    // Detect concerning patterns
    patterns.forEach((reports, key) => {
      if (reports.length >= 5) {
        this.logger.warn(
          `High error frequency detected: ${key}`,
          'pattern_analysis',
          {
            errorCount: reports.length,
            timeWindow: '5 minutes',
            severity: reports[0]?.severity,
          }
        );

        // Consider opening circuit breaker
        const circuitBreaker = this.circuitBreakers.get(key);
        if (circuitBreaker) {
          // Circuit breaker will handle this automatically
        }
      }
    });
  }

  /**
   * Clean up old error reports
   */
  private cleanupOldReports(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [id, report] of this.errorReports.entries()) {
      if (report.timestamp.getTime() < oneHourAgo) {
        this.errorReports.delete(id);
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByComponent: Record<string, number>;
    recentErrors: ErrorReport[];
    circuitBreakerStates: Record<string, string>;
  } {
    const allReports = Array.from(this.errorReports.values());
    const recentReports = allReports.filter(
      report => Date.now() - report.timestamp.getTime() < 3600000 // Last hour
    );

    const errorsBySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const errorsByComponent: Record<string, number> = {};

    recentReports.forEach(report => {
      errorsBySeverity[report.severity]++;
      errorsByComponent[report.context.component] = 
        (errorsByComponent[report.context.component] || 0) + 1;
    });

    const circuitBreakerStates: Record<string, string> = {};
    this.circuitBreakers.forEach((breaker, key) => {
      circuitBreakerStates[key] = breaker.getState();
    });

    return {
      totalErrors: recentReports.length,
      errorsBySeverity,
      errorsByComponent,
      recentErrors: recentReports.slice(-10), // Last 10 errors
      circuitBreakerStates,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(component: string, operation: string): void {
    const key = `${component}:${operation}`;
    const circuitBreaker = this.circuitBreakers.get(key);
    if (circuitBreaker) {
      circuitBreaker.reset();
      this.logger.info(`Circuit breaker reset: ${key}`, 'circuit_breaker_reset');
    }
  }

  /**
   * Mark error as resolved
   */
  markErrorResolved(errorId: string): void {
    const report = this.errorReports.get(errorId);
    if (report) {
      report.resolved = true;
      this.logger.info(`Error marked as resolved: ${errorId}`, 'error_resolution');
    }
  }

  /**
   * Get error report
   */
  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  /**
   * Clear all error reports
   */
  clearErrorReports(): void {
    this.errorReports.clear();
    this.logger.info('All error reports cleared', 'error_cleanup');
  }
}

/**
 * Convenience functions
 */

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Decorator for automatic error handling
 */
export function withErrorHandler(
  component: string,
  retryConfig?: Partial<RetryConfig>,
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: ErrorContext = {
        operation: propertyKey,
        component,
        metadata: {
          className: target.constructor.name,
          method: propertyKey,
          argumentCount: args.length,
        },
      };

      return errorHandler.handleError(
        () => originalMethod.apply(this, args),
        context,
        retryConfig,
        circuitBreakerConfig
      );
    };

    return descriptor;
  };
}

/**
 * Utility function for safe execution
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options?: {
    retryConfig?: Partial<RetryConfig>;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  }
): Promise<T> {
  return errorHandler.handleError(
    operation,
    context,
    options?.retryConfig,
    options?.circuitBreakerConfig
  );
}

export default ErrorHandler;