import { Request, Response } from 'express';
import { CollegeRepository, collegeRepository } from '../repositories/college.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { transformCollege, transformPaginatedResult } from '../../../utils/data.utils';
import { success } from 'zod';

/**
 * Get all colleges (public endpoint for registration)
 */
export const getCollegesPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get only active colleges for dropdown use
    const colleges = await collegeRepository.findActiveColleges();
    const transformedColleges = colleges.map(transformCollege);

    res.status(200).json({
      success: true,
      message: 'Active colleges retrieved successfully',
      data: transformedColleges,
    });
  } catch (error) {
    console.error('Get colleges public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve colleges',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all colleges with pagination and filtering
 */
export const getColleges = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const options = req.query;
    
    // Apply role-based filtering
    if (req.user.role === 'principal' && req.user.collegeId) {
      // Principal can only see their own college
      const college = await collegeRepository.findByIdWithPrincipal(req.user.collegeId);
      if (!college) {
        res.status(404).json({
          success: false,
          message: 'College not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'College retrieved successfully',
        data: [transformCollege(college)],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      });
      return;
    }

    // Admin can see all colleges
    const result = await collegeRepository.findAllWithPrincipal(options);
    const transformedResult = transformPaginatedResult(result, transformCollege);
    console.log('transformedResult', transformedResult);

    res.status(200).json({
      success: true,
      message: 'Colleges retrieved successfully',
      data: transformedResult.data,
      pagination: transformedResult.pagination,
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve colleges',
    });
  }
};

/**
 * Get college by ID
 */
export const getCollegeById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { collegeId } = req.params;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.collegeId !== collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this college',
      });
      return;
    }

    const college = await collegeRepository.findByIdWithPrincipal(collegeId);
    if (!college) {
      res.status(404).json({
        success: false,
        message: 'College not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'College retrieved successfully',
      data: college,
    });
  } catch (error) {
    console.error('Get college by ID error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve college',
    });
  }
};

/**
 * Create new college
 */
export const createCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can create colleges
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can create colleges',
      });
      return;
    }

    const { principalName, principalEmail, principalPhone, ...collegeData } = req.body;

    // Check if email already exists
    const existingCollege = await collegeRepository.findByEmail(collegeData.email);
    if (existingCollege) {
      res.status(400).json({
        success: false,
        message: 'College email already exists',
      });
      return;
    }

    let principalId = null;

    // Create principal if principal details are provided
    if (principalName && principalEmail) {
      // Check if principal email already exists
      const existingPrincipal = await userRepository.findByEmail(principalEmail);
      if (existingPrincipal) {
        principalId = existingPrincipal.id;
      } else {
        try {
          // Import password hashing utility
          const { hashPassword } = require('../../../utils/auth.utils');

          // Hash the temporary password
          const tempPassword = 'TempPassword@123';
          const passwordHash = await hashPassword(tempPassword);

          // Create principal user
          const principalData = {
            name: principalName,
            email: principalEmail,
            phone: principalPhone || null,
            role: 'principal' as const,
            passwordHash: passwordHash,
            status: 'pending' as const
          };

          const newPrincipal = await userRepository.createUser(principalData);
          principalId = newPrincipal.id;
        } catch (principalError) {
          console.error(`Failed to create principal:`, principalError.message);
        }
      }
    }

    // Validate existing principal if principalId is provided
    if (collegeData.principalId) {
      const principal = await userRepository.findById(collegeData.principalId);
      if (!principal) {
        res.status(400).json({
          success: false,
          message: 'Principal not found',
        });
        return;
      }

      if (principal.role !== 'principal') {
        res.status(400).json({
          success: false,
          message: 'User is not a principal',
        });
        return;
      }

      // Check if principal is already assigned to another college
      const existingAssignment = await collegeRepository.findByPrincipalId(collegeData.principalId);
      if (existingAssignment) {
        res.status(400).json({
          success: false,
          message: 'Principal is already assigned to another college',
        });
        return;
      }
      principalId = collegeData.principalId;
    }

    // Create college with principal assignment
    const finalCollegeData = {
      ...collegeData,
      principalId
    };

    const newCollege = await collegeRepository.createCollege(finalCollegeData);

    // Update principal's college assignment if principal was created or assigned
    if (principalId) {
      await userRepository.updateUser(principalId, {
        collegeId: newCollege.id,
      });

      // Send invitation email to principal if newly created
      if (principalName && principalEmail) {
        try {
          const invitationRepository = require('../../invitation/repositories/invitation.repository').invitationRepository;
          const { emailService } = require('../../../utils/email.service');

          // Create invitation with proper expiration
          const invitationToken = require('crypto').randomBytes(32).toString('hex');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

          const invitation = await invitationRepository.createInvitation({
            email: principalEmail,
            role: 'principal',
            sentBy: req.user.id,
            collegeId: newCollege.id,
            departmentId: null,
            invitationToken: invitationToken,
            expiresAt: expiresAt,
            status: 'pending'
          });

          // Generate and send invitation email with temporary password
          const temporaryPassword = 'TempPassword@123'; // Same as used in user creation
          const emailOptions = emailService.generatePrincipalInvitationEmail(
            principalName,
            principalEmail,
            newCollege.name,
            invitation.invitationToken,
            temporaryPassword
          );

          const emailSent = await emailService.sendEmail(emailOptions);

          if (emailSent) {
            console.log(`✅ Principal invitation email sent successfully to ${principalEmail}`);
          } else {
            console.log(`❌ Failed to send principal invitation email to ${principalEmail}`);
          }

        } catch (emailError) {
          console.error('❌ Failed to send principal invitation:', emailError);
          // Don't fail the college creation if email fails
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'College created successfully',
      data: newCollege,
    });
  } catch (error) {
    console.error('Create college error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create college',
    });
  }
};

/**
 * Update college
 */
export const updateCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { collegeId } = req.params;
    const updateData = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.collegeId !== collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied to update this college',
      });
      return;
    }

    // Principal can only update limited fields
    if (req.user.role === 'principal') {
      const allowedFields = ['name', 'address', 'phone', 'website'];
      const updateFields = Object.keys(updateData);
      const hasUnallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasUnallowedFields) {
        res.status(403).json({
          success: false,
          message: 'Principals can only update name, address, phone, and website',
        });
        return;
      }
    }

    // Check if email is being changed and if it already exists
    if (updateData.email) {
      const existingCollege = await collegeRepository.findByEmail(updateData.email);
      if (existingCollege && existingCollege.id !== collegeId) {
        res.status(400).json({
          success: false,
          message: 'College email already exists',
        });
        return;
      }
    }

    const updatedCollege = await collegeRepository.updateCollege(collegeId, updateData);
    if (!updatedCollege) {
      res.status(404).json({
        success: false,
        message: 'College not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'College updated successfully',
      data: updatedCollege,
    });
  } catch (error) {
    console.error('Update college error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update college',
    });
  }
};

/**
 * Delete college
 */
export const deleteCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can delete colleges
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete colleges',
      });
      return;
    }

    const { collegeId } = req.params;

    const deleted = await collegeRepository.delete(collegeId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'College not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'College deleted successfully',
    });
  } catch (error) {
    console.error('Delete college error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete college',
    });
  }
};

/**
 * Get college statistics
 */
export const getCollegeStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can view all statistics
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can view college statistics',
      });
      return;
    }

    const statistics = await collegeRepository.getStatistics();

    res.status(200).json({
      success: true,
      message: 'College statistics retrieved successfully',
      data: statistics,
    });
  } catch (error) {
    console.error('Get college statistics error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve college statistics',
    });
  }
};

/**
 * Public college registration (no authentication required)
 */
export const registerCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeAddress,
      collegeCity,
      collegeState,
      collegePincode,
      collegeEmail,
      collegePhone,
      collegeWebsite,
      establishedYear,
      pocName,
      pocEmail,
      pocPhone,
      pocDesignation,
      principalName,
      principalEmail,
      principalPhone,
      totalStudents,
      totalFaculty,
      collegeType,
      affiliatedUniversity
    } = req.body;

    // Check if college email already exists
    const existingCollege = await collegeRepository.findByEmail(collegeEmail);
    if (existingCollege) {
      res.status(400).json({
        success: false,
        message: 'A college with this email address is already registered',
      });
      return;
    }

    // Check if college code already exists
    const existingCollegeByCode = await collegeRepository.findByCode(collegeCode);
    if (existingCollegeByCode) {
      res.status(400).json({
        success: false,
        message: 'A college with this code is already registered',
      });
      return;
    }

    // Create the college with pending status
    const collegeData = {
      name: collegeName,
      code: collegeCode.toUpperCase(), // Store college code in uppercase
      address: collegeAddress,
      phone: collegePhone,
      email: collegeEmail,
      website: collegeWebsite || undefined,
      established: establishedYear,
      status: 'active' as const, // Set status to active for now
      // POC (Point of Contact) information - required
      poc_name: pocName,
      poc_email: pocEmail,
      poc_phone: pocPhone,
      poc_designation: pocDesignation || undefined,
      // Principal information - optional
      principal_name: principalName || undefined,
      principal_email: principalEmail || undefined,
      principal_phone: principalPhone || undefined,
      total_students: parseInt(totalStudents) || null,
      total_faculty: parseInt(totalFaculty) || null,
      college_type: collegeType,
      affiliated_university: affiliatedUniversity || undefined,
      city: collegeCity,
      state: collegeState,
      pincode: collegePincode
    };

    const newCollege = await collegeRepository.create(collegeData);

    // TODO: Send notification email to admin about new college registration
    console.log(`📧 New college registration: ${collegeName} - Admin notification needed`);
    console.log("new college",newCollege);
    

    res.status(201).json({
      success: true,
      message: 'College registration submitted successfully! We will review your application and contact you within 2-3 business days.',
      data: {
        id: newCollege.id,
        name: newCollege.name,
        email: newCollege.email,
        status: newCollege.status,
        submittedAt: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error('College registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit college registration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const state=async(req: Request, res: Response): Promise<void>=>{
  const data  = await collegeRepository.getstate()

  res.status(200).json({
    success:true,
    message:"state Data Retrived Successfully",
    data
  })

}

export const district=async(req:Request,res:Response): Promise<void>=>{
  const data = await collegeRepository.getDistricts()

   res.status(200).json({
    success:true,
    message:"state Data Retrived Successfully",
    data
  })
}




