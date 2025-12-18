/**
 * Forgot Password Service
 * 
 * Handles forgot password functionality including OTP generation,
 * verification, and password reset with security measures.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { userRepository } from '../../user/repositories/user.repository';
import { otpService } from '../../otp/services/otp.service';
import { emailService } from '../../../utils/email.service';
import { hashPassword } from '../../../utils/auth.utils';
import { appLogger } from '../../../utils/logger';
import { pool } from '../../../config/database';

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RateLimitInfo {
  email: string;
  requestCount: number;
  windowStart: Date;
}

export class ForgotPasswordService {
  private readonly MAX_REQUESTS_PER_HOUR = 3;
  private readonly RATE_LIMIT_WINDOW_HOURS = 1;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_HOURS = 24;

  /**
   * Initiate forgot password process
   */
  async initiateForgotPassword(request: ForgotPasswordRequest): Promise<{
    success: boolean;
    message: string;
    expiresAt?: string;
  }> {
    try {
      const { email } = request;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      const user = await userRepository.findByEmail(normalizedEmail);
      if (!user) {
        // Don't reveal if email exists or not for security
        appLogger.info('Password reset requested for non-existent email', {
          email: this.maskEmail(normalizedEmail),
        });
        return {
          success: true,
          message: 'If an account with this email exists, you will receive a password reset code.',
        };
      }

      appLogger.info('Password reset requested for existing user', {
        email: this.maskEmail(normalizedEmail),
        userId: user.id,
      });

      // Check if user is active
      if (user.status !== 'active') {
        return {
          success: false,
          message: 'Account is not active. Please contact administrator.',
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(normalizedEmail);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: `Too many password reset requests. Please try again in ${rateLimitCheck.retryAfterMinutes} minutes.`,
        };
      }

      // Check if user has too many failed attempts (if columns exist)
      const failedAttempts = (user as any).failed_password_reset_attempts || 0;
      if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        const lastFailedAttempt = (user as any).last_failed_password_reset;
        if (lastFailedAttempt) {
          const lockoutEnd = new Date(lastFailedAttempt.getTime() + (this.LOCKOUT_DURATION_HOURS * 60 * 60 * 1000));
          if (new Date() < lockoutEnd) {
            return {
              success: false,
              message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
            };
          }
        }
      }

      // Generate and send OTP
      const otpResult = await otpService.generateAndSendOTP({
        identifier: normalizedEmail,
        type: 'email',
        purpose: 'password_reset',
        userId: user.id,
      });
      console.log(otpResult);
      if (!otpResult.success) {
        appLogger.error('Failed to generate OTP for password reset', {
          email: this.maskEmail(normalizedEmail),
          message: otpResult.message,
        });
        return {
          success: false,
          message: 'Failed to send password reset code. Please try again.',
        };
      }

      // Update rate limiting
      await this.updateRateLimit(normalizedEmail);

      // Log password reset attempt
      await this.logPasswordResetAttempt({
        userId: user.id,
        email: normalizedEmail,
        resetMethod: 'otp',
        success: true,
      });

      appLogger.info('Password reset OTP sent successfully', {
        email: this.maskEmail(normalizedEmail),
        userId: user.id,
      });

      return {
        success: true,
        message: 'Password reset code sent to your email address.',
        expiresAt: otpResult.expiresAt?.toISOString(),
      };
    } catch (error) {
      appLogger.error('Error in forgot password process', {
        error,
        email: this.maskEmail(request.email),
      });
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  /**
   * Verify OTP for password reset
   */
  async verifyResetOTP(request: VerifyOTPRequest): Promise<{
    success: boolean;
    message: string;
    userId?: string;
  }> {
    try {
      const { email, otp } = request;
      const normalizedEmail = email.toLowerCase().trim();

      // Verify OTP
      const verificationResult = await otpService.verifyOTP({
        identifier: normalizedEmail,
        otp,
        purpose: 'password_reset',
      });

      if (!verificationResult.success) {
        // Log failed verification
        const user = await userRepository.findByEmail(normalizedEmail);
        if (user) {
          await this.incrementFailedAttempts(user.id);
          await this.logPasswordResetAttempt({
            userId: user.id,
            email: normalizedEmail,
            resetMethod: 'otp',
            success: false,
            failureReason: 'Invalid OTP',
          });
        }

        return {
          success: false,
          message: verificationResult.message,
        };
      }

      appLogger.info('Password reset OTP verified successfully', {
        email: this.maskEmail(normalizedEmail),
        userId: verificationResult.userId,
      });

      return {
        success: true,
        message: 'OTP verified successfully. You can now reset your password.',
        userId: verificationResult.userId,
      };
    } catch (error) {
      appLogger.error('Error verifying reset OTP', {
        error,
        email: this.maskEmail(request.email),
      });
      return {
        success: false,
        message: 'An error occurred during verification. Please try again.',
      };
    }
  }

  /**
   * Reset password after OTP verification
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { email, otp, newPassword, confirmPassword } = request;
      // Note: otp is kept for API compatibility but not used for re-verification
      const normalizedEmail = email.toLowerCase().trim();

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match.',
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Check if OTP was recently verified (don't verify again as it's already been used)
      const recentVerification = await otpService.wasRecentlyVerified(normalizedEmail, 'password_reset');

      if (!recentVerification.success) {
        appLogger.warn('Password reset attempted without recent OTP verification', {
          email: this.maskEmail(normalizedEmail),
        });
        return {
          success: false,
          message: 'OTP verification expired. Please request a new password reset.',
        };
      }

      appLogger.info('Recent OTP verification found for password reset', {
        email: this.maskEmail(normalizedEmail),
        userId: recentVerification.userId,
      });

      // Get user using the userId from recent verification
      const user = recentVerification.userId ?
        await userRepository.findById(recentVerification.userId) :
        await userRepository.findByEmail(normalizedEmail);

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and reset failed attempts
      await userRepository.updatePassword(user.id, hashedPassword);
      await this.resetFailedAttempts(user.id);

      // Log successful password reset
      await this.logPasswordResetAttempt({
        userId: user.id,
        email: normalizedEmail,
        resetMethod: 'otp',
        success: true,
      });

      appLogger.info('Password reset completed successfully', {
        email: this.maskEmail(normalizedEmail),
        userId: user.id,
      });

      return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
      };
    } catch (error) {
      appLogger.error('Error resetting password', {
        error,
        email: this.maskEmail(request.email),
      });
      return {
        success: false,
        message: 'An error occurred while resetting password. Please try again.',
      };
    }
  }

  /**
   * Check rate limiting for password reset requests
   */
  private async checkRateLimit(email: string): Promise<{
    allowed: boolean;
    retryAfterMinutes?: number;
  }> {
    try {
      const query = `
        SELECT request_count, window_start
        FROM password_reset_rate_limits
        WHERE email = $1 AND window_start > $2
      `;

      const windowStart = new Date(Date.now() - (this.RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000));
      const result = await pool.query(query, [email, windowStart]);

      if (result.rows.length === 0) {
        return { allowed: true };
      }

      const { request_count } = result.rows[0];
      if (request_count >= this.MAX_REQUESTS_PER_HOUR) {
        const retryAfterMinutes = Math.ceil((this.RATE_LIMIT_WINDOW_HOURS * 60) -
          ((Date.now() - new Date(result.rows[0].window_start).getTime()) / (1000 * 60)));
        return {
          allowed: false,
          retryAfterMinutes: Math.max(1, retryAfterMinutes)
        };
      }

      return { allowed: true };
    } catch (error) {
      // If rate limiting table doesn't exist, allow the request but log the error
      appLogger.warn('Rate limiting table not found, allowing request', {
        email: this.maskEmail(email),
        error: error.message,
      });
      return { allowed: true };
    }
  }

  /**
   * Update rate limiting counter
   */
  private async updateRateLimit(email: string): Promise<void> {
    try {
      const query = `
        INSERT INTO password_reset_rate_limits (email, request_count, window_start)
        VALUES ($1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (email)
        DO UPDATE SET
          request_count = CASE
            WHEN password_reset_rate_limits.window_start < CURRENT_TIMESTAMP - INTERVAL '1 hour'
            THEN 1
            ELSE password_reset_rate_limits.request_count + 1
          END,
          window_start = CASE
            WHEN password_reset_rate_limits.window_start < CURRENT_TIMESTAMP - INTERVAL '1 hour'
            THEN CURRENT_TIMESTAMP
            ELSE password_reset_rate_limits.window_start
          END,
          updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [email]);
    } catch (error) {
      // If rate limiting table doesn't exist, just log and continue
      appLogger.warn('Could not update rate limit, table may not exist', {
        email: this.maskEmail(email),
        error: error.message,
      });
    }
  }

  /**
   * Log password reset attempt
   */
  private async logPasswordResetAttempt(log: {
    userId: string;
    email: string;
    resetMethod: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO password_reset_logs
        (user_id, email, reset_method, success, failure_reason, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await pool.query(query, [
        log.userId,
        log.email,
        log.resetMethod,
        log.success,
        log.failureReason || null,
        log.ipAddress || null,
        log.userAgent || null,
      ]);
    } catch (error) {
      // If logging table doesn't exist, just log to application logger
      appLogger.warn('Could not log password reset attempt, table may not exist', {
        email: this.maskEmail(log.email),
        success: log.success,
        error: error.message,
      });
    }
  }

  /**
   * Increment failed password reset attempts
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET
          failed_password_reset_attempts = COALESCE(failed_password_reset_attempts, 0) + 1,
          last_failed_password_reset = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await pool.query(query, [userId]);
    } catch (error) {
      // If columns don't exist, just log the error
      appLogger.warn('Could not increment failed attempts, columns may not exist', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Reset failed password reset attempts
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET
          failed_password_reset_attempts = 0,
          last_failed_password_reset = NULL,
          last_password_reset = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await pool.query(query, [userId]);
    } catch (error) {
      // If columns don't exist, just log the error
      appLogger.warn('Could not reset failed attempts, columns may not exist', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): {
    isValid: boolean;
    message: string;
  } {
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long.',
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter.',
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter.',
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number.',
      };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character (@$!%*?&).',
      };
    }

    return {
      isValid: true,
      message: 'Password is valid.',
    };
  }

  /**
   * Mask email for logging
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? 
      local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : 
      local;
    return `${maskedLocal}@${domain}`;
  }
}

// Export singleton instance
export const forgotPasswordService = new ForgotPasswordService();
