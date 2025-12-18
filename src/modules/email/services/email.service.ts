/**
 * Email Service
 * 
 * Simple email service for sending emails using nodemailer
 * following MNC enterprise standards for email communication.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import nodemailer from 'nodemailer';
import { appLogger } from '../../../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Email Service Class
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || 'noreply@osot.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      await this.transporter.sendMail(mailOptions);
      
      appLogger.info('Email sent successfully', {
        to: this.maskEmail(options.to),
        subject: options.subject,
      });
    } catch (error) {
      appLogger.error('Failed to send email', {
        error,
        to: this.maskEmail(options.to),
        subject: options.subject,
      });
      throw error;
    }
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
export const emailService = new EmailService();
