/**
 * OTP Controller
 * 
 * Handles OTP generation, verification, and management endpoints
 * following MNC enterprise standards for secure authentication.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { otpService, OTPRequest, OTPVerification } from '../services/otp.service';
import { appLogger } from '../../../utils/logger';
import { ValidationError } from '../../../middleware/errorHandler';

/**
 * Generate and send OTP
 */
export const generateOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, type, purpose, userId } = req.body;

    // Validate required fields
    if (!identifier || !type || !purpose) {
      throw new ValidationError('Identifier, type, and purpose are required', {
        identifier: !identifier ? ['Identifier is required'] : [],
        type: !type ? ['Type is required'] : [],
        purpose: !purpose ? ['Purpose is required'] : [],
      });
    }

    // Validate type
    if (!['email', 'sms'].includes(type)) {
      throw new ValidationError('Invalid type', {
        type: ['Type must be either "email" or "sms"'],
      });
    }

    // Validate purpose
    const validPurposes = ['registration', 'login', 'password_reset', 'phone_verification', 'email_verification'];
    if (!validPurposes.includes(purpose)) {
      throw new ValidationError('Invalid purpose', {
        purpose: [`Purpose must be one of: ${validPurposes.join(', ')}`],
      });
    }

    // Validate identifier format
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        throw new ValidationError('Invalid email format', {
          identifier: ['Please provide a valid email address'],
        });
      }
    } else if (type === 'sms') {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(identifier.replace(/\s+/g, ''))) {
        throw new ValidationError('Invalid phone format', {
          identifier: ['Please provide a valid phone number'],
        });
      }
    }

    const otpRequest: OTPRequest = {
      identifier: identifier.toLowerCase().trim(),
      type,
      purpose,
      userId,
    };

    const result = await otpService.generateAndSendOTP(otpRequest);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresAt: result.expiresAt,
          identifier: otpRequest.identifier,
          type: otpRequest.type,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    appLogger.error('Generate OTP error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      body: req.body,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
        errors: error.fields,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate OTP',
      });
    }
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, otp, purpose } = req.body;

    // Validate required fields
    if (!identifier || !otp || !purpose) {
      throw new ValidationError('Identifier, OTP, and purpose are required', {
        identifier: !identifier ? ['Identifier is required'] : [],
        otp: !otp ? ['OTP is required'] : [],
        purpose: !purpose ? ['Purpose is required'] : [],
      });
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      throw new ValidationError('Invalid OTP format', {
        otp: ['OTP must be 6 digits'],
      });
    }

    const verification: OTPVerification = {
      identifier: identifier.toLowerCase().trim(),
      otp: otp.trim(),
      purpose,
    };

    const result = await otpService.verifyOTP(verification);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          verified: true,
          userId: result.userId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: {
          verified: false,
        },
      });
    }
  } catch (error) {
    appLogger.error('Verify OTP error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      body: { ...req.body, otp: '***masked***' }, // Mask OTP in logs
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
        errors: error.fields,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
      });
    }
  }
};

/**
 * Resend OTP (same as generate but with different messaging)
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, type, purpose, userId } = req.body;

    // Validate required fields
    if (!identifier || !type || !purpose) {
      throw new ValidationError('Identifier, type, and purpose are required', {
        identifier: !identifier ? ['Identifier is required'] : [],
        type: !type ? ['Type is required'] : [],
        purpose: !purpose ? ['Purpose is required'] : [],
      });
    }

    const otpRequest: OTPRequest = {
      identifier: identifier.toLowerCase().trim(),
      type,
      purpose,
      userId,
    };

    const result = await otpService.generateAndSendOTP(otpRequest);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `OTP resent successfully to ${otpRequest.identifier}`,
        data: {
          expiresAt: result.expiresAt,
          identifier: otpRequest.identifier,
          type: otpRequest.type,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    appLogger.error('Resend OTP error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      body: req.body,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
        errors: error.fields,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP',
      });
    }
  }
};

/**
 * Check OTP status (for debugging/admin purposes)
 */
export const checkOTPStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, purpose } = req.query;

    if (!identifier || !purpose) {
      res.status(400).json({
        success: false,
        message: 'Identifier and purpose are required',
      });
      return;
    }

    // This endpoint should be restricted to admin users only
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    // For security, we don't expose actual OTP values
    // This is mainly for debugging rate limits and expiry
    res.status(200).json({
      success: true,
      message: 'OTP status check completed',
      data: {
        identifier: identifier as string,
        purpose: purpose as string,
        note: 'OTP details are not exposed for security reasons',
      },
    });
  } catch (error) {
    appLogger.error('Check OTP status error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to check OTP status',
    });
  }
};

/**
 * Cleanup expired OTPs (admin endpoint)
 */
export const cleanupExpiredOTPs = async (req: Request, res: Response): Promise<void> => {
  try {
    // This endpoint should be restricted to admin users only
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    const deletedCount = await otpService.cleanupExpiredOTPs();

    res.status(200).json({
      success: true,
      message: 'Expired OTPs cleaned up successfully',
      data: {
        deletedCount,
      },
    });
  } catch (error) {
    appLogger.error('Cleanup expired OTPs error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired OTPs',
    });
  }
};

export const otpController = {
  generateOTP,
  verifyOTP,
  resendOTP,
  checkOTPStatus,
  cleanupExpiredOTPs,
};
