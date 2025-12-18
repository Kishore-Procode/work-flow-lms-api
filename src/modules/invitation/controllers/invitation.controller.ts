import { Request, Response } from 'express';
import { pool } from '../../../config/database';

// Utility function to convert snake_case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Utility function to convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    converted[camelKey] = convertKeysToCamelCase(value);
  }
  return converted;
};

export class InvitationController {
  /**
   * Validate hierarchical invitation permissions
   */
  private async validateInvitationPermissions(
    senderRole: string, 
    targetRole: string, 
    senderId: string, 
    collegeId?: string, 
    departmentId?: string
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      // Admin can invite anyone
      if (senderRole === 'admin') {
        return { isValid: true };
      }

      // Get sender's details
      const senderQuery = `SELECT * FROM users WHERE id = $1`;
      const senderResult = await pool.query(senderQuery, [senderId]);
      const sender = senderResult.rows[0];

      if (!sender) {
        return { isValid: false, message: 'Sender not found' };
      }

      // Principal can invite HODs and staff within their college
      if (senderRole === 'principal') {
        if (!['hod', 'staff'].includes(targetRole)) {
          return { isValid: false, message: 'Principals can only invite HODs and staff' };
        }
        if (collegeId && sender.college_id !== collegeId) {
          return { isValid: false, message: 'Principals can only invite users to their own college' };
        }
        return { isValid: true };
      }

      // HOD can invite staff and students within their department
      if (senderRole === 'hod') {
        if (!['staff', 'student'].includes(targetRole)) {
          return { isValid: false, message: 'HODs can only invite staff and students' };
        }
        if (departmentId && sender.department_id !== departmentId) {
          return { isValid: false, message: 'HODs can only invite users to their own department' };
        }
        if (collegeId && sender.college_id !== collegeId) {
          return { isValid: false, message: 'HODs can only invite users to their own college' };
        }
        return { isValid: true };
      }

      // Staff can invite students within their department
      if (senderRole === 'staff') {
        if (targetRole !== 'student') {
          return { isValid: false, message: 'Staff can only invite students' };
        }
        if (departmentId && sender.department_id !== departmentId) {
          return { isValid: false, message: 'Staff can only invite students to their own department' };
        }
        if (collegeId && sender.college_id !== collegeId) {
          return { isValid: false, message: 'Staff can only invite students to their own college' };
        }
        return { isValid: true };
      }

      // Students cannot invite anyone
      return { isValid: false, message: 'Students are not authorized to send invitations' };

    } catch (error) {
      console.error('Permission validation error:', error);
      return { isValid: false, message: 'Error validating permissions' };
    }
  }

  /**
   * Get all invitations with pagination and filtering
   */
  getInvitations = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      let query = '';
      let queryParams: any[] = [];

      // Extract pagination and filter parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const role = req.query.role as string;
      const offset = (page - 1) * limit;

      // Build base WHERE conditions based on user role
      let baseConditions: string[] = [];
      let baseParams: any[] = [];
      let paramIndex = 1;

      // Role-based access control
      if (req.user.role === 'admin') {
        // Admin can see all invitations
      } else if (req.user.role === 'principal') {
        baseConditions.push(`(i.college_id = $${paramIndex} OR i.sent_by = $${paramIndex + 1})`);
        baseParams.push(req.user.collegeId, req.user.userId);
        paramIndex += 2;
      } else if (req.user.role === 'hod') {
        baseConditions.push(`(i.department_id = $${paramIndex} OR i.sent_by = $${paramIndex + 1})`);
        baseParams.push(req.user.departmentId, req.user.userId);
        paramIndex += 2;
      } else if (req.user.role === 'staff') {
        baseConditions.push(`i.sent_by = $${paramIndex}`);
        baseParams.push(req.user.userId);
        paramIndex += 1;
      } else {
        res.status(403).json({
          success: false,
          message: 'Students are not authorized to view invitations',
        });
        return;
      }

      // Add filter conditions
      if (search) {
        baseConditions.push(`(
          i.email ILIKE $${paramIndex} OR
          c.name ILIKE $${paramIndex} OR
          d.name ILIKE $${paramIndex} OR
          u.name ILIKE $${paramIndex}
        )`);
        baseParams.push(`%${search}%`);
        paramIndex += 1;
      }

      if (status && status !== 'all') {
        baseConditions.push(`i.status = $${paramIndex}`);
        baseParams.push(status);
        paramIndex += 1;
      }

      if (role && role !== 'all') {
        baseConditions.push(`i.role = $${paramIndex}`);
        baseParams.push(role);
        paramIndex += 1;
      }

      const whereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM invitations i
        LEFT JOIN users u ON i.sent_by = u.id
        LEFT JOIN colleges c ON i.college_id = c.id
        LEFT JOIN departments d ON i.department_id = d.id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, baseParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get paginated data
      const dataQuery = `
        SELECT
          i.*,
          u.name as sent_by_name,
          c.name as college_name,
          d.name as department_name
        FROM invitations i
        LEFT JOIN users u ON i.sent_by = u.id
        LEFT JOIN colleges c ON i.college_id = c.id
        LEFT JOIN departments d ON i.department_id = d.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataResult = await pool.query(dataQuery, [...baseParams, limit, offset]);
      console.log(dataResult)
      res.status(200).json({
        success: true,
        message: 'Invitations retrieved successfully',
        data: convertKeysToCamelCase(dataResult.rows),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get invitations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve invitations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create invitation
   */
  createInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      let {
        email,
        role,
        college_id,
        department_id,
        name,
        phone,
        yearOfStudy,
        section,
        rollNumber,
        academicYearId,
        courseId,
        sectionId,
        designation,
        qualification,
        experience
      } = req.body;
      const sent_by = (req as any).user.userId;
      const senderRole = (req as any).user.role;

      // Set default roles based on sender hierarchy
      if (senderRole === 'principal' && !role) {
        role = 'staff'; // Default for principal invitations
      } else if (senderRole === 'hod' && !role) {
        role = 'staff'; // Default for HOD invitations
      }

      // Validate hierarchical invitation permissions
      const validationResult = await this.validateInvitationPermissions(senderRole, role, sent_by, college_id, department_id);
      if (!validationResult.isValid) {
        res.status(403).json({
          success: false,
          message: validationResult.message,
        });
        return;
      }

      // Generate invitation token
      const invitation_token = 'inv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const query = `
        INSERT INTO invitations (
          email, role, sent_by, college_id, department_id, status, invitation_token,
          name, phone, year_of_study, section, roll_number, designation, qualification, experience, academic_year_id, course_id, section_id
        )
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const result = await pool.query(query, [
        email, role, sent_by, college_id, department_id, invitation_token,
        name, phone, yearOfStudy, section, rollNumber, designation, qualification, experience, academicYearId, courseId, sectionId
      ]);
      const invitation = convertKeysToCamelCase(result.rows[0]);

      // Send invitation email
      try {
        const { emailService } = require('../../../utils/email.service');

        // Get user and college/department details for email
        const userQuery = `SELECT name FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [sent_by]);
        const senderName = userResult.rows[0]?.name || 'System Administrator';

        let emailOptions;

        const temporaryPassword = 'TempPassword@123'; // Standard temporary password

        if (role === 'principal') {
          // Get college name for principal invitation
          const collegeQuery = `SELECT name FROM colleges WHERE id = $1`;
          const collegeResult = await pool.query(collegeQuery, [college_id]);
          const collegeName = collegeResult.rows[0]?.name || 'College';

          emailOptions = emailService.generatePrincipalInvitationEmail(
            email.split('@')[0], // Use email prefix as name placeholder
            email,
            collegeName,
            invitation_token,
            temporaryPassword
          );
        } else {
          // Get department name for staff/HOD invitation
          const deptQuery = `SELECT name FROM departments WHERE id = $1`;
          const deptResult = await pool.query(deptQuery, [department_id]);
          const departmentName = deptResult.rows[0]?.name || 'Department';

          emailOptions = emailService.generateStaffHODInvitationEmail(
            email.split('@')[0], // Use email prefix as name placeholder
            email,
            role,
            departmentName,
            senderName,
            invitation_token,
            temporaryPassword
          );
        }

        await emailService.sendEmail(emailOptions);
        console.log(`✅ Invitation email sent to: ${email}`);

      } catch (emailError) {
        console.error('⚠️  Failed to send invitation email:', emailError);
        // Don't fail the invitation creation if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Invitation created successfully',
        data: invitation,
      });
    } catch (error) {
      console.error('Create invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create invitation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update invitation
   */
  updateInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, role, collegeId, departmentId } = req.body;

      const query = `
        UPDATE invitations
        SET email = $1, role = $2, college_id = $3, department_id = $4
        WHERE id = $5
        RETURNING *
      `;

      const result = await pool.query(query, [email, role, collegeId, departmentId, id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Invitation updated successfully',
        data: convertKeysToCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Update invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update invitation',
      });
    }
  }

  /**
   * Delete invitation
   */
  deleteInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const query = 'DELETE FROM invitations WHERE id = $1';
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Invitation deleted successfully',
      });
    } catch (error) {
      console.error('Delete invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete invitation',
      });
    }
  }

  /**
   * Validate invitation token (public route)
   */
  validateInvitationToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      const query = `
        SELECT
          i.*,
          c."name" as college_name,
          d."name" as department_name,
          u.name as sent_by_name,
          ay.year_name as academic_year_name
        FROM invitations i
        LEFT JOIN users u ON i.sent_by = u.id
        LEFT JOIN colleges c ON i.college_id = c.id
        LEFT JOIN departments d ON i.department_id = d.id
        left join academic_years ay ON ay.id = i.academic_year_id
        WHERE invitation_token = $1 AND i.status = 'pending' AND expires_at > NOW()
      `;

      const result = await pool.query(query, [token]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or has expired',
        });
        return;
      }

      const invitation = convertKeysToCamelCase(result.rows[0]);
      console.log('Validated invitation token:', invitation);
      res.status(200).json({
        success: true,
        message: 'Invitation is valid',
        data: invitation,
      });
    } catch (error) {
      console.error('Validate invitation token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate invitation token',
      });
    }
  }

  /**
   * Accept invitation and create user account (public route)
   */
  acceptInvitationPublic = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invitationToken, name, phone, password, rollNumber, designation, qualification, experience } = req.body;

      // Validate invitation token
      const invitationQuery = `
        SELECT * FROM invitations
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW()
      `;

      const invitationResult = await pool.query(invitationQuery, [invitationToken]);

      if (invitationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or has expired',
        });
        return;
      }

      const invitation = invitationResult.rows[0];
      console.log('Validated invitation token:', invitation);

      // Check if user already exists
      const userRepository = require('../../user/repositories/user.repository').userRepository;
      const existingUser = await userRepository.findByEmail(invitation.email);

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // Hash password
      const { hashPassword } = require('../../../utils/auth.utils');
      console.log('Hashing password for user:', invitation.email);
      const passwordHash = await hashPassword(password);
      console.log('Password hashed successfully');

      // Get academic year name if academic_year_id exists
      let academicYearName = null;
      if (invitation.academic_year_id) {
        try {
          const { academicYearRepository } = require('../../academic-year/repositories/academic-year.repository');
          const academicYear = await academicYearRepository.findById(invitation.academic_year_id);
          academicYearName = academicYear?.year_name || null;
        } catch (error) {
          console.error('Failed to fetch academic year:', error);
        }
      }

      // Create user account with all required fields
      const createUserData = {
        name,
        email: invitation.email,
        phone,
        role: invitation.role,
        passwordHash,
        status: 'active',
        collegeId: invitation.college_id,
        departmentId: invitation.department_id,
        // Add student-specific fields if role is student
        ...(invitation.role === 'student' && {
          rollNumber: rollNumber || invitation.roll_number,
          class: invitation.section,
          semester: invitation.year_of_study ? `${invitation.year_of_study}` : null,
          academicYearId: invitation?.academic_year_id || null,
          courseId: invitation?.course_id || null,
          sectionId: invitation?.section_id || null,
          yearOfStudy: academicYearName || (invitation.year_of_study ? `${invitation.year_of_study}` : null),
        }),
        // Add staff-specific fields if role is staff/hod
        ...((['staff', 'hod'].includes(invitation.role)) && {
          designation: designation || invitation.designation,
          qualification: qualification || invitation.qualification,
          experience: experience || invitation.experience,
        }),
        emailVerified: true, // Since they accepted the invitation via email
      };

      console.log('Creating user with data:', createUserData);
      const newUser = await userRepository.createUser(createUserData);
      console.log('User created successfully:', { id: newUser.id, email: newUser.email, role: newUser.role });

      // Special handling for principal role
      if (invitation.role === 'principal') {
        // Check if there's already a principal for this college
        const existingPrincipalQuery = `
          SELECT principal_id FROM colleges
          WHERE id = $1 AND principal_id IS NOT NULL
        `;

        const existingPrincipalResult = await pool.query(existingPrincipalQuery, [invitation.college_id]);

        if (existingPrincipalResult.rows.length > 0) {
          res.status(400).json({
            success: false,
            message: 'A principal is already assigned to this college. Only one principal is allowed per college.',
          });
          return;
        }

        // Verify the college exists
        const collegeExistsQuery = `
          SELECT id FROM colleges WHERE id = $1
        `;

        const collegeResult = await pool.query(collegeExistsQuery, [invitation.college_id]);

        if (collegeResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            message: 'College not found. Cannot assign principal.',
          });
          return;
        }

        // Update college table to set the new principal
        const updateCollegePrincipalQuery = `
          UPDATE colleges
          SET principal_id = $1, updated_at = NOW()
          WHERE id = $2
        `;

        await pool.query(updateCollegePrincipalQuery, [newUser.id, invitation.college_id]);
        console.log('College principal updated successfully:', { collegeId: invitation.college_id, principalId: newUser.id });
      }

      // Accept the invitation
      const acceptQuery = `
        UPDATE invitations
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const acceptResult = await pool.query(acceptQuery, [invitation.id]);
      console.log('Invitation accepted successfully:', acceptResult.rows[0]?.id);

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = newUser;

      console.log('Account creation completed successfully for:', invitation.email);

      res.status(201).json({
        success: true,
        message: 'Account created successfully! You can now log in.',
        data: {
          user: userWithoutPassword,
          invitation: convertKeysToCamelCase(invitation),
        },
      });
    } catch (error) {
      console.error('Accept invitation public error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation and create account',
      });
    }
  }

  /**
   * Accept invitation
   */
  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user; // Assuming user is attached to request from auth middleware

      // First, get the invitation details to check the role
      const getInvitationQuery = `
        SELECT * FROM invitations
        WHERE id = $1 AND status = 'pending'
      `;

      const invitationResult = await pool.query(getInvitationQuery, [id]);

      if (invitationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or already processed',
        });
        return;
      }

      const invitation = invitationResult.rows[0];

      // Special handling for principal role
      if (invitation.role === 'principal') {
        // Check if there's already a principal for this college
        const existingPrincipalQuery = `
          SELECT principal_id FROM colleges
          WHERE id = $1 AND principal_id IS NOT NULL
        `;

        const existingPrincipalResult = await pool.query(existingPrincipalQuery, [invitation.college_id]);

        if (existingPrincipalResult.rows.length > 0) {
          res.status(400).json({
            success: false,
            message: 'A principal is already assigned to this college. Only one principal is allowed per college.',
          });
          return;
        }

        // Verify the college exists
        const collegeExistsQuery = `
          SELECT id FROM colleges WHERE id = $1
        `;

        const collegeResult = await pool.query(collegeExistsQuery, [invitation.college_id]);

        if (collegeResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            message: 'College not found. Cannot assign principal.',
          });
          return;
        }

        // Update college table to set the new principal
        const updateCollegePrincipalQuery = `
          UPDATE colleges
          SET principal_id = $1, updated_at = NOW()
          WHERE id = $2
        `;

        await pool.query(updateCollegePrincipalQuery, [user?.id, invitation.college_id]);
        console.log('College principal updated successfully:', { collegeId: invitation.college_id, principalId: user?.id });
      }

      const query = `
        UPDATE invitations
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
        data: convertKeysToCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
      });
    }
  }

  /**
   * Reject invitation
   */
  rejectInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const query = `
        UPDATE invitations
        SET status = 'rejected', rejected_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Invitation rejected successfully',
        data: convertKeysToCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Reject invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject invitation',
      });
    }
  }

  /**
   * Resend invitation
   */
  resendInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Get invitation details
      const invitationQuery = `
        SELECT i.*, u.name as sender_name, c.name as college_name, d.name as department_name
        FROM invitations i
        LEFT JOIN users u ON i.sent_by = u.id
        LEFT JOIN colleges c ON i.college_id = c.id
        LEFT JOIN departments d ON i.department_id = d.id
        WHERE i.id = $1 AND i.status = 'pending'
      `;

      const invitationResult = await pool.query(invitationQuery, [id]);

      if (invitationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or already processed',
        });
        return;
      }

      const invitation = invitationResult.rows[0];

      // Generate new invitation token and extend expiry
      const newInvitationToken = 'inv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const newExpiresAt = new Date();

      // Set expiry based on role
      if (invitation.role === 'student') {
        newExpiresAt.setDate(newExpiresAt.getDate() + 14); // Students get 14 days
      } else {
        newExpiresAt.setDate(newExpiresAt.getDate() + 7); // Others get 7 days
      }

      // Update invitation with new token and expiry
      const updateQuery = `
        UPDATE invitations
        SET invitation_token = $1, expires_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await pool.query(updateQuery, [newInvitationToken, newExpiresAt, id]);
      const updatedInvitation = convertKeysToCamelCase(updateResult.rows[0]);

      // Send invitation email
      try {
        const { emailService } = require('../../../utils/email.service');
        const temporaryPassword = 'TempPassword@123'; // Standard temporary password

        let emailOptions;

        if (invitation.role === 'principal') {
          emailOptions = emailService.generatePrincipalInvitationEmail(
            invitation.email.split('@')[0], // Use email prefix as name placeholder
            invitation.email,
            invitation.college_name || 'College',
            newInvitationToken,
            temporaryPassword
          );
        } else if (invitation.role === 'student') {
          // For students, we need more details - use placeholders if not available
          emailOptions = emailService.generateStudentInvitationEmail(
            invitation.email.split('@')[0], // Use email prefix as name placeholder
            invitation.email,
            'N/A', // rollNumber - placeholder
            'N/A', // year - placeholder
            'N/A', // section - placeholder
            invitation.department_name || 'Department',
            invitation.sender_name || 'Staff Member',
            newInvitationToken,
            temporaryPassword
          );
        } else {
          // Staff/HOD
          emailOptions = emailService.generateStaffHODInvitationEmail(
            invitation.email.split('@')[0], // Use email prefix as name placeholder
            invitation.email,
            invitation.role,
            invitation.department_name || 'Department',
            invitation.sender_name || 'Principal',
            newInvitationToken,
            temporaryPassword
          );
        }

        const emailSent = await emailService.sendEmail(emailOptions);

        if (emailSent) {
          console.log(`✅ Invitation resent successfully to ${invitation.email}`);
        } else {
          console.log(`⚠️ Invitation updated but email failed to send to ${invitation.email}`);
        }

      } catch (emailError) {
        console.error('⚠️ Failed to send resend invitation email:', emailError);
        // Don't fail the resend if email fails - invitation is still updated
      }

      res.status(200).json({
        success: true,
        message: 'Invitation resent successfully',
        data: updatedInvitation,
      });

    } catch (error) {
      console.error('Resend invitation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend invitation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const invitationController = new InvitationController();
