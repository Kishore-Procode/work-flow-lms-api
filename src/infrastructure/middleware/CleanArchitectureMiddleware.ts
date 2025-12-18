/**
 * Clean Architecture Middleware Adapters
 * 
 * Adapts existing middleware to work with Clean Architecture while maintaining
 * identical functionality and API contracts.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { enhancedAuthenticate, enhancedAuthorize, enhancedAuthorizeResource } from '../../middleware/enhanced-auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { errorHandler, asyncHandler } from '../../middleware/errorHandler';
import { UserRole } from '../../types';
import Joi from 'joi';

/**
 * Clean Architecture Authentication Middleware
 * Wraps existing authentication middleware for use with Clean Architecture controllers
 */
export class CleanAuthMiddleware {
  /**
   * Standard authentication middleware
   */
  public static authenticate() {
    return authenticate;
  }

  /**
   * Optional authentication middleware
   */
  public static optionalAuthenticate() {
    return optionalAuthenticate;
  }

  /**
   * Enhanced authentication with session tracking
   */
  public static enhancedAuthenticate() {
    return enhancedAuthenticate;
  }
}

/**
 * Clean Architecture Authorization Middleware
 * Wraps existing authorization middleware for use with Clean Architecture controllers
 */
export class CleanAuthzMiddleware {
  /**
   * Role-based authorization
   */
  public static authorize(...roles: UserRole[]) {
    return enhancedAuthorize(...roles);
  }

  /**
   * Resource-based authorization
   */
  public static authorizeResource(options: {
    allowSelfAccess?: boolean;
    allowCollegeAccess?: boolean;
    allowDepartmentAccess?: boolean;
    resourceUserIdParam?: string;
    resourceCollegeIdParam?: string;
    resourceDepartmentIdParam?: string;
    requireOwnership?: boolean;
  } = {}) {
    return enhancedAuthorizeResource(options);
  }
}

/**
 * Clean Architecture Validation Middleware
 * Wraps existing validation middleware for use with Clean Architecture controllers
 */
export class CleanValidationMiddleware {
  /**
   * Validate request body
   */
  public static validateBody(schema: Joi.ObjectSchema) {
    return validate(schema, 'body');
  }

  /**
   * Validate query parameters
   */
  public static validateQuery(schema: Joi.ObjectSchema) {
    return validate(schema, 'query');
  }

  /**
   * Validate route parameters
   */
  public static validateParams(schema: Joi.ObjectSchema) {
    return validate(schema, 'params');
  }
}

/**
 * Clean Architecture Error Handling Middleware
 * Wraps existing error handling for use with Clean Architecture controllers
 */
export class CleanErrorMiddleware {
  /**
   * Global error handler
   */
  public static errorHandler() {
    return errorHandler;
  }

  /**
   * Async handler wrapper
   */
  public static asyncHandler(fn: Function) {
    return asyncHandler(fn);
  }
}

/**
 * Validation Schemas for Clean Architecture
 * Reusable validation schemas for common operations
 */
export class CleanValidationSchemas {
  /**
   * Department creation schema
   */
  public static readonly createDepartment = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name cannot exceed 100 characters',
      'any.required': 'Department name is required',
    }),
    code: Joi.string().min(2).max(10).alphanum().uppercase().required().messages({
      'string.min': 'Department code must be at least 2 characters',
      'string.max': 'Department code cannot exceed 10 characters',
      'string.alphanum': 'Department code must contain only letters and numbers',
      'any.required': 'Department code is required',
    }),
    collegeId: Joi.string().uuid().required().messages({
      'string.uuid': 'College ID must be a valid UUID',
      'any.required': 'College ID is required',
    }),
    courseId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Course ID must be a valid UUID',
    }),
    hodId: Joi.string().uuid().optional().messages({
      'string.uuid': 'HOD ID must be a valid UUID',
    }),
    established: Joi.date().optional().messages({
      'date.base': 'Established date must be a valid date',
    }),
    isActive: Joi.boolean().default(true),
    isCustom: Joi.boolean().default(false),
  });

  /**
   * Department query parameters schema
   */
  public static readonly getDepartmentsQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().min(1).max(100).default(25).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),
    search: Joi.string().max(100).optional().messages({
      'string.max': 'Search term cannot exceed 100 characters',
    }),
    collegeId: Joi.string().uuid().optional().messages({
      'string.uuid': 'College ID must be a valid UUID',
    }),
    courseId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Course ID must be a valid UUID',
    }),
    hodId: Joi.string().uuid().optional().messages({
      'string.uuid': 'HOD ID must be a valid UUID',
    }),
    isActive: Joi.boolean().optional(),
    isCustom: Joi.boolean().optional(),
  });

  /**
   * Department parameters schema
   */
  public static readonly departmentParams = Joi.object({
    departmentId: Joi.string().uuid().required().messages({
      'string.uuid': 'Department ID must be a valid UUID',
      'any.required': 'Department ID is required',
    }),
    collegeId: Joi.string().uuid().optional().messages({
      'string.uuid': 'College ID must be a valid UUID',
    }),
  });

  /**
   * User creation schema
   */
  public static readonly createUser = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('super_admin', 'admin', 'principal', 'hod', 'staff', 'student').required(),
    collegeId: Joi.string().uuid().optional(),
    departmentId: Joi.string().uuid().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  });

  /**
   * Login schema
   */
  public static readonly login = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  /**
   * Refresh token schema
   */
  public static readonly refreshToken = Joi.object({
    refreshToken: Joi.string().required(),
  });
}

/**
 * Middleware factory for Clean Architecture routes
 */
export class CleanMiddlewareFactory {
  /**
   * Create authentication middleware chain
   */
  public static createAuthChain(enhanced: boolean = false) {
    return enhanced ? 
      [CleanAuthMiddleware.enhancedAuthenticate()] : 
      [CleanAuthMiddleware.authenticate()];
  }

  /**
   * Create authorization middleware chain
   */
  public static createAuthzChain(...roles: UserRole[]) {
    return [
      CleanAuthMiddleware.authenticate(),
      CleanAuthzMiddleware.authorize(...roles),
    ];
  }

  /**
   * Create validation middleware chain
   */
  public static createValidationChain(
    bodySchema?: Joi.ObjectSchema,
    querySchema?: Joi.ObjectSchema,
    paramsSchema?: Joi.ObjectSchema
  ) {
    const middleware: any[] = [];
    
    if (paramsSchema) {
      middleware.push(CleanValidationMiddleware.validateParams(paramsSchema));
    }
    if (querySchema) {
      middleware.push(CleanValidationMiddleware.validateQuery(querySchema));
    }
    if (bodySchema) {
      middleware.push(CleanValidationMiddleware.validateBody(bodySchema));
    }
    
    return middleware;
  }

  /**
   * Create complete middleware chain for CRUD operations
   */
  public static createCrudChain(
    operation: 'create' | 'read' | 'update' | 'delete',
    roles: UserRole[],
    schemas: {
      body?: Joi.ObjectSchema;
      query?: Joi.ObjectSchema;
      params?: Joi.ObjectSchema;
    } = {}
  ) {
    const middleware: any[] = [];
    
    // Authentication
    middleware.push(CleanAuthMiddleware.authenticate());
    
    // Authorization
    if (roles.length > 0) {
      middleware.push(CleanAuthzMiddleware.authorize(...roles));
    }
    
    // Validation
    middleware.push(...CleanMiddlewareFactory.createValidationChain(
      schemas.body,
      schemas.query,
      schemas.params
    ));
    
    return middleware;
  }
}

/**
 * Export all middleware for easy access
 */
export {
  CleanAuthMiddleware as Auth,
  CleanAuthzMiddleware as Authz,
  CleanValidationMiddleware as Validation,
  CleanErrorMiddleware as ErrorHandler,
  CleanValidationSchemas as Schemas,
  CleanMiddlewareFactory as MiddlewareFactory,
};

/**
 * Default export for convenience
 */
export default {
  Auth: CleanAuthMiddleware,
  Authz: CleanAuthzMiddleware,
  Validation: CleanValidationMiddleware,
  ErrorHandler: CleanErrorMiddleware,
  Schemas: CleanValidationSchemas,
  Factory: CleanMiddlewareFactory,
};
