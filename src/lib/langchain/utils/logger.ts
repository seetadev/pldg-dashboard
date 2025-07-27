/**
 * Advanced Logging System for LangChain Operations
 * Comprehensive logging with structured output, performance tracking, and error monitoring
 */

import { loggingConfig } from '../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component: string;
  operation?: string;
  metadata?: Record<string, any>;
  error?: Error;
  duration?: number;
  requestId?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private loggers: Map<string, Logger> = new Map();
  private performanceMetrics: PerformanceMetrics[] = [];
  private errorCount = 0;
  private requestId?: string;

  private constructor(
    private component: string = 'langchain',
    private enableConsoleOutput = true
  ) {
    this.logLevel = this.parseLogLevel(loggingConfig.level);
  }

  /**
   * Get logger instance for a specific component
   */
  static getLogger(component: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    if (!Logger.instance.loggers.has(component)) {
      const logger = new Logger(component, true);
      Logger.instance.loggers.set(component, logger);
    }

    return Logger.instance.loggers.get(component)!;
  }

  /**
   * Set request ID for tracking
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    operation?: string,
    metadata?: Record<string, any>,
    error?: Error,
    duration?: number,
    userId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: this.component,
      operation,
      metadata,
      error,
      duration,
      requestId: this.requestId,
      userId,
    };
  }

  /**
   * Log message if level is appropriate
   */
  private log(entry: LogEntry): void {
    if (entry.level < this.logLevel) return;

    // Track error count
    if (entry.level >= LogLevel.ERROR) {
      this.errorCount++;
    }

    // Console output
    if (this.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Send to external logging service if configured
    this.sendToExternalService(entry);

    // Store metrics
    this.storeMetrics(entry);
  }

  /**
   * Output to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelColors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
    };
    const resetColor = '\x1b[0m';

    const color = levelColors[entry.level];
    const levelName = levelNames[entry.level];
    
    let logMessage = `${color}[${entry.timestamp}] ${levelName} [${entry.component}]${resetColor} ${entry.message}`;

    if (entry.operation) {
      logMessage += ` (${entry.operation})`;
    }

    if (entry.duration !== undefined) {
      logMessage += ` [${entry.duration}ms]`;
    }

    if (entry.requestId) {
      logMessage += ` {${entry.requestId}}`;
    }

    console.log(logMessage);

    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log(`${color}  Metadata:${resetColor}`, JSON.stringify(entry.metadata, null, 2));
    }

    // Log error details
    if (entry.error) {
      console.error(`${color}  Error:${resetColor}`, entry.error);
      if (entry.error.stack) {
        console.error(`${color}  Stack:${resetColor}`, entry.error.stack);
      }
    }
  }

  /**
   * Send to external logging service
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Implement external logging service integration (e.g., Datadog, CloudWatch, etc.)
    // This is a placeholder for actual implementation
    
    if (process.env.LOGGING_WEBHOOK_URL && entry.level >= LogLevel.ERROR) {
      try {
        await fetch(process.env.LOGGING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service: 'langchain-agent',
            ...entry,
            error: entry.error ? {
              name: entry.error.name,
              message: entry.error.message,
              stack: entry.error.stack,
            } : undefined,
          }),
        });
      } catch (error) {
        console.error('Failed to send log to external service:', error);
      }
    }
  }

  /**
   * Store metrics for analytics
   */
  private storeMetrics(entry: LogEntry): void {
    if (entry.operation && entry.duration !== undefined) {
      this.performanceMetrics.push({
        operation: entry.operation,
        startTime: Date.now() - entry.duration,
        endTime: Date.now(),
        duration: entry.duration,
        success: entry.level < LogLevel.ERROR,
        metadata: entry.metadata,
      });

      // Keep only recent metrics (last 1000)
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }
    }
  }

  /**
   * Debug logging
   */
  debug(message: string, operation?: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, operation, metadata));
  }

  /**
   * Info logging
   */
  info(message: string, operation?: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, operation, metadata));
  }

  /**
   * Warning logging
   */
  warn(message: string, operation?: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, operation, metadata));
  }

  /**
   * Error logging
   */
  error(message: string, error?: Error, operation?: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, operation, metadata, error));
  }

  /**
   * Fatal error logging
   */
  fatal(message: string, error?: Error, operation?: string, metadata?: Record<string, any>): void {
    this.log(this.createLogEntry(LogLevel.FATAL, message, operation, metadata, error));
  }

  /**
   * Log with timing
   */
  async logWithTiming<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    this.debug(`Starting operation: ${operation}`, operation, metadata);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.info(
        `Operation completed successfully: ${operation}`,
        operation,
        { ...metadata, duration, success: true }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(
        `Operation failed: ${operation}`,
        error as Error,
        operation,
        { ...metadata, duration, success: false }
      );

      throw error;
    }
  }

  /**
   * Log agent execution
   */
  logAgentExecution(
    agentName: string,
    input: string,
    result: any,
    duration: number,
    success: boolean
  ): void {
    if (!loggingConfig.enableAgentLogs) return;

    const metadata = {
      agentName,
      inputLength: input.length,
      success,
      duration,
      outputLength: typeof result === 'string' ? result.length : JSON.stringify(result).length,
    };

    if (success) {
      this.info(`Agent execution completed: ${agentName}`, 'agent_execution', metadata);
    } else {
      this.error(`Agent execution failed: ${agentName}`, undefined, 'agent_execution', metadata);
    }
  }

  /**
   * Log tool usage
   */
  logToolUsage(
    toolName: string,
    input: any,
    result: any,
    duration: number,
    success: boolean
  ): void {
    if (!loggingConfig.enableToolLogs) return;

    const metadata = {
      toolName,
      success,
      duration,
      inputType: typeof input,
      outputType: typeof result,
    };

    if (success) {
      this.debug(`Tool used successfully: ${toolName}`, 'tool_usage', metadata);
    } else {
      this.warn(`Tool usage failed: ${toolName}`, 'tool_usage', metadata);
    }
  }

  /**
   * Log retriever operations
   */
  logRetrieverOperation(
    operation: string,
    query: string,
    resultCount: number,
    duration: number,
    success: boolean
  ): void {
    if (!loggingConfig.enableRetrieverLogs) return;

    const metadata = {
      operation,
      queryLength: query.length,
      resultCount,
      duration,
      success,
    };

    if (success) {
      this.debug(`Retriever operation completed: ${operation}`, 'retriever_operation', metadata);
    } else {
      this.error(`Retriever operation failed: ${operation}`, undefined, 'retriever_operation', metadata);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    slowestOperation: PerformanceMetrics | null;
    fastestOperation: PerformanceMetrics | null;
    operationCounts: Record<string, number>;
  } {
    const metrics = this.performanceMetrics;
    
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
        operationCounts: {},
      };
    }

    const successfulOperations = metrics.filter(m => m.success);
    const durations = metrics.map(m => m.duration || 0);
    const operationCounts: Record<string, number> = {};

    metrics.forEach(m => {
      operationCounts[m.operation] = (operationCounts[m.operation] || 0) + 1;
    });

    const sortedByDuration = [...metrics].sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return {
      totalOperations: metrics.length,
      successRate: successfulOperations.length / metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowestOperation: sortedByDuration[0] || null,
      fastestOperation: sortedByDuration[sortedByDuration.length - 1] || null,
      operationCounts,
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorRate: number;
    recentErrors: LogEntry[];
  } {
    return {
      totalErrors: this.errorCount,
      errorRate: this.performanceMetrics.length > 0 
        ? this.errorCount / this.performanceMetrics.length 
        : 0,
      recentErrors: [], // In a real implementation, you'd store recent error entries
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = [];
    this.errorCount = 0;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceLogging(operation: string, component: string = 'langchain') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = Logger.getLogger(component);

    descriptor.value = async function (...args: any[]) {
      return logger.logWithTiming(
        `${operation}:${propertyKey}`,
        () => originalMethod.apply(this, args),
        { className: target.constructor.name, method: propertyKey }
      );
    };

    return descriptor;
  };
}

/**
 * Error handling decorator
 */
export function withErrorHandling(component: string = 'langchain') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = Logger.getLogger(component);

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(
          `Method ${propertyKey} failed`,
          error as Error,
          propertyKey,
          {
            className: target.constructor.name,
            method: propertyKey,
            arguments: args.length,
          }
        );
        throw error;
      }
    };

    return descriptor;
  };
}

// Export singleton logger for convenience
export const defaultLogger = Logger.getLogger('langchain');

export default Logger;