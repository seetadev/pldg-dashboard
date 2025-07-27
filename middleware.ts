import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { 
  applyRateLimit, 
  validateCorsOrigin, 
  createCorsHeaders, 
  createSecurityHeaders,
  getClientIP 
} from '@/lib/security';

const logger = Logger.getInstance();

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  
  // Skip middleware for static files and internal Next.js files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Apply rate limiting for API routes
    if (pathname.startsWith('/api/')) {
      if (!applyRateLimit(request)) {
        logger.warn('Rate limit exceeded', {
          ip: getClientIP(request),
          path: pathname,
          userAgent: request.headers.get('user-agent') ?? undefined,
        });
        
        return new NextResponse('Too Many Requests', { 
          status: 429,
          headers: {
            'Retry-After': '900',
            'X-Request-ID': requestId,
            ...createSecurityHeaders()
          }
        });
      }
    }
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          ...createCorsHeaders(origin),
          ...createSecurityHeaders(),
        }
      });
    }
    
    // Validate CORS for cross-origin requests
    if (origin && !validateCorsOrigin(origin)) {
      logger.warn('CORS violation', {
        origin,
        path: pathname,
        ip: getClientIP(request),
      });
      
      return new NextResponse('CORS Error', { 
        status: 403,
        headers: {
          'X-Request-ID': requestId,
          ...createSecurityHeaders()
        }
      });
    }
    
    // Log the request
    logger.logHttpRequest(request, {
      requestId,
      path: pathname,
    });
    
    // Create response
    const response = NextResponse.next();
    
    // Apply security headers
    const securityHeaders = createSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Apply CORS headers
    const corsHeaders = createCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add request tracking headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Middleware error', error as Error, {
      requestId,
      path: pathname,
      duration,
    });
    
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        ...createSecurityHeaders()
      }
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};