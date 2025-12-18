import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { registrationRequestRepository } from '../repositories/registration-request.repository';
import { approvalWorkflowRepository } from '../../approval/repositories/approval-workflow.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { emailService } from '../../../utils/email.service';
import { academicYearRepository } from '../../academic-year/repositories/academic-year.repository';

// Utility function to convert snake_case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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

export class RegistrationController {
  /**
   * Get registration requests based on user role and approval workflow
   */
  async getRegistrationRequests(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      let registrationRequests: any[] = [];
      let query = '';
      let queryParams: any[] = [];

      // Admin can see all requests
      if (req.user.role === 'admin') {
        query = `
          SELECT
            rr.*,
            c.name as college_name,
            d.name as department_name,
            u.name as reviewed_by_name
          FROM registration_requests rr
          LEFT JOIN colleges c ON rr.college_id = c.id
          LEFT JOIN departments d ON rr.department_id = d.id
          LEFT JOIN users u ON rr.reviewed_by = u.id
          ORDER BY rr.requested_at DESC
        `;
      }
      // Principal can see requests for their college (HOD and Staff requests)
      else if (req.user.role === 'principal') {
        query = `
          SELECT
            rr.*,
            c.name as college_name,
            d.name as department_name,
            u.name as reviewed_by_name
          FROM registration_requests rr
          LEFT JOIN colleges c ON rr.college_id = c.id
          LEFT JOIN departments d ON rr.department_id = d.id
          LEFT JOIN users u ON rr.reviewed_by = u.id
          WHERE rr.college_id = $1 
            AND rr.role IN ('hod', 'staff')
            AND rr.status = 'pending'
          ORDER BY rr.requested_at DESC
        `;
        queryParams = [req.user.collegeId];
      }
      // HOD can see requests for their department (Staff and Student requests)
      else if (req.user.role === 'hod') {
        query = `
          SELECT
            rr.*,
            c.name as college_name,
            d.name as department_name,
            u.name as reviewed_by_name
          FROM registration_requests rr
          LEFT JOIN colleges c ON rr.college_id = c.id
          LEFT JOIN departments d ON rr.department_id = d.id
          LEFT JOIN users u ON rr.reviewed_by = u.id
          WHERE rr.department_id = $1 
            AND rr.role IN ('staff', 'student')
            AND rr.status = 'pending'
          ORDER BY rr.requested_at DESC
        `;
        queryParams = [req.user.departmentId];
      }
      // Staff can see student requests for their department
      else if (req.user.role === 'staff') {
        query = `
          SELECT
            rr.*,
            c.name as college_name,
            d.name as department_name,
            u.name as reviewed_by_name
          FROM registration_requests rr
          LEFT JOIN colleges c ON rr.college_id = c.id
          LEFT JOIN departments d ON rr.department_id = d.id
          LEFT JOIN users u ON rr.reviewed_by = u.id
          WHERE rr.department_id = $1 
            AND rr.role = 'student'
            AND rr.status = 'pending'
          ORDER BY rr.requested_at DESC
        `;
        queryParams = [req.user.departmentId];
      }
      // Students cannot see registration requests
      else {
        res.status(403).json({
          success: false,
          message: 'Students are not authorized to view registration requests',
        });
        return;
      }

      const result = await pool.query(query, queryParams);
      registrationRequests = result.rows;

      res.status(200).json({
        success: true,
        message: 'Registration requests retrieved successfully',
        data: convertKeysToCamelCase(registrationRequests),
        pagination: {
          page: 1,
          limit: 50,
          total: registrationRequests.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      console.error('Get registration requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve registration requests',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate email uniqueness across users, registration requests, and invitations
   */
  private async validateEmailUniqueness(email: string): Promise<{ isValid: boolean; message: string }> {
    try {
      // Check existing users
      const existingUserQuery = 'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)';
      const existingUserResult = await pool.query(existingUserQuery, [email]);

      if (existingUserResult.rows.length > 0) {
        return {
          isValid: false,
          message: 'An account with this email address already exists. Please use a different email or try logging in.',
        };
      }

      // Check pending registration requests
      const pendingRequestQuery = `
        SELECT id, email, status FROM registration_requests
        WHERE LOWER(email) = LOWER($1) AND status IN ('pending', 'approved')
      `;
      const pendingRequestResult = await pool.query(pendingRequestQuery, [email]);

      if (pendingRequestResult.rows.length > 0) {
        const request = pendingRequestResult.rows[0];
        return {
          isValid: false,
          message:
            request.status === 'pending'
              ? 'A registration request with this email is already pending approval. Please wait for approval or contact your administrator.'
              : 'A registration request with this email has been approved but account creation is in progress. Please try logging in or contact support.',
        };
      }

      // Check pending invitations
      const pendingInvitationQuery = `
        SELECT id, email, status FROM invitations
        WHERE LOWER(email) = LOWER($1) AND status IN ('pending', 'sent')
      `;
      const pendingInvitationResult = await pool.query(pendingInvitationQuery, [email]);

      if (pendingInvitationResult.rows.length > 0) {
        return {
          isValid: false,
          message:
            'An invitation has already been sent to this email address. Please check your email for the invitation link or contact your administrator.',
        };
      }

      return { isValid: true, message: 'Email is available' };
    } catch (error) {
      console.error('Email validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate email address. Please try again later.',
      };
    }
  }

  /**
   * Create registration request
   */
  async createRegistrationRequest(req: Request, res: Response): Promise<void> {
    try {
      const {
        email,
        name,
        role,
        phone,
        collegeId,
        departmentId,
        class: studentClass,
        rollNumber,
        semester,
        batchYear,
        yearOfStudy,
        addressLine1,
        addressLine2,
        city,
        state,
        district,
        pincode,
        aadharNumber,
        dateOfBirth,
        spocName,
        spocEmail,
        spocPhone,
        // New academic structure fields
        courseId,
        academicYearId,
        sectionId,
        // Password field for account creation
        password,
      } = req.body;

      // Email validation - check for duplicates
      // const emailValidationResult = await this.validateEmailUniqueness(email);
      // if (!emailValidationResult.isValid) {
      //   res.status(400).json({
      //     success: false,
      //     message: emailValidationResult.message,
      //     error: 'DUPLICATE_EMAIL'
      //   });
      //   return;
      // }

      // Validate required fields
      if (!email || !name || !role) {
        res.status(400).json({
          success: false,
          message: 'Email, name, and role are required',
        });
        return;
      }

      // Debug logging
      console.log('Registration request body:', {
        email,
        name,
        role,
        password: password ? `[${password.length} chars]` : 'undefined',
        hasPassword: !!password,
      });

      // Validate password for account creation
      if (!password || password.length < 8) {
        console.log('Password validation failed:', {
          password: password ? `[${password.length} chars]` : 'undefined',
          hasPassword: !!password,
        });
        res.status(400).json({
          success: false,
          message: 'Password is required and must be at least 8 characters long',
        });
        return;
      }

      // Additional validation for students
      if (role === 'student') {
        if (!collegeId || !departmentId) {
          res.status(400).json({
            success: false,
            message: 'College and department are required for student registration',
          });
          return;
        }
      }

      // Additional validation for staff and HODs
      if ((role === 'staff' || role === 'hod') && (!collegeId || !departmentId)) {
        res.status(400).json({
          success: false,
          message: 'College and department are required for staff/HOD registration',
        });
        return;
      }

      // Additional validation for principals
      if (role === 'principal' && !collegeId) {
        res.status(400).json({
          success: false,
          message: 'College is required for principal registration',
        });
        return;
      }

      // Additional validation for principals
      if (role === 'principal' && !collegeId) {
        res.status(400).json({
          success: false,
          message: 'College is required for principal registration',
        });
        return;
      }

      // Check if email already exists in pending requests
      const emailExists = await registrationRequestRepository.emailExists(email);
      if (emailExists) {
        res.status(400).json({
          success: false,
          message: 'A pending registration request already exists for this email',
        });
        return;
      }

      // Hash password for secure storage
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('🔐 Password hashing debug:', {
        originalPassword: password ? `[${password.length} chars]` : 'undefined',
        hashedPassword: hashedPassword
          ? `[${hashedPassword.length} chars] ${hashedPassword.substring(0, 20)}...`
          : 'undefined',
      });

      const academicyear = await academicYearRepository.findByYearNameAndCourse(yearOfStudy, courseId);
      // console.log(academicyear?.id,'bdsyvu');

      // Create registration request with password and new academic structure fields
      const registrationRequestData = {
        name,
        email,
        phone,
        role,
        collegeId,
        departmentId: role === 'principal' ? null : departmentId,
        class: studentClass,
        rollNumber,
        semester,
        batchYear,
        yearOfStudy,
        addressLine1,
        addressLine2,
        city,
        state,
        district,
        pincode,
        aadharNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        spocName,
        spocEmail,
        spocPhone,
        // New academic structure fields
        courseId,
        academicYearId : academicyear?.id || null,
        sectionId,
        // Store hashed password for account creation upon approval
        passwordHash: hashedPassword,
      };

      console.log('🔍 Controller debug - data being sent to repository:', {
        email: registrationRequestData.email,
        name: registrationRequestData.name,
        passwordHash: registrationRequestData.passwordHash
          ? `[${registrationRequestData.passwordHash.length} chars] ${registrationRequestData.passwordHash.substring(0, 20)}...`
          : 'undefined',
      });

      // Additional validation for principal role
      if (role === 'principal') {
        // Check if college already has an active principal
        const existingPrincipalQuery = 'SELECT id, principal_id FROM colleges WHERE id = $1';
        const existingPrincipalResult = await pool.query(existingPrincipalQuery, [collegeId]);

        if (existingPrincipalResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            message: 'College not found',
          });
          return;
        }

        const college = existingPrincipalResult.rows[0];
        if (college.principal_id) {
          // Check if the existing principal is still active
          const activePrincipalQuery = 'SELECT id, name, email FROM users WHERE id = $1 AND status = $2';
          const activePrincipalResult = await pool.query(activePrincipalQuery, [college.principal_id, 'active']);

          if (activePrincipalResult.rows.length > 0) {
            const existingPrincipal = activePrincipalResult.rows[0];
            res.status(400).json({
              success: false,
              message: `This college already has an active principal: ${existingPrincipal.name} (${existingPrincipal.email}). Only one principal is allowed per college.`,
            });
            return;
          }
        }

        // Check if there's already a pending principal registration for this college
        const pendingPrincipalQuery = `
          SELECT id, name, email FROM registration_requests
          WHERE college_id = $1 AND role = 'principal' AND status = 'pending'
        `;
        const pendingPrincipalResult = await pool.query(pendingPrincipalQuery, [collegeId]);

        if (pendingPrincipalResult.rows.length > 0) {
          const pendingPrincipal = pendingPrincipalResult.rows[0];
          res.status(400).json({
            success: false,
            message: `There is already a pending principal registration for this college from ${pendingPrincipal.name} (${pendingPrincipal.email}). Please wait for it to be processed or contact the administrator.`,
          });
          return;
        }
      }

      const registrationRequest =
        await registrationRequestRepository.createRegistrationRequest(registrationRequestData);

      // Determine first approver based on role
      const getFirstApproverRole = (requestedRole: string): string => {
        switch (requestedRole) {
          case 'student':
            return 'staff';
          case 'staff':
            return 'hod';
          case 'hod':
            return 'principal';
          case 'principal':
            return 'admin';
          default:
            return 'admin';
        }
      };

      // Create approval workflow
      const firstApproverRole = getFirstApproverRole(role);

      // Get specific approver for the role
      const getApproverForRole = async (approverRole: string, requestId: string): Promise<string | undefined> => {
        const requestQuery = 'SELECT * FROM registration_requests WHERE id = $1';
        const requestResult = await pool.query(requestQuery, [requestId]);
        const request = requestResult.rows[0];

        if (!request) return undefined;

        let approverQuery = '';
        const values: any[] = [];

        switch (approverRole) {
          case 'staff':
            // For student requests, find staff who is class in charge of the student's class
            if (request.role === 'student' && request.class) {
              // First try to find staff with matching class_in_charge
              approverQuery = `
                SELECT id FROM users
                WHERE role = 'staff'
                AND department_id = $1
                AND class_in_charge = $2
                AND status = 'active'
                LIMIT 1
              `;
              values.push(request.department_id, request.class);

              const classStaffResult = await pool.query(approverQuery, values);
              if (classStaffResult.rows.length > 0) {
                return classStaffResult.rows[0].id;
              }

              // Fallback: Find any staff in the same department
              console.log(
                `⚠️  No class in charge found for class ${request.class}, assigning to any staff in department`
              );
              approverQuery = `
                SELECT id FROM users
                WHERE role = 'staff' AND department_id = $1 AND status = 'active'
                LIMIT 1
              `;
              values.length = 0;
              values.push(request.department_id);
            } else {
              // For other requests, find any staff in the same department
              approverQuery = `
                SELECT id FROM users
                WHERE role = 'staff' AND department_id = $1 AND status = 'active'
                LIMIT 1
              `;
              values.push(request.department_id);
            }
            break;

          case 'hod':
            // Find HOD of the department
            approverQuery = `
              SELECT id FROM users
              WHERE role = 'hod' AND department_id = $1 AND status = 'active'
              LIMIT 1
            `;
            values.push(request.department_id);
            break;

          case 'principal':
            // Find principal of the college
            approverQuery = `
              SELECT id FROM users
              WHERE role = 'principal' AND college_id = $1 AND status = 'active'
              LIMIT 1
            `;
            values.push(request.college_id);
            break;

          case 'admin':
            // Find any admin
            approverQuery = `
              SELECT id FROM users
              WHERE role = 'admin' AND status = 'active'
              LIMIT 1
            `;
            break;

          default:
            return undefined;
        }

        const approverResult = await pool.query(approverQuery, values);
        return approverResult.rows[0]?.id;
      };

      const firstApproverId = await getApproverForRole(firstApproverRole, registrationRequest.id);

      await approvalWorkflowRepository.createWorkflow({
        requestType: `${role}_registration` as any,
        requestId: registrationRequest.id,
        currentApproverRole: firstApproverRole,
        currentApproverId: firstApproverId,
      });

      // Send initial approval notification email to the first approver
      if (firstApproverId) {
        try {
          const firstApprover = await userRepository.findById(firstApproverId);
          if (firstApprover) {
            const emailOptions = emailService.generateApprovalNotificationEmail(
              firstApprover.name,
              firstApprover.email,
              registrationRequest.name,
              registrationRequest.role,
              registrationRequest.id
            );

            await emailService.sendEmail(emailOptions);
            console.log('✅ Initial approval notification sent to:', firstApprover.email);
          }
        } catch (emailError) {
          console.error('⚠️  Failed to send initial approval notification:', emailError);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Registration request created successfully and sent for approval',
        data: convertKeysToCamelCase(registrationRequest),
      });
    } catch (error) {
      console.error('Create registration request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create registration request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Approve registration request and create user account
   */
  async approveRegistrationRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reviewed_by = (req as any).user.id;

      // Get the registration request details
      const getRequestQuery = `
        SELECT * FROM registration_requests WHERE id = $1 AND status = 'pending'
      `;
      const requestResult = await pool.query(getRequestQuery, [id]);

      if (requestResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Registration request not found or already processed',
        });
        return;
      }

      const registrationRequest = requestResult.rows[0];

      // Check if user already exists
      const existingUserQuery = `SELECT id FROM users WHERE email = $1`;
      const existingUserResult = await pool.query(existingUserQuery, [registrationRequest.email]);

      if (existingUserResult.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // Special validation for principal role
      if (registrationRequest.role === 'principal') {
        // Check if the college already has a principal
        const existingPrincipalQuery = 'SELECT id, principal_id FROM colleges WHERE id = $1';
        const existingPrincipalResult = await pool.query(existingPrincipalQuery, [registrationRequest.college_id]);

        if (existingPrincipalResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            message: 'College not found',
          });
          return;
        }

        const college = existingPrincipalResult.rows[0];
        if (college.principal_id) {
          // Check if the existing principal is still active
          const activePrincipalQuery = 'SELECT id, name, email FROM users WHERE id = $1 AND status = $2';
          const activePrincipalResult = await pool.query(activePrincipalQuery, [college.principal_id, 'active']);

          if (activePrincipalResult.rows.length > 0) {
            const existingPrincipal = activePrincipalResult.rows[0];
            res.status(400).json({
              success: false,
              message: `This college already has an active principal: ${existingPrincipal.name} (${existingPrincipal.email}). Only one principal is allowed per college.`,
            });
            return;
          }
        }
      }

      // Create user account with the password they provided during registration
      const createUserQuery = `
        INSERT INTO users (
          email, password_hash, name, role, phone, status, college_id, department_id,
          course_id, section_id, academic_year_id, year_of_study, semester,
          class, roll_number, email_verified, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, $13, $14, true, CURRENT_TIMESTAMP)
        RETURNING id, email, name, role
      `;

      const userValues = [
        registrationRequest.email,
        registrationRequest.password_hash, // Use the password they provided during registration
        registrationRequest.name,
        registrationRequest.role,
        registrationRequest.phone,
        registrationRequest.college_id,
        registrationRequest.department_id,
        registrationRequest.course_id,
        registrationRequest.section_id,
        registrationRequest.academic_year_id,
        registrationRequest.year_of_study,
        registrationRequest.semester,
        registrationRequest.class,
        registrationRequest.roll_number,
      ];

      const userResult = await pool.query(createUserQuery, userValues);
      const newUser = userResult.rows[0];

      console.log('✅ User account created successfully:', {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      });

      // Update registration request status
      const updateRequestQuery = `
        UPDATE registration_requests
        SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(updateRequestQuery, [reviewed_by, id]);

      // If the approved user is a principal, update the college's principal_id
      if (registrationRequest.role === 'principal') {
        try {
          const updateCollegePrincipalQuery = `
            UPDATE colleges
            SET principal_id = $1, updated_at = NOW()
            WHERE id = $2
          `;
          await pool.query(updateCollegePrincipalQuery, [newUser.id, registrationRequest.college_id]);
          console.log('✅ College principal_id updated successfully for college:', registrationRequest.college_id);
        } catch (updateError) {
          console.error('⚠️  Failed to update college principal_id:', updateError);
          // Log the error but don't fail the approval process
        }
      }

      // Send approval notification email with login credentials
      try {
        // Send approval notification email (without password for security)
        const approvalEmailOptions = emailService.generateApprovalAcceptanceEmail(
          registrationRequest.name,
          registrationRequest.email,
          registrationRequest.role,
          newUser.email
        );

        await emailService.sendEmail(approvalEmailOptions);
        console.log('✅ Approval notification email sent to:', registrationRequest.email);
      } catch (emailError) {
        console.error('⚠️  Failed to send approval notification email:', emailError);
        // Don't fail the approval if email fails, but log it
      }

      res.status(200).json({
        success: true,
        message: 'Registration request approved and user account created successfully. Welcome email sent.',
        data: {
          registrationRequest: convertKeysToCamelCase(result.rows[0]),
          user: convertKeysToCamelCase(newUser),
        },
      });
    } catch (error) {
      console.error('Approve registration request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve registration request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reject registration request
   */
  async rejectRegistrationRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const reviewed_by = (req as any).user.id;

      const query = `
        UPDATE registration_requests
        SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await pool.query(query, [reviewed_by, rejection_reason, id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Registration request not found',
        });
        return;
      }

      const rejectedRequest = result.rows[0];

      // Send rejection notification email
      try {
        const emailOptions = emailService.generateRejectionEmail(
          rejectedRequest.name,
          rejectedRequest.email,
          rejection_reason || 'No specific reason provided',
          rejectedRequest.role
        );

        await emailService.sendEmail(emailOptions);
        console.log('✅ Rejection email sent to:', rejectedRequest.email);
      } catch (emailError) {
        console.error('⚠️  Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails, but log it
      }

      res.status(200).json({
        success: true,
        message: 'Registration request rejected successfully. Notification email sent.',
        data: convertKeysToCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Reject registration request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject registration request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete registration request
   */
  async deleteRegistrationRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = 'DELETE FROM registration_requests WHERE id = $1';
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Registration request not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Registration request deleted successfully',
      });
    } catch (error) {
      console.error('Delete registration request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete registration request',
      });
    }
  }

  /**
   * Get academic years by course (for registration form)
   */
  async getAcademicYearsByCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
        return;
      }

      const query = `
        SELECT
          id,
          course_id,
          year_number,
          year_name,
          is_active,
          created_at,
          updated_at
        FROM academic_years
        WHERE course_id = $1 AND is_active = true
        ORDER BY year_number ASC
      `;

      const result = await pool.query(query, [courseId]);
      const academicYears = result.rows;

      res.json({
        success: true,
        data: convertKeysToCamelCase(academicYears),
        message: 'Academic years retrieved successfully',
        count: academicYears.length,
      });
    } catch (error) {
      console.error('Error fetching academic years by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch academic years',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sections by course, department and year (for registration form)
   */
  async getSectionsByCourseDepYear(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, departmentId, yearId } = req.params;

      if (!courseId || !departmentId || !yearId) {
        res.status(400).json({
          success: false,
          message: 'Course ID, Department ID, and Year ID are required',
        });
        return;
      }

      const query = `
        SELECT
          s.id,
          s.name,
          s.course_id,
          s.department_id,
          s.academic_year_id,
          s.max_students,
          s.current_students,
          s.status,
          s.academic_session,
          s.created_at,
          s.updated_at,
          c.name as course_name,
          c.code as course_code,
          d.name as department_name,
          d.code as department_code,
          ay.year_name,
          ay.year_number
        FROM sections s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE s.course_id = $1
          AND s.department_id = $2
          AND s.academic_year_id = $3
          AND s.status = 'active'
          AND c.is_active = true
        ORDER BY s.name ASC
      `;

      const result = await pool.query(query, [courseId, departmentId, yearId]);
      const sections = result.rows;

      res.json({
        success: true,
        data: convertKeysToCamelCase(sections),
        message: 'Sections retrieved successfully',
        count: sections.length,
      });
    } catch (error) {
      console.error('Error fetching sections by course, department and year:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sections',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const registrationController = new RegistrationController();
