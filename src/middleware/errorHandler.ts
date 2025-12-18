/**
 * Enterprise Error Handling Middleware
 * 
 * This module provides comprehensive error handling following
 * MNC enterprise standards for API error management.
 * 
 * Features:
 * - Structured error responses
 * - Error logging and monitoring
 * - Security-aware error messages
 * - HTTP status code mapping
 * - Request correlation tracking
 * - Performance impact monitoring
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import type { Request, Response, NextFunction } from 'express';
import { appLogger } from '../utils/logger';

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>;

  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, { fields });
    this.fields = fields;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, ErrorCode.RESOURCE_NOT_FOUND);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, ErrorCode.RESOURCE_CONFLICT);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }
}

/**
 * Standard error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

/**
 * Map common errors to HTTP status codes
 */
const getStatusCodeFromError = (error: Error): number => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Handle common Node.js/Express errors
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'CastError') return 400;
  if (error.name === 'MongoError' || error.name === 'MongoServerError') return 500;
  if (error.name === 'JsonWebTokenError') return 401;
  if (error.name === 'TokenExpiredError') return 401;
  if (error.name === 'SyntaxError') return 400;

  // Default to 500 for unknown errors
  return 500;
};

/**
 * Get error code from error type
 */
const getErrorCodeFromError = (error: Error): ErrorCode => {
  if (error instanceof AppError) {
    return error.code;
  }

  // Map common error types
  if (error.name === 'ValidationError') return ErrorCode.VALIDATION_ERROR;
  if (error.name === 'CastError') return ErrorCode.INVALID_INPUT;
  if (error.name === 'JsonWebTokenError') return ErrorCode.INVALID_TOKEN;
  if (error.name === 'TokenExpiredError') return ErrorCode.TOKEN_EXPIRED;
  if (error.name === 'MongoError' || error.name === 'MongoServerError') return ErrorCode.DATABASE_ERROR;

  return ErrorCode.INTERNAL_SERVER_ERROR;
};

/**
 * Sanitize error message for production
 */
const sanitizeErrorMessage = (error: Error, isDevelopment: boolean): string => {
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  if (isDevelopment) {
    return error.message;
  }

  // Don't expose internal error details in production
  const statusCode = getStatusCodeFromError(error);
  
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 429:
      return 'Too Many Requests';
    case 500:
    default:
      return 'Internal Server Error';
  }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestId = req.headers['x-request-id'] as string;
  const statusCode = getStatusCodeFromError(error);
  const errorCode = getErrorCodeFromError(error);
  const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment);

  // Log the error
  appLogger.error('Request error', {
    requestId,
    userId: (req as any).user?.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    error,
    metadata: {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      body: req.body,
      params: req.params,
      query: req.query,
    },
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.originalUrl,
    },
  };

  // Add additional details for specific error types
  if (error instanceof ValidationError) {
    errorResponse.error.details = {
      fields: error.fields,
    };
  }

  // Add stack trace in development
  if (isDevelopment && !(error instanceof AppError && error.isOperational)) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: error.stack,
    };
  }

  // Add context if available
  if (error instanceof AppError && error.context) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      context: error.context,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError('Route');
  const requestId = req.headers['x-request-id'] as string;

  appLogger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: 404,
    metadata: {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.originalUrl,
    },
  };

  res.status(404).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create error with context
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  context?: Record<string, any>
): AppError => {
  return new AppError(message, statusCode, code, true, context);
};

export default AppError;
