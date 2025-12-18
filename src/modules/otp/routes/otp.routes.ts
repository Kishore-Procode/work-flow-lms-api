/**
 * OTP Routes
 * 
 * Defines routes for OTP generation, verification, and management
 * following MNC enterprise standards for secure authentication.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { otpController } from '../controllers/otp.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { validateBody } from '../../../middleware/validation';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas
 */
const generateOTPSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Identifier (email or phone) is required',
    'string.empty': 'Identifier cannot be empty',
  }),
  type: Joi.string().valid('email', 'sms').required().messages({
    'any.required': 'Type is required',
    'any.only': 'Type must be either "email" or "sms"',
  }),
  purpose: Joi.string().valid(
    'registration', 
    'login', 
    'password_reset', 
    'phone_verification', 
    'email_verification'
  ).required().messages({
    'any.required': 'Purpose is required',
    'any.only': 'Purpose must be one of: registration, login, password_reset, phone_verification, email_verification',
  }),
  userId: Joi.string().uuid().optional().messages({
    'string.guid': 'User ID must be a valid UUID',
  }),
});

const verifyOTPSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Identifier (email or phone) is required',
    'string.empty': 'Identifier cannot be empty',
  }),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    'any.required': 'OTP is required',
    'string.pattern.base': 'OTP must be 6 digits',
  }),
  purpose: Joi.string().valid(
    'registration', 
    'login', 
    'password_reset', 
    'phone_verification', 
    'email_verification'
  ).required().messages({
    'any.required': 'Purpose is required',
    'any.only': 'Purpose must be one of: registration, login, password_reset, phone_verification, email_verification',
  }),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     OTPRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - type
 *         - purpose
 *       properties:
 *         identifier:
 *           type: string
 *           description: Email address or phone number
 *           example: "user@example.com"
 *         type:
 *           type: string
 *           enum: [email, sms]
 *           description: Type of OTP delivery
 *           example: "email"
 *         purpose:
 *           type: string
 *           enum: [registration, login, password_reset, phone_verification, email_verification]
 *           description: Purpose of OTP verification
 *           example: "registration"
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Optional user ID for context
 *     
 *     OTPVerification:
 *       type: object
 *       required:
 *         - identifier
 *         - otp
 *         - purpose
 *       properties:
 *         identifier:
 *           type: string
 *           description: Email address or phone number
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           pattern: ^\d{6}$
 *           description: 6-digit OTP code
 *           example: "123456"
 *         purpose:
 *           type: string
 *           enum: [registration, login, password_reset, phone_verification, email_verification]
 *           description: Purpose of OTP verification
 *           example: "registration"
 */

/**
 * @swagger
 * /api/v1/otp/generate:
 *   post:
 *     summary: Generate and send OTP
 *     description: Generate a new OTP and send it via email or SMS
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP generated and sent successfully
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
 *                   example: "OTP sent successfully to u***@example.com"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     identifier:
 *                       type: string
 *                     type:
 *                       type: string
 *       400:
 *         description: Invalid request or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/generate', validateBody(generateOTPSchema), otpController.generateOTP);

/**
 * @swagger
 * /api/v1/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     description: Verify the provided OTP code
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerification'
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                   example: "OTP verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     userId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Invalid OTP or verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify', validateBody(verifyOTPSchema), otpController.verifyOTP);

/**
 * @swagger
 * /api/v1/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     description: Resend OTP to the same identifier
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
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
 *                   example: "OTP resent successfully to u***@example.com"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     identifier:
 *                       type: string
 *                     type:
 *                       type: string
 *       400:
 *         description: Invalid request or rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend', validateBody(generateOTPSchema), otpController.resendOTP);

// Protected routes (require authentication)
router.use(authenticate);

/**
 * @swagger
 * /api/v1/otp/status:
 *   get:
 *     summary: Check OTP status (Admin only)
 *     description: Check the status of OTP for debugging purposes
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Email or phone number
 *       - in: query
 *         name: purpose
 *         required: true
 *         schema:
 *           type: string
 *           enum: [registration, login, password_reset, phone_verification, email_verification]
 *         description: Purpose of OTP
 *     responses:
 *       200:
 *         description: OTP status retrieved successfully
 *       403:
 *         description: Insufficient permissions
 *       400:
 *         description: Invalid request parameters
 */
router.get('/status', otpController.checkOTPStatus);

/**
 * @swagger
 * /api/v1/otp/cleanup:
 *   post:
 *     summary: Cleanup expired OTPs (Admin only)
 *     description: Remove expired and verified OTPs from the database
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired OTPs cleaned up successfully
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
 *                   example: "Expired OTPs cleaned up successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *                       example: 25
 *       403:
 *         description: Insufficient permissions
 */
router.post('/cleanup', otpController.cleanupExpiredOTPs);

export default router;
