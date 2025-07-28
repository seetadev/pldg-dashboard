import { NextRequest, NextResponse } from "next/server";
import { Logger } from "./logger";
import { withSecurity } from "./security";

const logger = Logger.getInstance();

export interface MiddlewareContext {
  startTime: number;
  requestId: string;
  userId?: string;
  sessionId?: string;
}

export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const withLogging = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to headers for tracing
    const requestWithId = new NextRequest(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        "x-request-id": requestId,
      },
    });

    // Log incoming request
    logger.logHttpRequest(requestWithId, {
      requestId,
      metadata: {
        userAgent: request.headers.get("user-agent") || undefined,
        referer: request.headers.get("referer") || undefined,
        contentLength: request.headers.get("content-length") || undefined,
        contentType: request.headers.get("content-type") || undefined,
      }
    });

    try {
      const response = await handler(requestWithId);
      const responseTime = Date.now() - startTime;
      
      // Log successful response
      logger.logHttpResponse(requestWithId, response.status, responseTime, {
        requestId,
        metadata: {
          responseSize: response.headers.get("content-length") || undefined,
          cacheStatus: response.headers.get("x-cache") || response.headers.get("cf-cache-status") || undefined,
        }
      });

      // Add request ID and timing headers to response
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);
      headers.set("x-response-time", `${responseTime}ms`);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Log error
      logger.error("Request handler error", error as Error, {
        requestId,
        method: request.method,
        url: request.url,
        responseTime,
      });

      return new NextResponse("Internal Server Error", {
        status: 500,
        headers: {
          "x-request-id": requestId,
          "x-response-time": `${responseTime}ms`,
        },
      });
    }
  };
};

export const withPerformanceMonitoring = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();
    
    const response = await handler(request);
    
    const responseTime = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    const memoryDelta = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      external: memoryAfter.external - memoryBefore.external,
    };

    // Log performance metrics for slow requests
    if (responseTime > 1000) {
      logger.logPerformanceMetric("slow_request", responseTime, "ms", {
        url: request.url,
        method: request.method,
        metadata: {
          memoryDelta,
          heapUsedMB: Math.round(memoryAfter.heapUsed / 1024 / 1024),
        }
      });
    }

    // Log memory usage spikes
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
      logger.warn("High memory usage detected", {
        url: request.url,
        method: request.method,
        metadata: {
          memoryDelta,
          responseTime,
        }
      });
    }

    return response;
  };
};

export const withErrorHandling = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      const requestId = request.headers.get("x-request-id") || generateRequestId();
      
      // Log the error with context
      logger.error("Unhandled request error", error as Error, {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get("user-agent") || undefined,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      });

      // Return appropriate error response based on error type
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          return new NextResponse("Request Timeout", {
            status: 408,
            headers: { "x-request-id": requestId },
          });
        }
        
        if (error.message.includes("rate limit")) {
          return new NextResponse("Too Many Requests", {
            status: 429,
            headers: { 
              "x-request-id": requestId,
              "Retry-After": "60",
            },
          });
        }
        
        if (error.message.includes("validation")) {
          return new NextResponse("Bad Request", {
            status: 400,
            headers: { "x-request-id": requestId },
          });
        }
      }

      return new NextResponse("Internal Server Error", {
        status: 500,
        headers: { "x-request-id": requestId },
      });
    }
  };
};

// Comprehensive middleware composer
export const withMiddleware = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return withErrorHandling(
    withPerformanceMonitoring(
      withLogging(
        withSecurity(handler)
      )
    )
  );
};

// Health check middleware
export const withHealthCheck = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    if (request.nextUrl.pathname === "/health" || request.nextUrl.pathname === "/api/health") {
      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || "unknown",
        environment: process.env.NODE_ENV || "development",
      };

      logger.info("Health check accessed", {
        url: request.url,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      });

      return NextResponse.json(healthData, { status: 200 });
    }

    return handler(request);
  };
};

// Middleware for development vs production environments
export const withEnvironmentConfig = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    // Add environment-specific headers
    const headers = new Headers();
    
    if (process.env.NODE_ENV === "development") {
      headers.set("X-Debug-Mode", "true");
      headers.set("X-Environment", "development");
    } else {
      headers.set("X-Environment", "production");
    }

    const response = await handler(request);
    
    // Merge environment headers with response headers
    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: finalHeaders,
    });
  };
};

export default withMiddleware;