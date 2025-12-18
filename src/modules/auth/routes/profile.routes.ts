/**
 * Profile Routes
 * 
 * Defines routes for user profile management including
 * fetching, updating, and password changes.
 * 
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profile.controller';
import { enhancedAuthenticate } from '../../../middleware/enhanced-auth.middleware';
import { validateBody } from '../../../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
    }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  class: Joi.string()
    .max(50)
    .optional()
    .messages({
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

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Current password is required',
      'string.max': 'Current password must not exceed 128 characters',
      'any.required': 'Current password is required',
    }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required',
    }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         role:
 *           type: string
 *           enum: [super_admin, admin, principal, hod, staff, student]
 *           description: User's role
 *         status:
 *           type: string
 *           enum: [active, inactive, pending, suspended]
 *           description: User's account status
 *         phone:
 *           type: string
 *           description: User's phone number
 *         collegeId:
 *           type: string
 *           format: uuid
 *           description: Associated college ID
 *         collegeName:
 *           type: string
 *           description: Associated college name
 *         departmentId:
 *           type: string
 *           format: uuid
 *           description: Associated department ID
 *         departmentName:
 *           type: string
 *           description: Associated department name
 *         hodName:
 *           type: string
 *           description: Head of Department name
 *         class:
 *           type: string
 *           description: Student's class/year
 *         semester:
 *           type: string
 *           description: Student's semester
 *         rollNumber:
 *           type: string
 *           description: Student's roll number
 *         profileImageUrl:
 *           type: string
 *           format: uri
 *           description: Profile image URL
 *         emailVerified:
 *           type: boolean
 *           description: Whether email is verified
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the complete profile of the currently authenticated user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', enhancedAuthenticate, getProfile);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update current user profile
 *     description: Update the profile information of the currently authenticated user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: User's full name
 *               phone:
 *                 type: string
 *                 pattern: '^[\+]?[1-9][\d]{0,15}$'
 *                 description: User's phone number
 *               class:
 *                 type: string
 *                 maxLength: 50
 *                 description: Student's class/year
 *               semester:
 *                 type: string
 *                 pattern: '^[1-8]$'
 *                 description: Student's semester (1-8)
 *               profileImageUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: Profile image URL
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/profile', enhancedAuthenticate, validateBody(updateProfileSchema), updateProfile);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Change the password of the currently authenticated user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'
 *                 description: New password (must contain uppercase, lowercase, number, and special character)
 *               confirmPassword:
 *                 type: string
 *                 description: Confirmation of new password (must match newPassword)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Invalid input data or current password incorrect
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/change-password', enhancedAuthenticate, validateBody(changePasswordSchema), changePassword);

export default router;
