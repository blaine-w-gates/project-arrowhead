import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { httpIntegration, expressIntegration, expressErrorHandler, requestDataIntegration } from '@sentry/node';
import type { Express } from 'express';

/**
 * Sentry error tracking configuration (Sentry v8 API)
 * Provides error monitoring, performance tracking, and release tracking
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Initialize Sentry for error tracking
 * Only enabled in production unless SENTRY_FORCE_ENABLE is set
 */
export function initializeSentry(app: Express) {
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
    
    // Environment (production, staging, development)
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    
    // Release tracking (use git commit hash or version)
    release: process.env.SENTRY_RELEASE || process.env.GIT_COMMIT,
    
    // Integrations for Sentry v8
    integrations: [
      httpIntegration(),
      expressIntegration({ app }),
      requestDataIntegration(),
      ...(process.env.SENTRY_ENABLE_PROFILING === '1' ? [nodeProfilingIntegration()] : [])
    ],

    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% of transactions
    
    // Profiling sample rate (only if profiling enabled)
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Redact sensitive query params
      if (event.request?.query_string && typeof event.request.query_string === 'string') {
        const sensitiveParams = ['token', 'password', 'secret', 'api_key'];
        let queryString = event.request.query_string;
        sensitiveParams.forEach(param => {
          const regex = new RegExp(`${param}=[^&]*`, 'gi');
          queryString = queryString.replace(regex, `${param}=[REDACTED]`);
        });
        event.request.query_string = queryString;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'fb_xd_fragment',
      // Random plugins/extensions
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Network errors that we can't control
      'NetworkError',
      'Network request failed',
      // Validation errors (these are expected)
      'ZodError',
      'Validation failed'
    ],

    // Filter out noisy transactions
    beforeSendTransaction(event) {
      // Don't track healthcheck endpoints
      if (event.transaction?.includes('/health') || 
          event.transaction?.includes('/ping') ||
          event.transaction?.includes('/_next/')) {
        return null;
      }
      return event;
    }
  });

  console.log('[Sentry] Error tracking initialized', {
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || 'unknown',
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
  });
}

/**
 * Setup Sentry Express middleware
 * In Sentry v8, this is handled by the expressIntegration
 * This function is kept for API compatibility but is a no-op
 */
export function setupSentryMiddleware(_app: Express) {
  // In Sentry v8, the expressIntegration handles this automatically
  // No manual middleware setup needed
}

/**
 * Setup Sentry error handler
 * Must be called after all routes but before other error handlers
 */
export function setupSentryErrorHandler(app: Express) {
  if (isTest) return;

  // Error handler for Sentry v8
  app.use(expressErrorHandler({
    shouldHandleError(error: any) {
      // Capture all errors with status >= 500
      const statusCode = error?.statusCode || error?.status || 500;
      return statusCode >= 500;
    }
  }));
}

/**
 * Manually capture an error with additional context
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (isTest) return;

  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
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
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
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
  return !isTest && Sentry.getClient() !== undefined;
}

export { Sentry };
