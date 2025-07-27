import { NextRequest, NextResponse } from "next/server";

interface SecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigins: string[];
  enableHelmetHeaders: boolean;
  trustedProxies: number;
}

const getSecurityConfig = (): SecurityConfig => {
  const isProd = process.env.NODE_ENV === "production";
  
  return {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isProd ? "100" : "1000")),
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["http://localhost:3000"],
    enableHelmetHeaders: isProd,
    trustedProxies: parseInt(process.env.TRUSTED_PROXIES || "1"),
  };
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const applyRateLimit = (request: NextRequest): boolean => {
  const config = getSecurityConfig();
  const clientIP = getClientIP(request);
  const now = Date.now();
  const windowStart = now - config.rateLimitWindowMs;

  const existing = rateLimitStore.get(clientIP);
  
  if (!existing || existing.resetTime < windowStart) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + config.rateLimitWindowMs });
    return true;
  }

  if (existing.count >= config.rateLimitMaxRequests) {
    return false;
  }

  existing.count++;
  return true;
};

export const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const clientIP = request.headers.get("x-client-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (real) return real;
  if (clientIP) return clientIP;
  
  return "127.0.0.1";
};

export const createSecurityHeaders = (): HeadersInit => {
  const config = getSecurityConfig();
  
  if (!config.enableHelmetHeaders) {
    return {};
  }

  return {
    "X-DNS-Prefetch-Control": "off",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.anthropic.com *.vercel.app; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: *.githubusercontent.com; " +
      "font-src 'self'; " +
      "connect-src 'self' *.anthropic.com *.mongodb.net *.airtable.com api.github.com *.sentry.io; " +
      "frame-ancestors 'none';",
    "Permissions-Policy": 
      "accelerometer=(), " +
      "camera=(), " +
      "geolocation=(), " +
      "gyroscope=(), " +
      "magnetometer=(), " +
      "microphone=(), " +
      "payment=(), " +
      "usb=()"
  };
};

export const validateCorsOrigin = (origin: string | null): boolean => {
  const config = getSecurityConfig();
  
  if (!origin) return true; // Same-origin requests
  
  return config.corsOrigins.includes(origin) || 
         config.corsOrigins.includes("*") ||
         (!process.env.NODE_ENV || process.env.NODE_ENV === "development");
};

export const createCorsHeaders = (origin: string | null): HeadersInit => {
  const config = getSecurityConfig();
  
  if (!validateCorsOrigin(origin)) {
    return {};
  }

  const allowedOrigin = origin && config.corsOrigins.includes(origin) 
    ? origin 
    : config.corsOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
};

export const withSecurity = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    const origin = request.headers.get("origin");
    
    // Apply rate limiting
    if (!applyRateLimit(request)) {
      return new NextResponse("Too Many Requests", { 
        status: 429,
        headers: {
          "Retry-After": "900", // 15 minutes
          ...createSecurityHeaders()
        }
      });
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          ...createCorsHeaders(origin),
          ...createSecurityHeaders()
        }
      });
    }

    // Validate CORS
    if (origin && !validateCorsOrigin(origin)) {
      return new NextResponse("CORS Error", { 
        status: 403,
        headers: createSecurityHeaders()
      });
    }

    try {
      const response = await handler(request);
      
      // Apply security headers to response
      const headers = new Headers(response.headers);
      
      Object.entries(createSecurityHeaders()).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      Object.entries(createCorsHeaders(origin)).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error("Security middleware error:", error);
      return new NextResponse("Internal Server Error", { 
        status: 500,
        headers: createSecurityHeaders()
      });
    }
  };
};

export const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
};

// Cleanup old rate limit entries every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 1800000);
}