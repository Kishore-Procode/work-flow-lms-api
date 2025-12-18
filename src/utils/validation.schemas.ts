import Joi, { allow } from 'joi';
import { UserRole } from '../types';

// Common validation patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s\-\(\)]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Password validation schema
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

// OTP validation schema
export const otpSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required',
  });

// Email validation schema
export const emailSchema = Joi.string()
  .email()
  .pattern(emailPattern)
  .lowercase()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

// Phone validation schema
export const phoneSchema = Joi.string()
  .pattern(phonePattern)
  .min(10)
  .max(20)
  .optional()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'string.min': 'Phone number must be at least 10 characters',
    'string.max': 'Phone number must not exceed 20 characters',
  });

// UUID validation schema
export const uuidSchema = Joi.string()
  .pattern(uuidPattern)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid UUID',
    'any.required': 'ID is required',
  });

// User role validation schema
export const userRoleSchema = Joi.string()
  .valid('admin', 'principal', 'hod', 'staff', 'student')
  .required()
  .messages({
    'any.only': 'Role must be one of: admin, principal, hod, staff, student',
    'any.required': 'Role is required',
  });

// Enhanced login schema that accepts both email and registration number
export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .custom((value, helpers) => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a valid registration number (alphanumeric, 4+ chars)
      const regNumberRegex = /^[A-Za-z0-9]{4,20}$/;

      if (emailRegex.test(value) || regNumberRegex.test(value)) {
        return value;
      }

      return helpers.error('string.emailOrRegNumber');
    })
    .messages({
      'string.emailOrRegNumber': 'Please provide a valid email address or registration number',
      'any.required': 'Email or registration number is required',
    }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
  // Optional role restrictions for role-based login
  allowedRoles: Joi.array()
    .items(Joi.string().valid('student', 'admin', 'principal', 'hod', 'staff'))
    .optional()
    .messages({
      'array.base': 'Allowed roles must be an array',
      'any.only': 'Invalid role specified',
    }),
    selectedRole:Joi.string()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required',
    }),
});

export const resetPasswordSchema = Joi.object({
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required',
    }),
});

// User management schemas
export const createUserSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  role: userRoleSchema,
  phone: phoneSchema,
  collegeId: Joi.string().pattern(uuidPattern).optional(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  // Academic structure fields
  courseId: Joi.string().pattern(uuidPattern).optional(),
  academicYearId: Joi.string().pattern(uuidPattern).optional(),
  sectionId: Joi.string().pattern(uuidPattern).optional(), // Allow section UUIDs
  classInCharge: Joi.string().max(50).optional(),
  class: Joi.string().max(50).optional(),
  semester: Joi.string().max(20).optional().allow(''), // Make semester optional and allow empty string
  rollNumber: Joi.string().max(50).optional(),
  batchYear: Joi.number().integer().min(2020).max(2040).optional(),
 yearOfStudy: Joi.string().min(1).max(10).optional(),
  // Address fields
  addressLine1: Joi.string().max(255).optional(),
  addressLine2: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  status: Joi.string().empty('').optional(),
  state: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
  // Personal fields
  aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
  dateOfBirth: Joi.date().optional(),
});

// Registration request schema
export const createRegistrationRequestSchema = Joi.object({
  email: emailSchema,
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  role: userRoleSchema,
  phone: phoneSchema.required(),
  // Password field for account creation
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  }),
  collegeId: Joi.string().pattern(uuidPattern).optional(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  // New academic structure fields
  courseId: Joi.string().pattern(uuidPattern).optional(),
  academicYearId: Joi.string().pattern(uuidPattern).optional(),
  sectionId: Joi.string().pattern(uuidPattern).optional(),
  class: Joi.string().max(50).optional(),
  rollNumber: Joi.string().max(50).optional(),
  semester: Joi.string().max(20).optional(),
  batchYear: Joi.number().integer().min(2020).max(2040).optional(),
  yearOfStudy: Joi.string().max(20).optional(),
  // Address fields
  addressLine1: Joi.string().max(255).optional(),
  addressLine2: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).optional().messages({
    'string.pattern.base': 'Pincode must be a 6-digit number',
  }),
  // Personal fields
  aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional().messages({
    'string.pattern.base': 'Aadhar number must be a 12-digit number',
  }),
  dateOfBirth: Joi.date().optional(),
  // SPOC fields for college registration
  spocName: Joi.string().max(255).optional(),
  spocEmail: emailSchema.optional(),
  spocPhone: phoneSchema.optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: phoneSchema,
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  collegeId: Joi.string().pattern(uuidPattern).optional(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  // Academic structure fields
  courseId: Joi.string().pattern(uuidPattern).optional(),
  academicYearId: Joi.string().pattern(uuidPattern).optional(),
  sectionId: Joi.string().pattern(uuidPattern).optional(), // Allow section UUIDs
  classInCharge: Joi.string().max(50).optional(),
  class: Joi.string().max(50).optional(),
  semester: Joi.string().max(20).optional().allow(''), // Make semester optional and allow empty string
  rollNumber: Joi.string().max(50).optional(),
  batchYear: Joi.number().integer().min(2020).max(2040).optional(),
  yearOfStudy: Joi.string().max(20).optional(),
  // Address fields
  addressLine1: Joi.string().max(255).optional(),
  addressLine2: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
  // Personal fields
  aadharNumber: Joi.string().pattern(/^[0-9]{12}$/).optional(),
  dateOfBirth: Joi.date().optional(),
  profileImageUrl: Joi.string().uri().optional(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: phoneSchema,
  profileImageUrl: Joi.string().uri().optional(),
});

// College management schemas
export const createCollegeSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'College name must be at least 2 characters long',
    'string.max': 'College name must not exceed 255 characters',
    'any.required': 'College name is required',
  }),
  address: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters long',
    'string.max': 'Address must not exceed 500 characters',
    'any.required': 'Address is required',
  }),
  phone: phoneSchema.required(),
  email: emailSchema,
  website: Joi.string().uri().empty('').optional(),
  established: Joi.string().pattern(/^\d{4}$/).empty('').optional().messages({
    'string.pattern.base': 'Established year must be a 4-digit year',
  }),
  principalId: Joi.string().pattern(uuidPattern).optional(),
  // Principal invitation fields
  principalName: Joi.string().min(2).max(100).empty('').optional().messages({
    'string.min': 'Principal name must be at least 2 characters long',
    'string.max': 'Principal name must not exceed 100 characters',
  }),
  principalEmail: emailSchema.empty('').optional(),
  principalPhone: phoneSchema.empty('').optional(),
});

export const updateCollegeSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  address: Joi.string().min(10).max(500).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  website: Joi.string().uri().empty('').optional(),
  established: Joi.string().pattern(/^\d{4}$/).empty('').optional(),
  principalId: Joi.string().pattern(uuidPattern).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
});

// Public college registration schema
export const createCollegeRegistrationSchema = Joi.object({
  collegeName: Joi.string().min(2).max(255).required().messages({
    'string.min': 'College name must be at least 2 characters long',
    'string.max': 'College name must not exceed 255 characters',
    'any.required': 'College name is required',
  }),
  collegeCode: Joi.string().pattern(/^[A-Za-z0-9]{3,10}$/).required().messages({
    'string.pattern.base': 'College code must be 3-10 alphanumeric characters',
    'any.required': 'College code is required',
  }),
  collegeAddress: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Address must be at least 10 characters long',
    'string.max': 'Address must not exceed 500 characters',
    'any.required': 'Address is required',
  }),
  collegeCity: Joi.string().min(2).max(100).required().messages({
    'string.min': 'City must be at least 2 characters long',
    'string.max': 'City must not exceed 100 characters',
    'any.required': 'City is required',
  }),
  collegeState: Joi.string().min(2).max(100).required().messages({
    'string.min': 'State must be at least 2 characters long',
    'string.max': 'State must not exceed 100 characters',
    'any.required': 'State is required',
  }),
  collegePincode: Joi.string().pattern(/^[0-9]{6}$/).required().messages({
    'string.pattern.base': 'Pincode must be a 6-digit number',
    'any.required': 'Pincode is required',
  }),
  collegeEmail: emailSchema,
  collegePhone: phoneSchema.required(),
  collegeWebsite: Joi.string().uri().empty('').optional(),
  establishedYear: Joi.string().pattern(/^\d{4}$/).custom((value, helpers) => {
    const year = parseInt(value);
    const currentYear = new Date().getFullYear();

    if (year < 1800) {
      return helpers.error('any.invalid', { message: 'Established year must be 1800 or later' });
    }

    if (year > currentYear) {
      return helpers.error('any.invalid', { message: `Established year cannot be greater than ${currentYear}` });
    }

    return value;
  }).required().messages({
    'string.pattern.base': 'Established year must be a 4-digit year',
    'any.required': 'Established year is required',
    'any.invalid': '{#message}',
  }),
  pocName: Joi.string().min(2).max(255).required().messages({
    'string.min': 'POC name must be at least 2 characters long',
    'string.max': 'POC name must not exceed 255 characters',
    'any.required': 'POC name is required',
  }),
  pocEmail: emailSchema,
  pocPhone: phoneSchema.required(),
  pocDesignation: Joi.string().max(100).optional(),
  // Principal information (optional)
  principalName: Joi.string().min(2).max(255).empty('').optional(),
  principalEmail: emailSchema.empty('').optional(),
  principalPhone: phoneSchema.empty('').optional(),
  totalStudents: Joi.number().integer().min(1).max(100000).required().messages({
    'number.min': 'Total students must be at least 1',
    'number.max': 'Total students cannot exceed 100,000',
    'any.required': 'Total students is required',
  }),
  totalFaculty: Joi.number().integer().min(1).max(10000).required().messages({
    'number.min': 'Total faculty must be at least 1',
    'number.max': 'Total faculty cannot exceed 10,000',
    'any.required': 'Total faculty is required',
  }),
  collegeType: Joi.string().valid('government', 'private', 'aided').required().messages({
    'any.only': 'College type must be one of: government, private, aided',
    'any.required': 'College type is required',
  }),
  affiliatedUniversity: Joi.string().max(255).optional(),
});

// Department management schemas
export const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Department name must be at least 2 characters long',
    'string.max': 'Department name must not exceed 255 characters',
    'any.required': 'Department name is required',
  }),
  code: Joi.string().min(2).max(10).uppercase().required().messages({
    'string.min': 'Department code must be at least 2 characters long',
    'string.max': 'Department code must not exceed 10 characters',
    'any.required': 'Department code is required',
  }),
  collegeId: Joi.string().pattern(uuidPattern).required(),
  hodId: Joi.string().pattern(uuidPattern).empty('').optional(),
  totalStudents: Joi.number().integer().min(0).optional(),
  totalStaff: Joi.number().integer().min(0).optional(),
  established: Joi.string().pattern(/^\d{4}$/).optional(),
});

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  code: Joi.string().min(2).max(10).uppercase().optional(),
  hodId: Joi.string().pattern(uuidPattern).optional(),
  totalStudents: Joi.number().integer().min(0).optional(),
  totalStaff: Joi.number().integer().min(0).optional(),
  established: Joi.string().pattern(/^\d{4}$/).optional(),
});

// resource management schemas
export const createresourceschema = Joi.object({
  resourceCode: Joi.string().min(3).max(50).optional().messages({
    'string.min': 'resource code must be at least 3 characters long',
    'string.max': 'resource code must not exceed 50 characters',
  }),
  category: Joi.string().min(2).max(255).required().messages({
    'string.min': 'category must be at least 2 characters long',
    'string.max': 'category must not exceed 255 characters',
    'any.required': 'category is required',
  }),
  startedDate: Joi.date().max('now').optional().messages({
    'date.max': 'started date cannot be in the future',
  }),
  locationDescription: Joi.string().max(500).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  assignedStudentId: Joi.string().pattern(uuidPattern).optional(),
  assignedDate: Joi.date().optional(),
  status: Joi.string().valid('available', 'assigned', 'healthy', 'needs_attention', 'deceased', 'replaced').optional(),
  collegeId: Joi.string().pattern(uuidPattern).required(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  notes: Joi.string().max(1000).optional(),
});

export const updateresourceschema = Joi.object({
  category: Joi.string().min(2).max(255).optional(),
  locationDescription: Joi.string().max(500).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  assignedStudentId: Joi.string().pattern(uuidPattern).optional(),
  assignedDate: Joi.date().optional(),
  status: Joi.string().valid('assigned', 'healthy', 'needs_attention', 'deceased', 'replaced').optional(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  notes: Joi.string().max(1000).optional(),
});

// Pagination and filtering schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(10000).default(1000), // Increased limit for admin users
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const userFilterSchema = paginationSchema.keys({
  role: userRoleSchema.optional(),
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  collegeId: Joi.string().pattern(uuidPattern).optional(),
  departmentId: Joi.string().pattern(uuidPattern).optional(),
  courseId: Joi.string().pattern(uuidPattern).optional(),
  academicYearId: Joi.string().pattern(uuidPattern).optional(),
  section: Joi.string().max(50).optional(),
  assignmentStatus: Joi.string().valid('assigned', 'unassigned').optional(),
  unassigned: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
});

export const resourceFilterSchema = paginationSchema.keys({
  status: Joi.string().valid('available', 'assigned', 'healthy', 'needs_attention', 'deceased', 'replaced').allow('').optional(),
  collegeId: Joi.string().pattern(uuidPattern).allow('').optional(),
  departmentId: Joi.string().pattern(uuidPattern).allow('').optional(),
  assignedStudentId: Joi.string().pattern(uuidPattern).allow('').optional(),
  category: Joi.string().max(100).allow('').optional(),
  location: Joi.string().max(255).allow('').optional(),
  search: Joi.string().max(255).allow('').optional(),
}).keys({
  // Override sortBy to accept both camelCase and snake_case
  sortBy: Joi.string().valid('id', 'resource_code', 'resourceCode', 'category', 'created_at', 'createdAt', 'updated_at', 'updatedAt', 'started_date', 'startedDate', 'status').optional(),
});

// ==================== FORGOT PASSWORD SCHEMAS ====================

// Forgot password request schema
export const forgotPasswordSchema = Joi.object({
  email: emailSchema,
});

// Verify reset OTP schema
export const verifyResetOTPSchema = Joi.object({
  email: emailSchema,
  otp: otpSchema,
});

// Reset password with OTP schema
export const resetPasswordWithOTPSchema = Joi.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required',
    }),
});
