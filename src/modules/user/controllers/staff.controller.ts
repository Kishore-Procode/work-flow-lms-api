/**
 * Staff Management Controller
 * 
 * Dedicated controller for staff management with role-based access control
 * - Principal: Can manage staff and HOD in their college
 * - HOD: Can manage staff in their department
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { EnhancedUserRepository } from '../repositories/enhanced-user.repository';
import { UserRole } from '../../../types';
import { appLogger } from '../../../utils/logger';

const userRepository = new EnhancedUserRepository();

/**
 * Get staff members with role-based filtering
 */
export const getStaff = async (req: Request, res: Response) => {
  try {
    const requestingUser = req.user as any;
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      status = '',
      departmentId = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔐 STAFF AUTH DEBUG:', {
      user: requestingUser,
      userRole: requestingUser?.role,
      userType: typeof requestingUser?.role,
      hasUser: !!requestingUser,
      allowedRoles: ['principal', 'hod'],
      isAllowed: requestingUser && ['principal', 'hod'].includes(requestingUser.role)
    });

    // Validate requesting user
    if (!requestingUser || !['principal', 'hod'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and HODs can manage staff.',
        debug: {
          userRole: requestingUser?.role,
          allowedRoles: ['principal', 'hod']
        }
      });
    }

    // Build role-based filters
    const filters: any = {
      search: search as string,
      status: status as string,
      collegeId: requestingUser.collegeId, // Always filter by user's college
    };

    // Role-based access control
    if (requestingUser.role === 'principal') {
      // Principal can see staff and HOD in their college
      filters.allowedRoles = ['staff', 'hod'];
      
      // If department filter is specified, apply it
      if (departmentId) {
        filters.departmentId = departmentId as string;
      }
      
      // If role filter is specified, apply it
      if (role && ['staff', 'hod'].includes(role as string)) {
        filters.role = role as string;
      }
    } else if (requestingUser.role === 'hod') {
      // HOD can only see staff in their department
      filters.allowedRoles = ['staff'];
      filters.departmentId = requestingUser.departmentId;
      
      // Force role to be staff for HOD
      filters.role = 'staff';
    }

    console.log('🏢 STAFF FILTER DEBUG:', {
      requestingUser: {
        role: requestingUser.role,
        collegeId: requestingUser.collegeId,
        departmentId: requestingUser.departmentId
      },
      filters,
      query: req.query
    });

    // Get staff with pagination
    const result = await userRepository.findStaffWithFilters(filters, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get staff error:', { 
      userId: req.user?.id, 
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    appLogger.error('Failed to get staff', { 
      error: error.message,
      userId: req.user?.id,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff members'
    });
  }
};

/**
 * Create new staff member
 */
export const createStaff = async (req: Request, res: Response) => {
  try {
    const requestingUser = req.user as any;
    const staffData = req.body;

    // Validate requesting user
    if (!requestingUser || !['principal', 'hod'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and HODs can create staff.'
      });
    }

    // Role-based validation
    if (requestingUser.role === 'hod') {
      // HOD can only create staff in their department
      if (staffData.role !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'HODs can only create staff members, not other HODs.'
        });
      }
      
      // Force department to be HOD's department
      staffData.departmentId = requestingUser.departmentId;
    }

    // Force college to be requesting user's college
    staffData.collegeId = requestingUser.collegeId;

    // Check if email already exists
    if (staffData.email) {
      const existingUser = await userRepository.findByEmail(staffData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered in the system.',
          data: {
            field: 'email',
            value: staffData.email,
            existingUser: {
              id: existingUser.id,
              name: existingUser.name,
              role: existingUser.role,
              status: existingUser.status
            }
          }
        });
      }
    }

    // Check if trying to create HOD and validate department doesn't already have one
    // Only check if department is provided (department is optional for HOD creation)
    if (staffData.role === 'hod' && staffData.departmentId) {
      const existingHOD = await userRepository.findUsersWithFilters({
        role: 'hod',
        departmentId: staffData.departmentId,
        status: 'active'
      }, {
        role: 'admin', // Use admin role to bypass access control for this check
        collegeId: requestingUser.collegeId
      }, {
        page: 1,
        limit: 1
      });

      if (existingHOD.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This department already has an active HOD. Only one HOD is allowed per department.',
          data: {
            existingHOD: {
              id: existingHOD.data[0].id,
              name: existingHOD.data[0].name,
              email: existingHOD.data[0].email
            }
          }
        });
      }
    }

    // Create staff member using enhanced method
    const newStaff = await userRepository.createUserEnhanced({
      ...staffData,
      role: staffData.role,
      status: staffData.status || 'active',
      passwordHash: staffData.passwordHash || await require('../../../utils/auth.utils').hashPassword(staffData.password || 'temp123')
    }, {
      userId: requestingUser.id,
      role: requestingUser.role
    });

    res.status(201).json({
      success: true,
      data: newStaff,
      message: 'Staff member created successfully'
    });

  } catch (error) {
    console.error('Create staff error:', { 
      userId: req.user?.id, 
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    appLogger.error('Failed to create staff', { 
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member'
    });
  }
};

/**
 * Update staff member
 */
export const updateStaff = async (req: Request, res: Response) => {
  try {
    const requestingUser = req.user as any;
    const { id } = req.params;
    const updateData = req.body;

    // Validate requesting user
    if (!requestingUser || !['principal', 'hod'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and HODs can update staff.'
      });
    }

    // Get existing staff member to validate access
    const existingStaff = await userRepository.findById(id);
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Role-based access validation
    if (requestingUser.role === 'hod') {
      // HOD can only update staff in their department
      if (existingStaff.department_id !== requestingUser.departmentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update staff in your department.'
        });
      }
      
      if (existingStaff.role !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update staff members.'
        });
      }
    } else if (requestingUser.role === 'principal') {
      // Principal can update staff and HOD in their college
      if (existingStaff.college_id !== requestingUser.collegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update staff in your college.'
        });
      }
    }

    // Check if email is being updated and if it already exists
    if (updateData.email && updateData.email !== existingStaff.email) {
      const existingUserWithEmail = await userRepository.findByEmail(updateData.email);
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered in the system.',
          data: {
            field: 'email',
            value: updateData.email,
            existingUser: {
              id: existingUserWithEmail.id,
              name: existingUserWithEmail.name,
              role: existingUserWithEmail.role,
              status: existingUserWithEmail.status
            }
          }
        });
      }
    }

    // Check if trying to update role to HOD and validate department doesn't already have one
    if (updateData.role === 'hod' && existingStaff.role !== 'hod') {
      const departmentId = updateData.departmentId || existingStaff.department_id;

      const existingHOD = await userRepository.findUsersWithFilters({
        role: 'hod',
        departmentId: departmentId,
        status: 'active'
      }, {
        role: 'admin', // Use admin role to bypass access control for this check
        collegeId: requestingUser.collegeId
      }, {
        page: 1,
        limit: 1
      });

      if (existingHOD.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This department already has an active HOD. Only one HOD is allowed per department.',
          data: {
            existingHOD: {
              id: existingHOD.data[0].id,
              name: existingHOD.data[0].name,
              email: existingHOD.data[0].email
            }
          }
        });
      }
    }

    // Update staff member using enhanced method
    const updatedStaff = await userRepository.updateUserEnhanced(id, updateData, {
      userId: requestingUser.id,
      role: requestingUser.role
    });

    res.json({
      success: true,
      data: updatedStaff,
      message: 'Staff member updated successfully'
    });

  } catch (error) {
    console.error('Update staff error:', { 
      userId: req.user?.id, 
      staffId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    appLogger.error('Failed to update staff', { 
      error: error.message,
      userId: req.user?.id,
      staffId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member'
    });
  }
};

/**
 * Delete staff member
 */
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const requestingUser = req.user as any;
    const { id } = req.params;

    // Validate requesting user
    if (!requestingUser || !['principal', 'hod'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and HODs can delete staff.'
      });
    }

    // Get existing staff member to validate access
    const existingStaff = await userRepository.findById(id);
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Role-based access validation
    if (requestingUser.role === 'hod') {
      // HOD can only delete staff in their department
      if (existingStaff.department_id !== requestingUser.departmentId || existingStaff.role !== 'staff') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete staff in your department.'
        });
      }
    } else if (requestingUser.role === 'principal') {
      // Principal can delete staff and HOD in their college
      if (existingStaff.college_id !== requestingUser.collegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete staff in your college.'
        });
      }
    }

    // Delete staff member (soft delete)
    await userRepository.delete(id);

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });

  } catch (error) {
    console.error('Delete staff error:', { 
      userId: req.user?.id, 
      staffId: req.params.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    appLogger.error('Failed to delete staff', { 
      error: error.message,
      userId: req.user?.id,
      staffId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member'
    });
  }
};
