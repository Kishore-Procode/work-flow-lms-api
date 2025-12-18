import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { convertKeysToCamelCase } from '../../../utils/convertKeys';
import { appLogger } from '../../../utils/logger';

export class ContactController {
  /**
   * Send contact message
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        phone,
        subject,
        category,
        message,
        priority = 'medium',
        userId,
        userRole
      } = req.body;

      // Validation
      if (!name || !email || !subject || !category || !message) {
        res.status(400).json({
          success: false,
          message: 'Name, email, subject, category, and message are required',
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
        return;
      }

      // Message length validation
      if (message.length < 10) {
        res.status(400).json({
          success: false,
          message: 'Message must be at least 10 characters long',
        });
        return;
      }

      // Category validation
      const validCategories = ['technical', 'resource-monitoring', 'account', 'general', 'feedback', 'emergency'];
      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          message: 'Invalid category selected',
        });
        return;
      }

      // Priority validation
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        res.status(400).json({
          success: false,
          message: 'Invalid priority level',
        });
        return;
      }

      // Insert contact message into database
      const insertQuery = `
        INSERT INTO contact_messages (
          name, email, phone, subject, category, message, priority, 
          user_id, user_role, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        subject.trim(),
        category,
        message.trim(),
        priority,
        userId || null,
        userRole || null,
        'pending',
        new Date()
      ];

      const result = await pool.query(insertQuery, values);
      const contactMessage = result.rows[0];

      // Send email notification to admin
      try {
        const emailService = require('../../../utils/email.service');
        
        // Send notification to admin
        const adminEmailOptions = emailService.generateContactNotificationEmail(
          name,
          email,
          subject,
          category,
          message,
          priority,
          contactMessage.id
        );

        await emailService.sendEmail(adminEmailOptions);
        console.log('✅ Contact notification email sent to admin');

        // Send confirmation email to user
        const userEmailOptions = emailService.generateContactConfirmationEmail(
          name,
          email,
          subject,
          category,
          contactMessage.id
        );

        await emailService.sendEmail(userEmailOptions);
        console.log('✅ Contact confirmation email sent to user:', email);

      } catch (emailError) {
        console.error('⚠️  Failed to send contact emails:', emailError);
        // Don't fail the contact submission if email fails
      }

      // Log the contact message
      appLogger.info('Contact message received', {
        messageId: contactMessage.id,
        category,
        priority,
        userEmail: email,
        userId: userId || 'anonymous'
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully! We will respond within 24 hours.',
        data: convertKeysToCamelCase(contactMessage),
      });

    } catch (error: any) {
      console.error('Error sending contact message:', error);
      appLogger.error('Contact message error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get all contact messages (admin only)
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { 
        status, 
        category, 
        priority, 
        limit = 50, 
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      let query = `
        SELECT 
          cm.*,
          u.name as user_name,
          u.role as user_role_full
        FROM contact_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND cm.status = $${paramCount}`;
        params.push(status);
      }

      if (category) {
        paramCount++;
        query += ` AND cm.category = $${paramCount}`;
        params.push(category);
      }

      if (priority) {
        paramCount++;
        query += ` AND cm.priority = $${paramCount}`;
        params.push(priority);
      }

      // Add sorting
      const validSortFields = ['created_at', 'priority', 'status', 'category'];
      const validSortOrders = ['ASC', 'DESC'];
      
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'created_at';
      const sortDirection = validSortOrders.includes((sortOrder as string).toUpperCase()) 
        ? (sortOrder as string).toUpperCase() 
        : 'DESC';

      query += ` ORDER BY cm.${sortField} ${sortDirection}`;

      // Add pagination
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit as string));

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset as string));

      const result = await pool.query(query, params);
      const messages = result.rows;

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM contact_messages cm
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      let countParamCount = 0;

      if (status) {
        countParamCount++;
        countQuery += ` AND cm.status = $${countParamCount}`;
        countParams.push(status);
      }

      if (category) {
        countParamCount++;
        countQuery += ` AND cm.category = $${countParamCount}`;
        countParams.push(category);
      }

      if (priority) {
        countParamCount++;
        countQuery += ` AND cm.priority = $${countParamCount}`;
        countParams.push(priority);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.status(200).json({
        success: true,
        message: 'Contact messages retrieved successfully',
        data: convertKeysToCamelCase(messages),
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });

    } catch (error: any) {
      console.error('Error fetching contact messages:', error);
      appLogger.error('Contact messages fetch error', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact messages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Update contact message status (admin only)
   */
  async updateMessageStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, response, respondedBy } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      const validStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
        return;
      }

      const updateQuery = `
        UPDATE contact_messages 
        SET 
          status = $1,
          admin_response = $2,
          responded_by = $3,
          responded_at = $4,
          updated_at = $5
        WHERE id = $6
        RETURNING *
      `;

      const values = [
        status,
        response || null,
        respondedBy || req.user?.id || null,
        status === 'resolved' || status === 'closed' ? new Date() : null,
        new Date(),
        id
      ];

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
        return;
      }

      const updatedMessage = result.rows[0];

      // Send response email to user if status is resolved and response is provided
      if ((status === 'resolved' || status === 'closed') && response) {
        try {
          const emailService = require('../../../utils/email.service');
          
          const responseEmailOptions = emailService.generateContactResponseEmail(
            updatedMessage.name,
            updatedMessage.email,
            updatedMessage.subject,
            response,
            updatedMessage.id
          );

          await emailService.sendEmail(responseEmailOptions);
          console.log('✅ Contact response email sent to user:', updatedMessage.email);

        } catch (emailError) {
          console.error('⚠️  Failed to send response email:', emailError);
        }
      }

      appLogger.info('Contact message status updated', {
        messageId: id,
        newStatus: status,
        respondedBy: respondedBy || req.user?.id
      });

      res.status(200).json({
        success: true,
        message: 'Contact message updated successfully',
        data: convertKeysToCamelCase(updatedMessage),
      });

    } catch (error: any) {
      console.error('Error updating contact message:', error);
      appLogger.error('Contact message update error', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id,
        body: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update contact message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

export const contactController = new ContactController();
