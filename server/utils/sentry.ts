/**
 * Sentry Error Tracking Configuration
 * Provides error monitoring, performance tracking, and release tracking
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { httpIntegration, expressIntegration, requestDataIntegration, expressErrorHandler } from '@sentry/node';
import type { Express } from 'express';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Initialize Sentry for error tracking
 * Only enabled in production unless SENTRY_FORCE_ENABLE is set
 */
export function initializeSentry(_app: Express) {
  // Skip Sentry in test environment
  if (isTest) {
    return;
  }

  // Only enable in production unless forced
  const sentryEnabled = !isDevelopment || process.env.SENTRY_FORCE_ENABLE === '1';
  
  if (!sentryEnabled) {
    console.log('[Sentry] Disabled in development (set SENTRY_FORCE_ENABLE=1 to enable)');
    return;
  }

  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('[Sentry] SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Environment tracking
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking for version management
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    
    // Performance monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.1, // 100% dev, 10% prod
    
    // Profiling (CPU usage, memory, etc.)
    profilesSampleRate: isDevelopment ? 1.0 : 0.1,
    
    // Integrations for Node.js + Express
    integrations: [
      nodeProfilingIntegration(),
      httpIntegration(),
      expressIntegration(),
      requestDataIntegration({
        include: {
          cookies: false, // Don't log cookies for privacy
          data: true,     // Include request body
          headers: true,  // Include headers
          ip: true,       // Include IP for debugging
          query_string: true,
          url: true
        }
      })
    ],
    
    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive query params
      const queryString = event.request?.query_string;
      if (queryString && typeof queryString === 'string') {
        const sensitiveParams = ['token', 'password', 'secret', 'api_key'];
        const hasSensitive = sensitiveParams.some(param => 
          queryString.includes(param)
        );
        if (hasSensitive && event.request) {
          event.request.query_string = '[REDACTED]';
        }
      }
      
      return event;
    }
  });

  console.log('[Sentry] Initialized for error tracking and performance monitoring');
}

/**
 * Setup request handler middleware
 * Must be called before all routes
 * Note: Sentry v8 integrations are configured in init(), no separate middleware needed
 */
export function setupSentryRequestHandler(_app: Express) {
  if (isTest) return;
  
  // Sentry v8 handles request tracking via expressIntegration()
  // No additional middleware needed
}

/**
 * Setup Sentry error handler
 * Must be called after all routes but before other error handlers
 */
export function setupSentryErrorHandler(app: Express) {
  if (isTest) return;

  // Error handler for Sentry v8
  app.use(expressErrorHandler({
    shouldHandleError(error: unknown) {
      // Capture all errors with status >= 500
      const err = error as { statusCode?: number; status?: number };
      const statusCode = err?.statusCode || err?.status || 500;
      return statusCode >= 500;
    }
  }));
}

/**
 * Manually capture an error with additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (isTest) return;

  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>) {
  if (isTest) return;

  Sentry.captureMessage(message, {
    level,
    extra: context
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  if (isTest) return;

  Sentry.setUser({
    id: userId,
    email,
    username
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (isTest) return;

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (isTest) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info'
  });
}

/**
 * Start a span for performance tracking (Sentry v8 API)
 */
export function startSpan<T>(options: { name: string; op: string }, callback: () => T): T {
  if (isTest) {
    return callback();
  }

  return Sentry.startSpan(options, callback);
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return !isTest && !!process.env.SENTRY_DSN;
}
