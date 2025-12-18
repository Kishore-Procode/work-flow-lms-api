import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Use the configured SMTP settings from environment
      const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
      const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || '';

      console.log('🔧 Initializing email service...');
      console.log('   EMAIL_USER:', emailUser ? `${emailUser.substring(0, 5)}***` : 'Missing');
      console.log('   EMAIL_PASS:', emailPass ? 'Set' : 'Missing');

      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };

      // Only create transporter if SMTP credentials are provided
      if (config.auth.user && config.auth.pass) {
        this.transporter = nodemailer.createTransport(config);

        // Test the connection
        this.transporter.verify((error, success) => {
          if (error) {
            console.error('❌ Gmail SMTP connection failed:', error.message);
            this.isConfigured = false;
          } else {
            console.log('✅ Gmail SMTP email service configured and verified');
            this.isConfigured = true;
          }
        });

        // Set as configured initially (will be updated by verify callback)
        this.isConfigured = true;
        console.log('✅ Email service initialized');
      } else {
        console.log('⚠️  Email service not configured (missing SMTP credentials)');
        console.log('   Required: EMAIL_USER and EMAIL_PASS environment variables');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.log('📧 Email service not configured - attempting to send anyway...');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);

        // Try to reinitialize transporter
        this.initializeTransporter();

        // If still not configured, return false
        if (!this.transporter) {
          console.error('❌ Email service could not be initialized');
          return false;
        }
      }

      const mailOptions = {
        from: `"Student-ACT LMS" <${process.env.FROM_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        // Add additional headers for better delivery
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', options.to);
      console.log('   Message ID:', result.messageId);
      console.log('   Response:', result.response);

      // Additional success logging
      console.log('   📧 Email Details:');
      console.log('     From:', mailOptions.from);
      console.log('     Subject:', options.subject);
      console.log('     Delivery Status: Accepted by SMTP server');

      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email to:', options.to);
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Command:', error.command);

      // Log specific Gmail/SMTP errors
      if (error.code === 'EAUTH') {
        console.error('   🔐 Authentication failed - check SMTP credentials');
      } else if (error.code === 'ECONNECTION') {
        console.error('   🌐 Connection failed - check SMTP server settings');
      } else if (error.responseCode === 550) {
        console.error('   📧 Email rejected - recipient may not exist');
      }

      return false;
    }
  }

  generateWelcomeEmail(userName: string, userEmail: string, temporaryPassword: string, role: string): EmailOptions {
    const subject = `Welcome to Student-ACT LMS - ${role.charAt(0).toUpperCase() + role.slice(1)} Account Created`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: #e5f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fef3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Welcome to the resource Monitoring Initiative</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Your ${role} account has been successfully created in the Student-ACT LMS system.</p>
            
            <div class="credentials">
              <h3>🔐 Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
              <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            </div>

            <div class="warning">
              <h4>⚠️ Important Security Notice:</h4>
              <p>Please change your password immediately after your first login for security purposes.</p>
            </div>

            <p>You can now access the system using the link below:</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}" class="button">Login to System</a>

            <h3>🌱 About Student-ACT LMS:</h3>
            <p>This initiative aims to promote environmental awareness and responsibility among students by assigning each student a resource to monitor and care for throughout their academic journey.</p>

            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Student-ACT LMS!

Hello ${userName},

Your ${role} account has been successfully created.

Login Credentials:
- Email: ${userEmail}
- Temporary Password: ${temporaryPassword}
- Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

Please change your password after your first login.

Access the system at: ${process.env.FRONTEND_URL || 'http://localhost:5174'}

If you need help, contact your system administrator.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: userEmail, subject, html, text };
  }

  generateRejectionEmail(userName: string, userEmail: string, rejectionReason: string, role: string): EmailOptions {
    const subject = 'Registration Request Update - Student-ACT LMS';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .reason-box { background: #fef2f2; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; margin: 20px 0; }
          .info-box { background: #eff6ff; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Registration Request Update</p>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Thank you for your interest in joining the Student-ACT LMS initiative.</p>

            <p>After careful review, we regret to inform you that your registration request for a <strong>${role}</strong> account has not been approved at this time.</p>

            <div class="reason-box">
              <h3>📋 Reason for Decision:</h3>
              <p>${rejectionReason}</p>
            </div>

            <div class="info-box">
              <h3>🔄 Next Steps:</h3>
              <p>If you believe this decision was made in error or if you have additional information that might support your application, please contact your institution's coordinator or system administrator.</p>
              <p>You may also resubmit your registration request after addressing the concerns mentioned above.</p>
            </div>

            <h3>📞 Need Help?</h3>
            <p>If you have any questions about this decision or need assistance with the registration process, please don't hesitate to contact us.</p>

            <p>You can reach out to your institution's coordinator or contact our support team for guidance.</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Student-ACT LMS - Registration Request Update

Hello ${userName},

Thank you for your interest in joining the Student-ACT LMS initiative.

After careful review, we regret to inform you that your registration request for a ${role} account has not been approved at this time.

Reason: ${rejectionReason}

Next Steps:
If you believe this decision was made in error or if you have additional information that might support your application, please contact your institution's coordinator or system administrator.

You may also resubmit your registration request after addressing the concerns mentioned above.

If you need help, contact your system administrator.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: userEmail, subject, html, text };
  }

  generateApprovalAcceptanceEmail(userName: string, userEmail: string, role: string, loginEmail: string): EmailOptions {
    const subject = 'Registration Approved - Welcome to Student-ACT LMS!';
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 15px 0; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <h2>🎉 Registration Approved!</h2>
          </div>
          <div class="content">
            <h3>Congratulations ${userName}!</h3>

            <p>Your registration request for the <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong> role has been <span style="color: #059669; font-weight: bold;">APPROVED</span>!</p>

            <p>Your account has been created and you can now access the Student-ACT LMS system.</p>

            <div class="credentials-box">
              <h4>🔐 Your Login Information:</h4>
              <p><strong>Email:</strong> ${loginEmail}</p>
              <p><strong>Password:</strong> Use the password you provided during registration</p>
              <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            </div>

            <div class="warning">
              <strong>🔒 Security Reminder:</strong><br>
              Use the same password you provided when you submitted your registration request.
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">🚀 Login to Your Account</a>
            </div>

            <p>If you have any questions or need assistance, please contact your system administrator.</p>

            <p>Welcome to the Student-ACT LMS family! Together, we're making a difference for our environment.</p>

            <p>Best regards,<br>
            <strong>Student-ACT LMS Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Student-ACT LMS - Registration Approved!

Congratulations ${userName}!

Your registration request for the ${role.charAt(0).toUpperCase() + role.slice(1)} role has been APPROVED!

Your account has been created and you can now access the Student-ACT LMS system.

Login Information:
- Email: ${loginEmail}
- Password: Use the password you provided during registration
- Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

SECURITY REMINDER: Use the same password you provided when you submitted your registration request.

Access the system at: ${loginUrl}

If you have any questions or need assistance, please contact your system administrator.

Welcome to the Student-ACT LMS family! Together, we're making a difference for our environment.

Best regards,
Student-ACT LMS Team

© 2025 Student-ACT LMS Initiative
    `;

    return { to: userEmail, subject, html, text };
  }

  generateContactNotificationEmail(senderName: string, senderEmail: string, subject: string, category: string, message: string, priority: string, messageId: string): EmailOptions {
    const emailSubject = `[${priority.toUpperCase()}] New Contact Message: ${subject}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .priority-high { border-left: 4px solid #ef4444; }
          .priority-medium { border-left: 4px solid #f59e0b; }
          .priority-low { border-left: 4px solid #10b981; }
          .message-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 New Contact Message</h1>
            <p>Student-ACT LMS Support</p>
          </div>
          <div class="content">
            <div class="message-box priority-${priority}">
              <h2>Contact Details</h2>
              <p><strong>From:</strong> ${senderName}</p>
              <p><strong>Email:</strong> ${senderEmail}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Category:</strong> ${category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}</p>
              <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
              <p><strong>Message ID:</strong> ${messageId}</p>

              <h3>Message:</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
            </div>

            <p><strong>Action Required:</strong> Please respond to this message within the appropriate timeframe based on priority level.</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            Admin Notification System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Contact Message - Student-ACT LMS

From: ${senderName} (${senderEmail})
Subject: ${subject}
Category: ${category}
Priority: ${priority.toUpperCase()}
Message ID: ${messageId}

Message:
${message}

Please respond to this message within the appropriate timeframe.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: process.env.ADMIN_EMAIL || 'admin@onestudentoneresourceresource.org', subject: emailSubject, html, text };
  }

  generateContactConfirmationEmail(userName: string, userEmail: string, subject: string, category: string, messageId: string): EmailOptions {
    const emailSubject = 'Message Received - Student-ACT LMS Support';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #eff6ff; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Message Received</h1>
            <p>Student-ACT LMS Support</p>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Thank you for contacting Student-ACT LMS support. We have successfully received your message and will respond as soon as possible.</p>

            <div class="info-box">
              <h3>📋 Your Message Details:</h3>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Category:</strong> ${category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}</p>
              <p><strong>Reference ID:</strong> ${messageId}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <h3>⏰ Expected Response Time:</h3>
            <ul>
              <li><strong>General inquiries:</strong> Within 24 hours</li>
              <li><strong>Technical support:</strong> Within 12 hours</li>
              <li><strong>Emergency issues:</strong> Within 2 hours</li>
            </ul>

            <p>If you have any urgent concerns, please don't hesitate to call our emergency line at <strong>+91 98765 43210</strong>.</p>

            <p>Best regards,<br>
            Student-ACT LMS Support Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated confirmation message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Message Received - Student-ACT LMS Support

Hello ${userName},

Thank you for contacting Student-ACT LMS support. We have successfully received your message and will respond as soon as possible.

Your Message Details:
- Subject: ${subject}
- Category: ${category}
- Reference ID: ${messageId}
- Submitted: ${new Date().toLocaleString()}

Expected Response Time:
- General inquiries: Within 24 hours
- Technical support: Within 12 hours
- Emergency issues: Within 2 hours

If you have any urgent concerns, please call our emergency line at +91 98765 43210.

Best regards,
Student-ACT LMS Support Team

© 2025 Student-ACT LMS Initiative
    `;

    return { to: userEmail, subject: emailSubject, html, text };
  }

  generateContactResponseEmail(userName: string, userEmail: string, originalSubject: string, response: string, messageId: string): EmailOptions {
    const emailSubject = `Re: ${originalSubject} - Student-ACT LMS Support`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .response-box { background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #10b981; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Support Response</h1>
            <p>Student-ACT LMS Support</p>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Thank you for your patience. We have reviewed your inquiry and are pleased to provide the following response:</p>

            <div class="response-box">
              <h3>📝 Our Response:</h3>
              <div style="white-space: pre-wrap;">${response}</div>
            </div>

            <p><strong>Reference ID:</strong> ${messageId}</p>
            <p><strong>Original Subject:</strong> ${originalSubject}</p>

            <p>If you have any follow-up questions or need further assistance, please don't hesitate to contact us again.</p>

            <p>Best regards,<br>
            Student-ACT LMS Support Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            Need more help? Contact us at support@onestudentoneresourceresource.org</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Support Response - Student-ACT LMS

Hello ${userName},

Thank you for your patience. We have reviewed your inquiry and are pleased to provide the following response:

Our Response:
${response}

Reference ID: ${messageId}
Original Subject: ${originalSubject}

If you have any follow-up questions or need further assistance, please don't hesitate to contact us again.

Best regards,
Student-ACT LMS Support Team

© 2025 Student-ACT LMS Initiative
Need more help? Contact us at support@onestudentoneresourceresource.org
    `;

    return { to: userEmail, subject: emailSubject, html, text };
  }

  generatePasswordResetOTPEmail(userName: string, userEmail: string, otp: string): EmailOptions {
    const subject = 'Password Reset Code - Student-ACT LMS';
    const expiryMinutes = 15;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-code { background: #10b981; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fef3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .info { background: #e0f2fe; padding: 15px; border-radius: 5px; border-left: 4px solid #0288d1; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Password Reset Code</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>We received a request to reset your password for your Student-ACT LMS account.</p>

            <p>Use the following verification code to reset your password:</p>
            <div class="otp-code">${otp}</div>

            <div class="info">
              <h4>📋 Instructions:</h4>
              <p>1. Enter this code in the password reset form</p>
              <p>2. Create a new secure password</p>
              <p>3. Confirm your new password</p>
            </div>

            <div class="warning">
              <h4>⚠️ Security Notice:</h4>
              <p>This code will expire in ${expiryMinutes} minutes for security purposes.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <p>Never share this code with anyone.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Password Reset Code - Student-ACT LMS

Hello ${userName},

We received a request to reset your password for your Student-ACT LMS account.

Your password reset code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

Instructions:
1. Enter this code in the password reset form
2. Create a new secure password
3. Confirm your new password

Security Notice:
- Never share this code with anyone
- If you didn't request this password reset, please ignore this email

© 2025 Student-ACT LMS Initiative
    `;

    return { to: userEmail, subject, html, text };
  }

  generatePasswordResetEmail(userName: string, userEmail: string, resetToken: string): EmailOptions {
    const subject = 'Password Reset - Student-ACT LMS';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${resetToken}`;

    // This method is kept for backward compatibility but not used in the new OTP flow
    const html = `<p>Password reset link: ${resetUrl}</p>`;
    const text = `Password reset link: ${resetUrl}`;

    return { to: userEmail, subject, html, text };
  }

  generateApprovalNotificationEmail(approverName: string, approverEmail: string, requestorName: string, requestedRole: string, workflowId: string): EmailOptions {
    const subject = `Approval Required - ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)} Registration Request`;
    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/dashboard?tab=approvals&workflow=${workflowId}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px; }
          .urgent { background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Registration Approval Required</p>
          </div>
          <div class="content">
            <h2>Hello ${approverName}!</h2>
            <p>A new registration request requires your approval in the Student-ACT LMS system.</p>

            <div class="urgent">
              <h3>📋 Request Details:</h3>
              <p><strong>Applicant:</strong> ${requestorName}</p>
              <p><strong>Requested Role:</strong> ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}</p>
              <p><strong>Status:</strong> Pending Your Approval</p>
            </div>

            <p>Please review and process this request at your earliest convenience:</p>
            <a href="${approvalUrl}" class="button">Review Request</a>

            <h3>⏰ Action Required:</h3>
            <p>This request is waiting for your approval to proceed to the next stage. Please log in to the system to review the applicant's details and make your decision.</p>

            <h3>📞 Need Help?</h3>
            <p>If you have any questions about this request, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Approval Required - Student-ACT LMS

Hello ${approverName},

A new registration request requires your approval.

Request Details:
- Applicant: ${requestorName}
- Requested Role: ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}
- Status: Pending Your Approval

Please review this request: ${approvalUrl}

© 2025 Student-ACT LMS Initiative
    `;

    return { to: approverEmail, subject, html, text };
  }

  /**
   * Generate principal invitation email
   */
  generatePrincipalInvitationEmail(
    principalName: string,
    principalEmail: string,
    collegeName: string,
    invitationToken: string,
    temporaryPassword?: string
  ): EmailOptions {
    const subject = `Invitation to Join Student-ACT LMS Platform - ${collegeName}`;
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitation/${invitationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; }
          .footer { background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px; }
          .features { background: #e5f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Welcome to the resource Monitoring Initiative</p>
          </div>
          <div class="content">
            <h2>Welcome to Student-ACT LMS!</h2>

            <p>Dear ${principalName},</p>

            <p>You have been invited to join the Student-ACT LMS platform as the Principal of <strong>${collegeName}</strong>.</p>

            <div class="features">
              <h3>🌱 Platform Features:</h3>
              <ul>
                <li>Assign resources to students for monitoring and care</li>
                <li>Track resource growth and health progress</li>
                <li>Manage staff, departments, and student registrations</li>
                <li>Generate comprehensive reports on environmental impact</li>
              </ul>

              <h3>👨‍💼 As Principal, you can:</h3>
              <ul>
                <li>Manage your college's profile and information</li>
                <li>Invite and manage staff members and HODs</li>
                <li>Oversee student registrations and resource assignments</li>
                <li>Access detailed reports and analytics</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation & Register</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              This invitation link will expire in 7 days. If you have any questions, please contact our support team.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              If you cannot click the button above, copy and paste this link into your browser:<br>
              <code>${invitationUrl}</code>
            </p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Student-ACT LMS!

Dear ${principalName},

You have been invited to join the Student-ACT LMS platform as the Principal of ${collegeName}.

${temporaryPassword ? `
LOGIN CREDENTIALS:
- Email: ${principalEmail}
- Temporary Password: ${temporaryPassword}

⚠️ Please change your password after your first login for security.
` : ''}

Accept your invitation: ${invitationUrl}

This invitation link will expire in 7 days.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: principalEmail, subject, html, text };
  }

  /**
   * Generate staff/HOD invitation email
   */
  generateStaffHODInvitationEmail(
    staffName: string,
    staffEmail: string,
    role: string,
    departmentName: string,
    principalName: string,
    invitationToken: string,
    temporaryPassword?: string
  ): EmailOptions {
    const subject = `Invitation to Join Student-ACT LMS Platform - ${role.toUpperCase()} Position`;
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitation/${invitationToken}`;
    const roleTitle = role === 'hod' ? 'Head of Department' : 'Staff Member';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; }
          .footer { background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px; }
          .features { background: #e5f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .role-badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Welcome to the resource Monitoring Initiative</p>
          </div>
          <div class="content">
            <h2>Welcome to Student-ACT LMS!</h2>

            <p>Dear ${staffName},</p>

            <p>You have been invited by <strong>${principalName}</strong> to join the Student-ACT LMS platform as a <span class="role-badge">${roleTitle}</span> in the <strong>${departmentName}</strong> department.</p>

            ${temporaryPassword ? `
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">🔐 Your Login Credentials</h3>
              <p style="color: #92400e; margin: 10px 0;"><strong>Email:</strong> ${staffEmail}</p>
              <p style="color: #92400e; margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #fbbf24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${temporaryPassword}</code></p>
              <p style="color: #92400e; font-size: 14px; margin-bottom: 0;">⚠️ Please change your password after your first login for security.</p>
            </div>
            ` : ''}

            <div class="features">
              <h3>🌱 Your Role & Responsibilities:</h3>
              ${role === 'hod' ? `
                <ul>
                  <li><strong>Department Leadership:</strong> Oversee resource monitoring activities in your department</li>
                  <li><strong>Staff Management:</strong> Invite and manage staff members in your department</li>
                  <li><strong>Student Oversight:</strong> Monitor student registrations and resource assignments</li>
                  <li><strong>Progress Tracking:</strong> Review department-wide resource care progress</li>
                  <li><strong>Reporting:</strong> Generate and review departmental reports</li>
                </ul>
              ` : `
                <ul>
                  <li><strong>Student Management:</strong> Upload and manage student information</li>
                  <li><strong>Registration Approval:</strong> Review and approve student registration requests</li>
                  <li><strong>resource Assignment:</strong> Help assign resources to students for monitoring</li>
                  <li><strong>Progress Monitoring:</strong> Track student resource care activities</li>
                  <li><strong>Support & Guidance:</strong> Assist students with resource monitoring tasks</li>
                </ul>
              `}

              <h3>🎯 Platform Benefits:</h3>
              <ul>
                <li>Streamlined student and resource management system</li>
                <li>Real-time progress tracking and reporting</li>
                <li>Automated notifications and reminders</li>
                <li>Comprehensive analytics and insights</li>
                <li>Environmental impact measurement</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation & Register</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              This invitation link will expire in 7 days. If you have any questions, please contact your principal or our support team.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              If you cannot click the button above, copy and paste this link into your browser:<br>
              <code>${invitationUrl}</code>
            </p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This invitation was sent by ${principalName}<br>
            This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Student-ACT LMS!

Dear ${staffName},

You have been invited by ${principalName} to join the Student-ACT LMS platform as a ${roleTitle} in the ${departmentName} department.

${temporaryPassword ? `
LOGIN CREDENTIALS:
- Email: ${staffEmail}
- Temporary Password: ${temporaryPassword}

⚠️ Please change your password after your first login for security.
` : ''}

Accept your invitation: ${invitationUrl}

This invitation link will expire in 7 days.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: staffEmail, subject, html, text };
  }

  /**
   * Generate student invitation email
   */
  generateStudentInvitationEmail(
    studentName: string,
    studentEmail: string,
    rollNumber: string,
    year: string,
    section: string,
    departmentName: string,
    staffName: string,
    invitationToken: string,
    temporaryPassword?: string
  ): EmailOptions {
    const subject = `Welcome to Student-ACT LMS - Registration Invitation`;
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invitation/${invitationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px; }
          .footer { background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px; }
          .features { background: #e5f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .student-info { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌳 Student-ACT LMS</h1>
            <p>Your Journey to Environmental Stewardship Begins!</p>
          </div>
          <div class="content">
            <h2>Welcome to Student-ACT LMS Initiative!</h2>

            <p>Dear ${studentName},</p>

            <p>You have been invited by <strong>${staffName}</strong> to join the Student-ACT LMS platform - an innovative environmental initiative where every student gets assigned a resource to monitor and care for!</p>

            <div class="student-info">
              <h3>📋 Your Student Information:</h3>
              <ul>
                <li><strong>Name:</strong> ${studentName}</li>
                <li><strong>Roll Number:</strong> ${rollNumber}</li>
                <li><strong>Year:</strong> ${year}${section ? ` - Section ${section}` : ''}</li>
                <li><strong>Department:</strong> ${departmentName}</li>
              </ul>
            </div>

            <div class="features">
              <h3>🌱 What You'll Do:</h3>
              <ul>
                <li><strong>resource Assignment:</strong> Get your own resource to monitor and care for</li>
                <li><strong>Progress Tracking:</strong> Record your resource's growth and health regularly</li>
                <li><strong>Photo Documentation:</strong> Upload photos showing your resource's progress</li>
                <li><strong>Environmental Impact:</strong> Contribute to a greener campus and planet</li>
                <li><strong>Learning Experience:</strong> Gain hands-on knowledge about environmental conservation</li>
              </ul>

              <h3>🎯 Platform Features:</h3>
              <ul>
                <li>Easy-to-use mobile-friendly interface</li>
                <li>Progress tracking and milestone achievements</li>
                <li>Educational resources about resource care</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Register & Get Your resource!</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              This invitation link will expire in 14 days. Don't miss out on this amazing opportunity to make a positive environmental impact!
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              If you cannot click the button above, copy and paste this link into your browser:<br>
              <code>${invitationUrl}</code>
            </p>

            <p style="margin-top: 30px;">
              <strong>Questions?</strong> Contact your staff member ${staffName} or our support team for assistance.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 Student-ACT LMS Initiative<br>
            This invitation was sent by ${staffName}<br>
            Together, we're growing a greener future! 🌱</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Student-ACT LMS Initiative!

Dear ${studentName},

You have been invited by ${staffName} to join the Student-ACT LMS platform.

Your Information:
- Name: ${studentName}
- Roll Number: ${rollNumber}
- Year: ${year}${section ? ` - Section ${section}` : ''}
- Department: ${departmentName}

${temporaryPassword ? `
LOGIN CREDENTIALS:
- Email: ${studentEmail}
- Temporary Password: ${temporaryPassword}

⚠️ Please change your password after your first login for security.
` : ''}

Register and get your resource: ${invitationUrl}

This invitation link will expire in 14 days.

© 2025 Student-ACT LMS Initiative
    `;

    return { to: studentEmail, subject, html, text };
  }
}

export const emailService = new EmailService();
