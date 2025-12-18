/**
 * Enterprise Input Validation Middleware
 * 
 * This module provides comprehensive input validation and sanitization
 * following MNC enterprise standards for security and data integrity.
 * 
 * Features:
 * - Schema-based validation using Joi
 * - Request sanitization
 * - SQL injection prevention
 * - XSS protection
 * - File upload validation
 * - Rate limiting integration
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import Joi from 'joi';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';
import { appLogger } from '../utils/logger';

/**
 * Validation target types
 */
export enum ValidationTarget {
  BODY = 'body',
  PARAMS = 'params',
  QUERY = 'query',
  HEADERS = 'headers',
}

/**
 * Validation options
 */
interface ValidationOptions {
  /** Allow unknown fields */
  allowUnknown?: boolean;
  /** Strip unknown fields */
  stripUnknown?: boolean;
  /** Abort early on first error */
  abortEarly?: boolean;
  /** Convert values to appropriate types */
  convert?: boolean;
}

/**
 * Default validation options
 */
const defaultValidationOptions: ValidationOptions = {
  allowUnknown: false,
  stripUnknown: true,
  abortEarly: false,
  convert: true,
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID validation
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid ID format',
    'any.required': 'ID is required',
  }),

  // Email validation
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),

  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
    }),

  // Name validation
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Name is required',
    }),

  // Pagination
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),

  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),

  // Search query
  search: Joi.string().max(255).trim().optional().messages({
    'string.max': 'Search query must not exceed 255 characters',
  }),

  // Sort options
  sortBy: Joi.string().valid('name', 'email', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),

  // Status validation
  status: Joi.string().valid('active', 'inactive', 'pending', 'suspended').messages({
    'any.only': 'Status must be one of: active, inactive, pending, suspended',
  }),

  // Role validation
  role: Joi.string().valid('admin', 'principal', 'hod', 'staff', 'student').messages({
    'any.only': 'Role must be one of: admin, principal, hod, staff, student',
  }),
};

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;

  return value
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove SQL injection patterns
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '')
    // Limit length to prevent DoS
    .substring(0, 10000);
};

/**
 * Recursively sanitize object
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Create validation middleware
 */
export const validate = (
  schema: Joi.ObjectSchema,
  target: ValidationTarget = ValidationTarget.BODY,
  options: ValidationOptions = {}
) => {
  const validationOptions = { ...defaultValidationOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get data to validate based on target
      let dataToValidate: any;
      switch (target) {
        case ValidationTarget.BODY:
          dataToValidate = req.body;
          break;
        case ValidationTarget.PARAMS:
          dataToValidate = req.params;
          break;
        case ValidationTarget.QUERY:
          dataToValidate = req.query;
          break;
        case ValidationTarget.HEADERS:
          dataToValidate = req.headers;
          break;
        default:
          dataToValidate = req.body;
      }

      // Sanitize input data
      const sanitizedData = sanitizeObject(dataToValidate);

      // Validate against schema
      const { error, value } = schema.validate(sanitizedData, validationOptions);

      if (error) {
        // Format validation errors
        const fields: Record<string, string[]> = {};
        
        error.details.forEach(detail => {
          const field = detail.path.join('.');
          if (!fields[field]) {
            fields[field] = [];
          }
          fields[field].push(detail.message);
        });

        // Log validation error
        appLogger.warn('Validation error', {
          requestId: req.headers['x-request-id'] as string,
          method: req.method,
          url: req.originalUrl,
          metadata: {
            target,
            fields,
            originalData: dataToValidate,
            sanitizedData,
          },
        });

        throw new ValidationError('Validation failed', fields);
      }

      // Update request with validated and sanitized data
      switch (target) {
        case ValidationTarget.BODY:
          req.body = value;
          break;
        case ValidationTarget.PARAMS:
          req.params = value;
          break;
        case ValidationTarget.QUERY:
          req.query = value;
          break;
        case ValidationTarget.HEADERS:
          // Don't modify headers
          break;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, ValidationTarget.BODY, options);
};

/**
 * Validate request parameters
 */
export const validateParams = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, ValidationTarget.PARAMS, options);
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, ValidationTarget.QUERY, options);
};

/**
 * Validate headers
 */
export const validateHeaders = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, ValidationTarget.HEADERS, options);
};

/**
 * File upload validation middleware
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles = 1,
    required = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const file = req.file as Express.Multer.File | undefined;

      // Check if file is required
      if (required && !file && (!files || files.length === 0)) {
        throw new ValidationError('File upload is required');
      }

      // Validate single file
      if (file) {
        validateSingleFile(file, maxSize, allowedMimeTypes);
      }

      // Validate multiple files
      if (files && files.length > 0) {
        if (files.length > maxFiles) {
          throw new ValidationError(`Maximum ${maxFiles} files allowed`);
        }

        files.forEach(f => validateSingleFile(f, maxSize, allowedMimeTypes));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate single file
 */
const validateSingleFile = (
  file: Express.Multer.File,
  maxSize: number,
  allowedMimeTypes: string[]
): void => {
  // Check file size
  if (file.size > maxSize) {
    throw new ValidationError(`File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Check for malicious file names
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    throw new ValidationError('Invalid file name');
  }
};

/**
 * Common validation schemas for the application
 */
export const validationSchemas = {
  // Authentication
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  register: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: commonSchemas.phone,
    role: commonSchemas.role,
    collegeId: commonSchemas.id.optional(),
    departmentId: commonSchemas.id.optional(),
  }),

  // User management
  createUser: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: commonSchemas.phone,
    role: commonSchemas.role,
    collegeId: commonSchemas.id.optional(),
    departmentId: commonSchemas.id.optional(),
    rollNumber: Joi.string().max(50).optional(),
    year: Joi.number().integer().min(1).max(10).optional(),
    section: Joi.string().max(10).optional(),
  }),

  updateUser: Joi.object({
    name: commonSchemas.name.optional(),
    phone: commonSchemas.phone,
    status: commonSchemas.status.optional(),
    collegeId: commonSchemas.id.optional(),
    departmentId: commonSchemas.id.optional(),
    rollNumber: Joi.string().max(50).optional(),
    year: Joi.number().integer().min(1).max(10).optional(),
    section: Joi.string().max(10).optional(),
  }),

  // Invitation management
  createInvitation: Joi.object({
    email: commonSchemas.email,
    role: commonSchemas.role,
    college_id: commonSchemas.id.when('role', {
      is: Joi.valid('principal', 'hod', 'staff', 'student'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    department_id: commonSchemas.id.when('role', {
      is: Joi.valid('hod', 'staff', 'student'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    // Additional required fields for different roles
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required for invitation',
    }),
    phone: commonSchemas.phone.optional(),
    // Student-specific fields
    yearOfStudy: Joi.when('role', {
      is: 'student',
      then: Joi.number().integer().min(1).max(4).required().messages({
        'any.required': 'Year of study is required for student invitations',
        'number.min': 'Year of study must be between 1 and 4',
        'number.max': 'Year of study must be between 1 and 4',
      }),
      otherwise: Joi.optional()
    }),
        section: Joi.when('role', {
       is: 'student',
       then: Joi.string().max(10).optional(), // optional even for students
       otherwise: Joi.string().max(10).optional()
    }),     
    rollNumber: Joi.when('role', {
      is: 'student',
      then: Joi.string().max(50).required().messages({
        'any.required': 'Roll number is required for student invitations',
      }),
      otherwise: Joi.optional()
    }),
    academicYearId: Joi.when('role', {
      is: 'student',
      then: commonSchemas.id.required().messages({
        'any.required': 'Academic year is required for student invitations',
      }),
      otherwise: Joi.optional()
    }),
    // Staff-specific fields
    designation: Joi.when('role', {
      is: Joi.valid('staff', 'hod'),
      then: Joi.string().max(100).optional(),
      otherwise: Joi.optional()
    }),
    qualification: Joi.when('role', {
      is: Joi.valid('staff', 'hod'),
      then: Joi.string().max(200).optional(),
      otherwise: Joi.optional()
    }),
    experience: Joi.when('role', {
      is: Joi.valid('staff', 'hod'),
      then: Joi.number().integer().min(0).max(50).optional(),
      otherwise: Joi.optional()
    })
  }),

  // Pagination and filtering
  pagination: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    search: commonSchemas.search,
    sortBy: commonSchemas.sortBy,
    sortOrder: commonSchemas.sortOrder,
    status: commonSchemas.status.optional(),
    role: commonSchemas.role.optional(),
  }),

  // ID parameter
  idParam: Joi.object({
    id: commonSchemas.id,
  }),
};

export default validate;
