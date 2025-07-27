import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Server-specific configuration
  initialScope: {
    tags: {
      component: "server",
      version: process.env.npm_package_version || "unknown",
      nodejs: process.version,
    },
  },
  
  // Performance monitoring
  // enableTracing: true, // Removed due to API changes
  
  // Enhanced error context
  beforeSend(event, hint) {
    // Add additional context for server errors
    if (event.server_name) {
      event.tags = {
        ...event.tags,
        server: event.server_name,
      };
    }
    
    // Add request context if available
    if (hint.originalException instanceof Error) {
      const error = hint.originalException;
      if ('request' in error) {
        event.extra = {
          ...event.extra,
          requestUrl: (error as any).request?.url,
          requestMethod: (error as any).request?.method,
        };
      }
    }
    
    return event;
  },
  
  // Integration configuration
  // integrations: [
  //   new Sentry.Integrations.Http({ tracing: true }),
  //   new Sentry.Integrations.OnUncaughtException(),
  //   new Sentry.Integrations.OnUnhandledRejection(),
  // ], // Removed due to API changes
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
});