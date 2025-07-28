import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Capture user information
  initialScope: {
    tags: {
      component: "client",
      version: process.env.npm_package_version || "unknown",
    },
  },
  
  // Performance monitoring
  // enableTracing: true, // Removed due to API changes
  
  // Error filtering
  beforeSend(event) {
    // Filter out irrelevant errors in development
    if (process.env.NODE_ENV !== "production") {
      // Skip hydration errors in development
      if (event.exception?.values?.[0]?.value?.includes("Hydration")) {
        return null;
      }
    }
    
    // Skip network errors that are expected
    if (event.exception?.values?.[0]?.value?.includes("NetworkError")) {
      return null;
    }
    
    return event;
  },
  
  // Breadcrumb configuration
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === "console" && breadcrumb.level !== "error") {
      return null;
    }
    
    return breadcrumb;
  },
});