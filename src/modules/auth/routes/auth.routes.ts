import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as forgotPasswordController from '../controllers/forgot-password.controller';
import * as profileUploadController from '../controllers/profile-upload.controller';
import { authenticate, optionalAuthenticate } from '../../../middleware/auth.middleware';
import { validateBody } from '../../../middleware/validation.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordWithOTPSchema,
} from '../../../utils/validation.schemas';
import profileRoutes from './profile.routes';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', optionalAuthenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', authenticate, validateBody(updateProfileSchema), authController.updateProfile);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Initiate forgot password process
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset code sent successfully
 *       400:
 *         description: Invalid request or rate limit exceeded
 */
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/verify-reset-otp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP or expired
 */
router.post('/verify-reset-otp', validateBody(verifyResetOTPSchema), forgotPasswordController.verifyResetOTP);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password after OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid request or passwords don't match
 */
router.post('/reset-password', validateBody(resetPasswordWithOTPSchema), forgotPasswordController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/check:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/check', authenticate, authController.checkAuth);

/**
 * @swagger
 * /api/v1/auth/upload-profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload-profile-image', authenticate, profileUploadController.profileUpload.single('profileImage'), profileUploadController.uploadProfileImage);

/**
 * @swagger
 * /api/v1/auth/delete-profile-image:
 *   delete:
 *     summary: Delete profile image
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/delete-profile-image', authenticate, profileUploadController.deleteProfileImage);

/**
 * @swagger
 * /api/v1/auth/profile-image/{filename}:
 *   get:
 *     summary: Get profile image
 *     tags: [Authentication]
 */
router.get('/profile-image/:filename', profileUploadController.getProfileImage);

// Profile routes
router.use('/', profileRoutes);

export default router;
