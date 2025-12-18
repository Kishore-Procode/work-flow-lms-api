/**
 * OTP (One-Time Password) Service
 * 
 * Comprehensive OTP service for user verification following
 * MNC enterprise standards for secure authentication workflows.
 * 
 * Features:
 * - SMS and Email OTP delivery
 * - Configurable OTP length and expiry
 * - Rate limiting and attempt tracking
 * - Secure OTP generation and validation
 * - Audit logging for compliance
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { appLogger } from '../../../utils/logger';
import { emailService } from '../../../utils/email.service';
import { userRepository } from '../../user/repositories/user.repository';

export interface OTPRequest {
  identifier: string; // email or phone
  type: 'email' | 'sms';
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
  userId?: string;
}

export interface OTPVerification {
  identifier: string;
  otp: string;
  purpose: string;
}

export interface OTPRecord {
  id: string;
  identifier: string;
  otp_hash: string;
  type: 'email' | 'sms';
  purpose: string;
  user_id?: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * OTP Service Class
 */
export class OTPService {
  private db: Pool;
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1; // Minimum time between OTP requests

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Generate and send OTP
   */
  async generateAndSendOTP(request: OTPRequest): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    try {
      const { identifier, type, purpose, userId } = request;

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(identifier, purpose);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: `Please wait ${rateLimitCheck.waitTime} seconds before requesting another OTP`,
        };
      }

      // Invalidate any existing OTPs for this identifier and purpose
      await this.invalidateExistingOTPs(identifier, purpose);

      // Generate OTP
      const otp = this.generateOTP();
      const otpHash = this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP in database
      const otpRecord = await this.storeOTP({
        identifier,
        otpHash,
        type,
        purpose,
        userId,
        expiresAt,
      });

      // Send OTP based on type
      let sendResult: { success: boolean; message: string };
      if (type === 'email') {
        sendResult = await this.sendEmailOTP(identifier, otp, purpose);
      } else {
        sendResult = await this.sendSMSOTP(identifier, otp, purpose);
      }

      if (!sendResult.success) {
        // If sending fails, mark OTP as invalid
        await this.invalidateOTP(otpRecord.id);
        return sendResult;
      }

      // Log OTP generation
      appLogger.info('OTP generated and sent', {
        identifier: this.maskIdentifier(identifier),
        type,
        purpose,
        userId,
        expiresAt,
      });

      return {
        success: true,
        message: `OTP sent successfully to ${this.maskIdentifier(identifier)}`,
        expiresAt,
      };
    } catch (error) {
      appLogger.error('Failed to generate and send OTP', {
        error,
        identifier: this.maskIdentifier(request.identifier),
        type: request.type,
        purpose: request.purpose,
      });

      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(verification: OTPVerification): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const { identifier, otp, purpose } = verification;

      // Get OTP record
      const otpRecord = await this.getValidOTPRecord(identifier, purpose);
      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired OTP',
        };
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= otpRecord.max_attempts) {
        await this.invalidateOTP(otpRecord.id);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        };
      }

      // Increment attempt count
      await this.incrementAttemptCount(otpRecord.id);

      // Verify OTP
      const isValid = this.verifyOTPHash(otp, otpRecord.otp_hash);
      if (!isValid) {
        const remainingAttempts = otpRecord.max_attempts - (otpRecord.attempts + 1);
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
        };
      }

      // Mark OTP as verified and invalidate
      await this.markOTPAsVerified(otpRecord.id);

      // Log successful verification
      appLogger.info('OTP verified successfully', {
        identifier: this.maskIdentifier(identifier),
        purpose,
        userId: otpRecord.user_id,
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        userId: otpRecord.user_id,
      };
    } catch (error) {
      appLogger.error('Failed to verify OTP', {
        error,
        identifier: this.maskIdentifier(verification.identifier),
        purpose: verification.purpose,
      });

      return {
        success: false,
        message: 'OTP verification failed. Please try again.',
      };
    }
  }

  /**
   * Generate random OTP
   */
  private generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Verify OTP against hash
   */
  private verifyOTPHash(otp: string, hash: string): boolean {
    const otpHash = this.hashOTP(otp);
    return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hash));
  }

  /**
   * Store OTP in database
   */
  private async storeOTP(data: {
    identifier: string;
    otpHash: string;
    type: 'email' | 'sms';
    purpose: string;
    userId?: string;
    expiresAt: Date;
  }): Promise<OTPRecord> {
    const query = `
      INSERT INTO otp_verifications (
        identifier, otp_hash, type, purpose, user_id, 
        attempts, max_attempts, expires_at, verified
      )
      VALUES ($1, $2, $3, $4, $5, 0, $6, $7, false)
      RETURNING *
    `;

    const values = [
      data.identifier,
      data.otpHash,
      data.type,
      data.purpose,
      data.userId || null,
      this.MAX_ATTEMPTS,
      data.expiresAt,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get valid OTP record
   */
  private async getValidOTPRecord(identifier: string, purpose: string): Promise<OTPRecord | null> {
    const query = `
      SELECT * FROM otp_verifications
      WHERE identifier = $1 
        AND purpose = $2 
        AND verified = false 
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [identifier, purpose]);
    return result.rows[0] || null;
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(identifier: string, purpose: string): Promise<{ allowed: boolean; waitTime?: number }> {
    const query = `
      SELECT created_at FROM otp_verifications
      WHERE identifier = $1 AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [identifier, purpose]);
    
    if (result.rows.length === 0) {
      return { allowed: true };
    }

    const lastRequest = new Date(result.rows[0].created_at);
    const timeDiff = Date.now() - lastRequest.getTime();
    const waitTimeMs = this.RATE_LIMIT_MINUTES * 60 * 1000;

    if (timeDiff < waitTimeMs) {
      const waitTime = Math.ceil((waitTimeMs - timeDiff) / 1000);
      return { allowed: false, waitTime };
    }

    return { allowed: true };
  }

  /**
   * Invalidate existing OTPs
   */
  private async invalidateExistingOTPs(identifier: string, purpose: string): Promise<void> {
    const query = `
      UPDATE otp_verifications 
      SET verified = true, updated_at = NOW()
      WHERE identifier = $1 AND purpose = $2 AND verified = false
    `;

    await this.db.query(query, [identifier, purpose]);
  }

  /**
   * Invalidate specific OTP
   */
  private async invalidateOTP(otpId: string): Promise<void> {
    const query = `
      UPDATE otp_verifications 
      SET verified = true, updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [otpId]);
  }

  /**
   * Increment attempt count
   */
  private async incrementAttemptCount(otpId: string): Promise<void> {
    const query = `
      UPDATE otp_verifications 
      SET attempts = attempts + 1, updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [otpId]);
  }

  /**
   * Mark OTP as verified
   */
  private async markOTPAsVerified(otpId: string): Promise<void> {
    const query = `
      UPDATE otp_verifications 
      SET verified = true, updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [otpId]);
  }

  /**
   * Send Email OTP
   */
  private async sendEmailOTP(email: string, otp: string, purpose: string): Promise<{ success: boolean; message: string }> {
    try {
      let emailOptions;

      if (purpose === 'password_reset') {
        // Use the professional password reset email template
        const user = await this.getUserByEmail(email);
        const userName = user ? user.name : 'User';

        emailOptions = emailService.generatePasswordResetOTPEmail(userName, email, otp);
      } else {
        // Use the generic OTP email template for other purposes
        emailOptions = {
          to: email,
          subject: `Your OTP for ${purpose.replace('_', ' ')} - Student-ACT LMS`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">Student-ACT LMS</h2>
              <p>Your OTP for ${purpose.replace('_', ' ')} is:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #16a34a; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p><strong>This OTP will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</strong></p>
              <p>If you didn't request this OTP, please ignore this email.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                This is an automated message from Student-ACT LMS Initiative.
              </p>
            </div>
          `,
        };
      }

      await emailService.sendEmail(emailOptions);
      return { success: true, message: 'Email OTP sent successfully' };
    } catch (error) {
      appLogger.error('Failed to send email OTP', { error, email: this.maskIdentifier(email) });
      return { success: false, message: 'Failed to send email OTP' };
    }
  }

  /**
   * Send SMS OTP (placeholder for SMS service integration)
   */
  private async sendSMSOTP(phone: string, otp: string, purpose: string): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Integrate with SMS service provider (Twilio, AWS SNS, etc.)
      // For now, log the OTP (remove in production)
      appLogger.info('SMS OTP (Development Mode)', {
        phone: this.maskIdentifier(phone),
        otp,
        purpose,
      });

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { success: true, message: 'SMS OTP sent successfully' };
    } catch (error) {
      appLogger.error('Failed to send SMS OTP', { error, phone: this.maskIdentifier(phone) });
      return { success: false, message: 'Failed to send SMS OTP' };
    }
  }

  /**
   * Check if OTP was recently verified (within last 10 minutes)
   */
  async wasRecentlyVerified(identifier: string, purpose: string): Promise<{ success: boolean; userId?: string }> {
    try {
      const query = `
        SELECT user_id, updated_at
        FROM otp_verifications
        WHERE identifier = $1 AND purpose = $2 AND verified = true
        AND updated_at > CURRENT_TIMESTAMP - INTERVAL '10 minutes'
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [identifier, purpose]);

      if (result.rows.length > 0) {
        return {
          success: true,
          userId: result.rows[0].user_id,
        };
      }

      return { success: false };
    } catch (error) {
      appLogger.error('Failed to check recent verification', {
        error,
        identifier: this.maskIdentifier(identifier),
        purpose,
      });
      return { success: false };
    }
  }

  /**
   * Get user by email for personalized emails
   */
  private async getUserByEmail(email: string): Promise<{ name: string } | null> {
    try {
      const user = await userRepository.findByEmail(email);
      return user ? { name: user.name } : null;
    } catch (error) {
      appLogger.error('Failed to get user by email', { error, email: this.maskIdentifier(email) });
      return null;
    }
  }

  /**
   * Mask identifier for logging
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email masking
      const [local, domain] = identifier.split('@');
      const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local;
      return `${maskedLocal}@${domain}`;
    } else {
      // Phone masking
      return identifier.length > 4 ?
        identifier.slice(0, 2) + '*'.repeat(identifier.length - 4) + identifier.slice(-2) :
        identifier;
    }
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const query = `
      DELETE FROM otp_verifications
      WHERE expires_at < NOW() OR verified = true
    `;

    const result = await this.db.query(query);
    const deletedCount = result.rowCount || 0;

    appLogger.info('Cleaned up expired OTPs', { deletedCount });
    return deletedCount;
  }
}

// Export singleton instance
export const otpService = new OTPService(require('../../../config/database').pool);
