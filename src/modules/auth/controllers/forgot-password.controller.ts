/**
 * Forgot Password Controller
 * 
 * Handles HTTP requests for forgot password functionality including
 * OTP generation, verification, and password reset.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { forgotPasswordService } from '../services/forgot-password.service';
import { appLogger } from '../../../utils/logger';

/**
 * Initiate forgot password process
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
      return;
    }

    // Get client IP and user agent for logging
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    appLogger.info('Forgot password request initiated', {
      email: forgotPasswordService['maskEmail'](email),
      ip: clientIP,
      userAgent,
    });

    const result = await forgotPasswordService.initiateForgotPassword({ email });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresAt: result.expiresAt,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    appLogger.error('Error in forgot password controller', {
      error,
      email: req.body.email ? forgotPasswordService['maskEmail'](req.body.email) : 'unknown',
    });

    res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};

/**
 * Verify OTP for password reset
 */
export const verifyResetOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
      return;
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits',
      });
      return;
    }

    const result = await forgotPasswordService.verifyResetOTP({ email, otp });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    appLogger.error('Error in verify reset OTP controller', {
      error,
      email: req.body.email ? forgotPasswordService['maskEmail'](req.body.email) : 'unknown',
    });

    res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};

/**
 * Reset password after OTP verification
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !otp || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
      return;
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits',
      });
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
      return;
    }

    // Get client IP and user agent for logging
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    appLogger.info('Password reset attempt', {
      email: forgotPasswordService['maskEmail'](email),
      ip: clientIP,
      userAgent,
    });

    const result = await forgotPasswordService.resetPassword({
      email,
      otp,
      newPassword,
      confirmPassword,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    appLogger.error('Error in reset password controller', {
      error,
      email: req.body.email ? forgotPasswordService['maskEmail'](req.body.email) : 'unknown',
    });

    res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};

/**
 * Check password reset rate limit status
 */
export const checkResetRateLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    // This is a simple check - in a real implementation you might want to expose rate limit info
    res.status(200).json({
      success: true,
      message: 'Rate limit check completed',
      data: {
        canRequest: true, // This would be calculated based on actual rate limiting
      },
    });
  } catch (error) {
    appLogger.error('Error checking reset rate limit', {
      error,
      email: req.query.email ? forgotPasswordService['maskEmail'](req.query.email as string) : 'unknown',
    });

    res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
    });
  }
};
