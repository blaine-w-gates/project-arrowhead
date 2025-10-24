/**
 * Winston Logging Configuration
 * Provides structured logging for development and production
 */

import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Log levels: error, warn, info, http, verbose, debug, silly
 * Production: info and above
 * Development: debug and above
 */
const level = isDevelopment ? 'debug' : 'info';

/**
 * Format for production: JSON for log aggregation
 * Format for development: Colorized and human-readable
 */
const format = isDevelopment
  ? winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    )
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );

/**
 * Transports: where logs are written
 * - Console: always
 * - Files: production only (error.log, combined.log)
 */
const transports: winston.transport[] = [
  new winston.transports.Console()
];

// Add file transports in production
if (!isDevelopment && !isTest) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level,
  format,
  transports,
  // Don't exit on error
  exitOnError: false,
  // Silence logger in test environment
  silent: isTest
});

/**
 * Log HTTP requests (for Express middleware)
 */
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  const message = `${method} ${url} ${statusCode} - ${duration}ms`;
  
  if (statusCode >= 500) {
    logger.error(message);
  } else if (statusCode >= 400) {
    logger.warn(message);
  } else {
    logger.http(message);
  }
}

/**
 * Log with context (additional metadata)
 */
export function logWithContext(level: string, message: string, context?: Record<string, unknown>) {
  logger.log(level, message, context);
}
