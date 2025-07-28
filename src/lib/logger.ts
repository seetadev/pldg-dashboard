import winston from "winston";
import { NextRequest } from "next/server";

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: Error | string;
  metadata?: Record<string, unknown>;
  operation?: string;
  service?: string;
  endpoint?: string;
  model?: string;
  tokensUsed?: number;
  duration?: number;
  collection?: string;
  action?: string;
  metric?: string;
  value?: number;
  unit?: string;
  // Additional fields used in the application
  dataSize?: number;
  inputTokens?: number;
  totalTokens?: number;
  aiDuration?: number;
  apiDuration?: number;
  source?: string;
  errors?: unknown;
  recordCount?: number;
  transformedCount?: number;
  hasBaseId?: boolean;
  hasApiKey?: boolean;
  hasTableName?: boolean;
  baseId?: string;
  tableName?: string;
  errorResponse?: string;
  hasRecords?: boolean;
  isRecordsArray?: boolean;
  dataKeys?: string[];
  projectId?: string;
  username?: string;
  rateLimit?: Record<string, unknown>;
  status?: number | string;
  statusText?: string;
  hasData?: boolean;
  hasUser?: boolean;
  hasProject?: boolean;
  hasItems?: boolean;
  itemCount?: number;
  statusCounts?: Record<string, number>;
  path?: string;
  responseLength?: number;
  services?: Record<string, string>;
  format?: string;
  origin?: string;
}

interface LoggerConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: string;
  maxFiles: string;
  enableJson: boolean;
}

const getLoggerConfig = (): LoggerConfig => {
  const isProd = process.env.NODE_ENV === "production";
  
  return {
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
    enableConsole: process.env.ENABLE_CONSOLE_LOGS !== "false",
    enableFile: process.env.ENABLE_FILE_LOGS === "true" || isProd,
    logDirectory: process.env.LOG_DIRECTORY || "./logs",
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || "20m",
    maxFiles: process.env.LOG_MAX_FILES || "14d",
    enableJson: isProd,
  };
};

const config = getLoggerConfig();

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
  config.enableJson 
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, metadata }) => {
        const metaString = metadata && Object.keys(metadata as object).length ? 
          ` ${JSON.stringify(metadata)}` : "";
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
      })
);

const transports: winston.transport[] = [];

if (config.enableConsole) {
  transports.push(
    new winston.transports.Console({
      format: config.enableJson ? customFormat : winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    })
  );
}

if (config.enableFile) {
  // Application logs
  transports.push(
    new winston.transports.File({
      filename: `${config.logDirectory}/app.log`,
      maxsize: parseFileSize(config.maxFileSize),
      maxFiles: parseInt(config.maxFiles.replace(/\D/g, "")) || 5,
      format: customFormat,
    })
  );

  // Error logs
  transports.push(
    new winston.transports.File({
      filename: `${config.logDirectory}/error.log`,
      level: "error",
      maxsize: parseFloat(config.maxFileSize.replace(/\D/g, "")) * 1024 * 1024,
      maxFiles: parseInt(config.maxFiles.replace(/\D/g, "")) || 5,
      format: customFormat,
    })
  );

  // Access logs for HTTP requests
  transports.push(
    new winston.transports.File({
      filename: `${config.logDirectory}/access.log`,
      maxsize: parseFloat(config.maxFileSize.replace(/\D/g, "")) * 1024 * 1024,
      maxFiles: parseInt(config.maxFiles.replace(/\D/g, "")) || 5,
      format: customFormat,
    })
  );
}

const logger = winston.createLogger({
  level: config.level,
  format: customFormat,
  transports,
  exitOnError: false,
});

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;

  private constructor() {
    this.winston = logger;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(message: string, context?: LogContext): string | object {
    if (!context || Object.keys(context).length === 0) {
      return message;
    }

    return {
      message,
      ...context,
    };
  }

  public debug(message: string, context?: LogContext): void {
    this.winston.debug(this.formatMessage(message, context));
  }

  public info(message: string, context?: LogContext): void {
    this.winston.info(this.formatMessage(message, context));
  }

  public warn(message: string, context?: LogContext): void {
    this.winston.warn(this.formatMessage(message, context));
  }

  public error(message: string, error?: Error | string, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.winston.error(this.formatMessage(message, errorContext));
  }

  // Specialized logging methods
  public logHttpRequest(request: NextRequest, context?: Partial<LogContext>): void {
    const requestContext: LogContext = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("user-agent") || undefined,
      ip: this.extractClientIP(request),
      requestId: request.headers.get("x-request-id") || undefined,
      ...context,
    };

    this.info("HTTP Request", requestContext);
  }

  public logHttpResponse(
    request: NextRequest, 
    statusCode: number, 
    responseTime: number,
    context?: Partial<LogContext>
  ): void {
    const responseContext: LogContext = {
      method: request.method,
      url: request.url,
      statusCode,
      responseTime,
      ip: this.extractClientIP(request),
      requestId: request.headers.get("x-request-id") || undefined,
      ...context,
    };

    const level = statusCode >= 400 ? "warn" : "info";
    this.winston.log(level, this.formatMessage("HTTP Response", responseContext));
  }

  public logDatabaseOperation(
    operation: string,
    collection?: string,
    duration?: number,
    context?: Partial<LogContext>
  ): void {
    const dbContext: LogContext = {
      operation,
      collection,
      duration,
      ...context,
    };

    this.info("Database Operation", dbContext);
  }

  public logExternalAPI(
    service: string,
    endpoint: string,
    method: string,
    statusCode?: number,
    duration?: number,
    context?: Partial<LogContext>
  ): void {
    const apiContext: LogContext = {
      service,
      endpoint,
      method,
      statusCode,
      duration,
      ...context,
    };

    const level = statusCode && statusCode >= 400 ? "warn" : "info";
    this.winston.log(level, this.formatMessage("External API Call", apiContext));
  }

  public logAIOperation(
    operation: string,
    model?: string,
    tokensUsed?: number,
    duration?: number,
    context?: Partial<LogContext>
  ): void {
    const aiContext: LogContext = {
      operation,
      model,
      tokensUsed,
      duration,
      ...context,
    };

    this.info("AI Operation", aiContext);
  }

  public logUserAction(
    action: string,
    userId?: string,
    context?: Partial<LogContext>
  ): void {
    const userContext: LogContext = {
      action,
      userId,
      ...context,
    };

    this.info("User Action", userContext);
  }

  public logPerformanceMetric(
    metric: string,
    value: number,
    unit: string = "ms",
    context?: Partial<LogContext>
  ): void {
    const perfContext: LogContext = {
      metric,
      value,
      unit,
      ...context,
    };

    this.info("Performance Metric", perfContext);
  }

  private extractClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    const clientIP = request.headers.get("x-client-ip");
    
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    if (real) return real;
    if (clientIP) return clientIP;
    
    return "127.0.0.1";
  }

  public createChildLogger(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  public debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  public info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  public warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  public error(message: string, error?: Error | string, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }
}

// Default logger instance
const log = Logger.getInstance();

export { log };
export type { LogContext };
export default log;