/**
 * Enhanced Validation Schemas
 * 
 * Comprehensive validation schemas with enterprise-level security and
 * input sanitization following OWASP guidelines.
 * 
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import Joi from 'joi';

// Common patterns
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
const namePattern = /^[a-zA-Z\s\-\.\']{2,100}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Enhanced base schemas
export const enhancedEmailSchema = Joi.string()
  .pattern(emailPattern)
  .max(255)
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid email address',
    'string.max': 'Email must not exceed 255 characters',
    'any.required': 'Email is required',
  });

export const enhancedPasswordSchema = Joi.string()
  .pattern(passwordPattern)
  .min(8)
  .max(128)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  });

export const enhancedNameSchema = Joi.string()
  .pattern(namePattern)
  .min(2)
  .max(100)
  .trim()
  .required()
  .messages({
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, dots, and apostrophes',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  });

export const enhancedPhoneSchema = Joi.string()
  .pattern(phonePattern)
  .min(10)
  .max(15)
  .optional()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'string.min': 'Phone number must be at least 10 digits',
    'string.max': 'Phone number must not exceed 15 digits',
  });

export const enhancedUuidSchema = Joi.string()
  .pattern(uuidPattern)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid UUID',
    'any.required': 'ID is required',
  });

export const enhancedUserRoleSchema = Joi.string()
  .valid('super_admin', 'admin', 'principal', 'hod', 'staff', 'student')
  .required()
  .messages({
    'any.only': 'Role must be one of: super_admin, admin, principal, hod, staff, student',
    'any.required': 'Role is required',
  });

export const enhancedUserStatusSchema = Joi.string()
  .valid('active', 'inactive', 'pending', 'suspended')
  .default('pending')
  .messages({
    'any.only': 'Status must be one of: active, inactive, pending, suspended',
  });

// Enhanced pagination schema
export const enhancedPaginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
      'number.max': 'Page must not exceed 10000',
      'number.integer': 'Page must be an integer',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(25)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 1000',
      'number.integer': 'Limit must be an integer',
    }),
  sortBy: Joi.string()
    .pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Sort field contains invalid characters',
      'string.max': 'Sort field must not exceed 50 characters',
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc',
    }),
});

// Enhanced user filter schema
export const enhancedUserFilterSchema = enhancedPaginationSchema.keys({
  role: enhancedUserRoleSchema.optional(),
  status: enhancedUserStatusSchema.optional(),
  collegeId: enhancedUuidSchema.optional(),
  departmentId: enhancedUuidSchema.optional(),
  search: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.max': 'Search term must not exceed 100 characters',
    }),
  emailVerified: Joi.boolean().optional(),
  hasPhone: Joi.boolean().optional(),
  hasCollege: Joi.boolean().optional(),
  hasDepartment: Joi.boolean().optional(),
  createdAfter: Joi.date().iso().optional(),
  createdBefore: Joi.date().iso().optional(),
  lastLoginAfter: Joi.date().iso().optional(),
  lastLoginBefore: Joi.date().iso().optional(),
});

// Enhanced create user schema
export const enhancedCreateUserSchema = Joi.object({
  name: enhancedNameSchema,
  email: enhancedEmailSchema,
  password: enhancedPasswordSchema.optional(),
  role: enhancedUserRoleSchema,
  status: enhancedUserStatusSchema.optional(),
  phone: enhancedPhoneSchema,
  collegeId: enhancedUuidSchema.optional(),
  departmentId: enhancedUuidSchema.optional(),
  rollNumber: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]{1,50}$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Roll number can only contain letters, numbers, hyphens, and underscores',
      'string.max': 'Roll number must not exceed 50 characters',
    }),
  classInCharge: Joi.string()
    .pattern(/^[a-zA-Z0-9\s\-]{1,50}$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Class in charge can only contain letters, numbers, spaces, and hyphens',
      'string.max': 'Class in charge must not exceed 50 characters',
    }),
  class: Joi.string()
    .pattern(/^[a-zA-Z0-9\s\-]{1,50}$/)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Class can only contain letters, numbers, spaces, and hyphens',
      'string.max': 'Class must not exceed 50 characters',
    }),
  semester: Joi.string()
    .pattern(/^[1-8]$/)
    .optional()
    .messages({
      'string.pattern.base': 'Semester must be a number between 1 and 8',
    }),
  profileImageUrl: Joi.string()
    .uri()
    .max(500)
    .optional()
    .messages({
      'string.uri': 'Profile image URL must be a valid URL',
      'string.max': 'Profile image URL must not exceed 500 characters',
    }),
});

// Enhanced update user schema
export const enhancedUpdateUserSchema = Joi.object({
  name: enhancedNameSchema.optional(),
  email: enhancedEmailSchema.optional(),
  role: enhancedUserRoleSchema.optional(),
  status: enhancedUserStatusSchema.optional(),
  phone: enhancedPhoneSchema,
  collegeId: enhancedUuidSchema.optional().allow(null),
  departmentId: enhancedUuidSchema.optional().allow(null),
  rollNumber: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]{1,50}$/)
    .max(50)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Roll number can only contain letters, numbers, hyphens, and underscores',
      'string.max': 'Roll number must not exceed 50 characters',
    }),
  classInCharge: Joi.string()
    .pattern(/^[a-zA-Z0-9\s\-]{1,50}$/)
    .max(50)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Class in charge can only contain letters, numbers, spaces, and hyphens',
      'string.max': 'Class in charge must not exceed 50 characters',
    }),
  class: Joi.string()
    .pattern(/^[a-zA-Z0-9\s\-]{1,50}$/)
    .max(50)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Class can only contain letters, numbers, spaces, and hyphens',
      'string.max': 'Class must not exceed 50 characters',
    }),
  semester: Joi.string()
    .pattern(/^[1-8]$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Semester must be a number between 1 and 8',
    }),
  profileImageUrl: Joi.string()
    .uri()
    .max(500)
    .optional()
    .allow(null)
    .messages({
      'string.uri': 'Profile image URL must be a valid URL',
      'string.max': 'Profile image URL must not exceed 500 characters',
    }),
  emailVerified: Joi.boolean().optional(),
  version: Joi.number().integer().min(0).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Enhanced login schema
export const enhancedLoginSchema = Joi.object({
  email: enhancedEmailSchema,
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password is required',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required',
    }),
  rememberMe: Joi.boolean().default(false),
});

// Enhanced change password schema
export const enhancedChangePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Current password is required',
      'string.max': 'Current password must not exceed 128 characters',
      'any.required': 'Current password is required',
    }),
  newPassword: enhancedPasswordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required',
    }),
});

// Parameter validation schemas
export const enhancedUserIdParamSchema = Joi.object({
  userId: enhancedUuidSchema,
});

export const enhancedCollegeIdParamSchema = Joi.object({
  collegeId: enhancedUuidSchema,
});

export const enhancedDepartmentIdParamSchema = Joi.object({
  departmentId: enhancedUuidSchema,
});

// Bulk operation schemas
export const enhancedBulkUserOperationSchema = Joi.object({
  userIds: Joi.array()
    .items(enhancedUuidSchema)
    .min(1)
    .max(100)
    .unique()
    .required()
    .messages({
      'array.min': 'At least one user ID is required',
      'array.max': 'Cannot process more than 100 users at once',
      'array.unique': 'Duplicate user IDs are not allowed',
      'any.required': 'User IDs are required',
    }),
  operation: Joi.string()
    .valid('activate', 'deactivate', 'suspend', 'delete')
    .required()
    .messages({
      'any.only': 'Operation must be one of: activate, deactivate, suspend, delete',
      'any.required': 'Operation is required',
    }),
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason must not exceed 500 characters',
    }),
});

export default {
  enhancedEmailSchema,
  enhancedPasswordSchema,
  enhancedNameSchema,
  enhancedPhoneSchema,
  enhancedUuidSchema,
  enhancedUserRoleSchema,
  enhancedUserStatusSchema,
  enhancedPaginationSchema,
  enhancedUserFilterSchema,
  enhancedCreateUserSchema,
  enhancedUpdateUserSchema,
  enhancedLoginSchema,
  enhancedChangePasswordSchema,
  enhancedUserIdParamSchema,
  enhancedCollegeIdParamSchema,
  enhancedDepartmentIdParamSchema,
  enhancedBulkUserOperationSchema,
};
