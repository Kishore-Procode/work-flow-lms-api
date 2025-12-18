import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types (e.g., string to number)
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'body');
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'query');
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'params');
};

/**
 * Validate multiple sources
 */
export const validateMultiple = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: any[] = [];

    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source: 'body',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })));
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source: 'query',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })));
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source: 'params',
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    next();
  };
};

/**
 * Custom validation for file uploads
 */
export const validateFileUpload = (options: {
  required?: boolean;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
} = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const {
      required = false,
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
      maxFiles = 1,
    } = options;

    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file as Express.Multer.File | undefined;

    // Check if file is required
    if (required && !file && (!files || files.length === 0)) {
      res.status(400).json({
        success: false,
        message: 'File upload is required',
      });
      return;
    }

    // If no files and not required, continue
    if (!file && (!files || files.length === 0)) {
      next();
      return;
    }

    const filesToValidate = files || (file ? [file] : []);

    // Check number of files
    if (filesToValidate.length > maxFiles) {
      res.status(400).json({
        success: false,
        message: `Maximum ${maxFiles} file(s) allowed`,
      });
      return;
    }

    // Validate each file
    for (const uploadedFile of filesToValidate) {
      // Check file size
      if (uploadedFile.size > maxSize) {
        res.status(400).json({
          success: false,
          message: `File size must not exceed ${Math.round(maxSize / (1024 * 1024))}MB`,
          filename: uploadedFile.originalname,
        });
        return;
      }

      // Check file type
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        res.status(400).json({
          success: false,
          message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          filename: uploadedFile.originalname,
          receivedType: uploadedFile.mimetype,
        });
        return;
      }
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Basic XSS prevention - remove script tags and javascript: protocols
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically integrate with a rate limiting service
  // For now, we'll just pass through
  next();
};

/**
 * Custom error handler for validation middleware
 */
export const handleValidationError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.isJoi) {
    const validationErrors = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
    return;
  }

  next(error);
};
