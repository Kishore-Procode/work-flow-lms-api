/**
 * Enterprise-Level Logging System
 * 
 * This module provides structured logging with Winston following
 * MNC enterprise standards for observability and debugging.
 * 
 * Features:
 * - Structured JSON logging
 * - Multiple log levels and transports
 * - Request correlation IDs
 * - Performance monitoring
 * - Error tracking with stack traces
 * - Environment-specific configurations
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import winston from 'winston';
import path from 'path';
import { Request } from 'express';

/**
 * Log levels following RFC 5424 standard
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  /** Unique request ID for correlation */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** HTTP method */
  method?: string;
  /** Request URL */
  url?: string;
  /** Response status code */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Error object */
  error?: Error;
  /** Stack trace */
  stack?: string;
  /** Allow any additional properties for flexibility */
  [key: string]: any;
}

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      service: 'one-student-one-resource-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...meta,
    };

    return JSON.stringify(logEntry);
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const reqId = requestId ? ` [${requestId}]` : '';
    return `${timestamp} ${level}${reqId}: ${message}${metaStr}`;
  })
);

/**
 * Create Winston logger instance
 */
const createLogger = (): winston.Logger => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');

  const transports: winston.transport[] = [
    // Console transport for development
    new winston.transports.Console({
      level: logLevel,
      format: isDevelopment ? consoleFormat : logFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ];

  // File transports for production
  if (!isDevelopment) {
    transports.push(
      // Combined log file
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        level: 'info',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
      // Error log file
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
      // HTTP access log file
      new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'http',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
    // Handle uncaught exceptions and unhandled rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
        format: logFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log'),
        format: logFormat,
      }),
    ],
  });
};

/**
 * Global logger instance
 */
export const logger = createLogger();

/**
 * Logger class with enhanced functionality
 */
export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;

  private constructor() {
    this.winston = logger;
  }

  /**
   * Get singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log error with context
   */
  public error(message: string, context?: LogContext): void {
    this.winston.error(message, this.formatContext(context));
  }

  /**
   * Log warning with context
   */
  public warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.formatContext(context));
  }

  /**
   * Log info with context
   */
  public info(message: string, context?: LogContext): void {
    this.winston.info(message, this.formatContext(context));
  }

  /**
   * Log HTTP request with context
   */
  public http(message: string, context?: LogContext): void {
    this.winston.http(message, this.formatContext(context));
  }

  /**
   * Log debug information with context
   */
  public debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.formatContext(context));
  }

  /**
   * Log API request
   */
  public logRequest(req: Request, statusCode: number, responseTime: number): void {
    const context: LogContext = {
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.id,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      responseTime,
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        query: req.query,
        body: this.sanitizeBody(req.body),
      },
    };

    const message = `${req.method} ${req.originalUrl} ${statusCode} - ${responseTime}ms`;
    this.http(message, context);
  }

  /**
   * Log database query
   */
  public logQuery(query: string, params: any[], duration: number, context?: LogContext): void {
    this.debug('Database query executed', {
      ...context,
      metadata: {
        query: query.replace(/\s+/g, ' ').trim(),
        params,
        duration,
      },
    });
  }

  /**
   * Log authentication events
   */
  public logAuth(event: string, userId?: string, context?: LogContext): void {
    this.info(`Authentication: ${event}`, {
      ...context,
      userId,
      metadata: {
        event,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log business logic events
   */
  public logBusiness(event: string, context?: LogContext): void {
    this.info(`Business: ${event}`, {
      ...context,
      metadata: {
        event,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Format log context
   */
  private formatContext(context?: LogContext): Record<string, any> {
    if (!context) {
      return {};
    }

    const formatted: Record<string, any> = {};

    if (context.requestId) formatted.requestId = context.requestId;
    if (context.userId) formatted.userId = context.userId;
    if (context.method) formatted.method = context.method;
    if (context.url) formatted.url = context.url;
    if (context.statusCode) formatted.statusCode = context.statusCode;
    if (context.responseTime) formatted.responseTime = context.responseTime;
    if (context.error) {
      formatted.error = {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      };
    }
    if (context.stack) formatted.stack = context.stack;
    if (context.metadata) formatted.metadata = context.metadata;

    return formatted;
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Default logger instance
 */
export const appLogger = Logger.getInstance();

/**
 * Create child logger with default context
 */
export const createChildLogger = (defaultContext: LogContext) => {
  return {
    error: (message: string, context?: LogContext) =>
      appLogger.error(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      appLogger.warn(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      appLogger.info(message, { ...defaultContext, ...context }),
    http: (message: string, context?: LogContext) =>
      appLogger.http(message, { ...defaultContext, ...context }),
    debug: (message: string, context?: LogContext) =>
      appLogger.debug(message, { ...defaultContext, ...context }),
  };
};

export default appLogger;
