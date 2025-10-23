import winston from 'winston';
import path from 'path';

/**
 * Centralized logging configuration using Winston
 * Provides structured logging with different transports for dev/prod
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // Add stack trace if present
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// JSON format for file output (easier to parse in production)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
    level: isDevelopment ? 'debug' : 'info'
  })
];

// File transports (only in production or if LOG_TO_FILE is set)
if (!isDevelopment || process.env.LOG_TO_FILE === '1') {
  const logDir = process.env.LOG_DIR || 'logs';
  
  // Combined log (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );
  
  // Error log (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Create a stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

/**
 * Helper function to create a child logger with context
 * Useful for adding request IDs, user IDs, etc.
 */
export function createContextLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Helper function to log API requests
 */
export function logRequest(req: { method: string; url: string; ip?: string }, userId?: string) {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId
  });
}

/**
 * Helper function to log API responses
 */
export function logResponse(
  req: { method: string; url: string },
  statusCode: number,
  duration: number
) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  
  logger.log(level, 'API Response', {
    method: req.method,
    url: req.url,
    statusCode,
    duration: `${duration}ms`
  });
}

/**
 * Helper function to log errors with context
 */
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

/**
 * Helper function to log database operations
 */
export function logDbOperation(operation: string, table: string, duration?: number) {
  logger.debug('Database operation', {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined
  });
}

/**
 * Helper function to log auth events
 */
export function logAuthEvent(event: string, userId?: string, success?: boolean) {
  logger.info('Auth event', {
    event,
    userId,
    success
  });
}

// Log uncaught exceptions and unhandled rejections
if (!isDevelopment) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR || 'logs', 'exceptions.log') })
  );
  
  logger.rejections.handle(
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR || 'logs', 'rejections.log') })
  );
}

// Export logger as default
export default logger;
