import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { userRepository } from '../repositories/user.repository';
import { enhancedUserRepository, UserFilterOptions } from '../repositories/enhanced-user.repository';
import { UserFilter, UserStatus, UserRole } from '../../../types';
import { hashPassword } from '../../../utils/auth.utils';
import { appLogger } from '../../../utils/logger';

const userService = new UserService();

/**
 * Get all users with enhanced filtering and pagination
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Students can only see themselves
    if (req.user.role === 'student') {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }
console.log('Query:', req.query);
    // Parse and validate filters
    const filters: UserFilterOptions = {
      role: req.query.role as UserRole,
      status: req.query.status as UserStatus,
      collegeId: req.query.collegeId as string,
      departmentId: req.query.departmentId as string,
      search: req.query.search as string,
      emailVerified: req.query.emailVerified === 'true' ? true : req.query.emailVerified === 'false' ? false : undefined,
      hasPhone: req.query.hasPhone === 'true' ? true : req.query.hasPhone === 'false' ? false : undefined,
      hasCollege: req.query.hasCollege === 'true' ? true : req.query.hasCollege === 'false' ? false : undefined,
      hasDepartment: req.query.hasDepartment === 'true' ? true : req.query.hasDepartment === 'false' ? false : undefined,
      unassigned: req.query.unassigned?.toString() === 'true' ? true : undefined, // Only students without assigned resources
    };

    // Parse date filters
    if (req.query.createdAfter) {
      filters.createdAfter = new Date(req.query.createdAfter as string);
    }
    if (req.query.createdBefore) {
      filters.createdBefore = new Date(req.query.createdBefore as string);
    }
    if (req.query.lastLoginAfter) {
      filters.lastLoginAfter = new Date(req.query.lastLoginAfter as string);
    }
    if (req.query.lastLoginBefore) {
      filters.lastLoginBefore = new Date(req.query.lastLoginBefore as string);
    }

    // Parse pagination options
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await enhancedUserRepository.findUsersWithFilters(
      filters,
      {
        role: req.user.role,
        collegeId: req.user.collegeId,
        departmentId: req.user.departmentId,
      },
      options
    );

    appLogger.info('Users retrieved successfully', {
      userId: req.user.userId,
      filtersApplied: Object.keys(filters).filter(key => filters[key] !== undefined).length,
      totalResults: result.pagination.total,
      page: result.pagination.page,
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.data,
      pagination: result.pagination,
      filters: result.filters,
    });
  } catch (error) {
    appLogger.error('Get users error', {
      error,
      userId: req.user?.userId,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { userId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      // Check if user can access this user based on hierarchy
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Principal can access users in their college
      if (req.user.role === 'principal' && req.user.collegeId !== targetUser.college_id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      // HOD/Staff can access users in their department
      if ((req.user.role === 'hod' || req.user.role === 'staff') && 
          req.user.departmentId !== targetUser.department_id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
    });
  }
};

/**
 * Get users with resource assignment details for Student resource Assignment Management
 */
export const getUsersWithresourceAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only allow HOD, Staff, Admin, and Principal
    if (!['hod', 'staff', 'admin', 'principal'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access student resource assignments',
      });
      return;
    }

    // Parse filters from query parameters
    const filters: UserFilterOptions = {
      role: (req.query.role as UserRole) || 'student',
      status: req.query.status as UserStatus,
      departmentId: req.query.departmentId as string,
      courseId: req.query.courseId as string,
      academicYearId: req.query.academicYearId as string,
      section: req.query.section as string,
      assignmentStatus: req.query.assignmentStatus as string,
      search: req.query.search as string,
      unassigned: req.query.unassigned === 'true'
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    });

    // Parse pagination options
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await enhancedUserRepository.findUsersWithresourceAssignments(
      filters,
      {
        role: req.user.role,
        collegeId: req.user.collegeId,
        departmentId: req.user.departmentId,
      },
      options
    );

    appLogger.info('Users with resource assignments retrieved successfully', {
      userId: req.user.userId,
      filtersApplied: Object.keys(filters).filter(key => filters[key] !== undefined).length,
      totalResults: result.pagination.total,
      page: result.pagination.page,
    });

    res.status(200).json({
      success: true,
      message: 'Users with resource assignments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Get users with resource assignments error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users with resource assignments',
    });
  }
};

/**
 * Create new user with enhanced validation
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check permissions - only admin, super_admin, principal, and HOD can create users
    if (!['super_admin', 'admin', 'principal', 'hod','staff'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create users',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    const userData = req.body;

    // Validate required fields
    if (!userData.name || !userData.email || !userData.role) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and role are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
      });
      return;
    }

    // Validate role permissions
    const allowedRoles: UserRole[] = [];
    switch (req.user.role) {
      case 'super_admin':
        allowedRoles.push('admin', 'principal', 'hod', 'staff', 'student');
        break;
      case 'admin':
        allowedRoles.push('principal', 'hod', 'staff', 'student');
        break;
      case 'principal':
        allowedRoles.push('hod', 'staff', 'student');
        break;
      case 'hod':
        allowedRoles.push('staff', 'student');
      case 'staff':
        allowedRoles.push( 'student');
        break;
    }

    if (!allowedRoles.includes(userData.role)) {
      res.status(403).json({
        success: false,
        message: `You cannot create users with role: ${userData.role}`,
        code: 'ROLE_PERMISSION_DENIED',
      });
      return;
    }
    console.log('Creating user with data:', userData);
    // Apply context restrictions
    const createData = { ...userData };
    if (req.user.role === 'principal' && req.user.collegeId) {
      createData.collegeId = req.user.collegeId;
    } else if (['hod', 'staff'].includes(req.user.role) && req.user.departmentId) {
      createData.departmentId = req.user.departmentId;
      createData.collegeId = req.user.collegeId;
    }

    const newUser = await enhancedUserRepository.createUserEnhanced(
      createData,
      { userId: req.user.userId, role: req.user.role }
    );

    const { password_hash, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    appLogger.error('Create user error', {
      error,
      userId: req.user?.userId,
      userData: { ...req.body, password: '[REDACTED]' },
    });

    if (error.message === 'Email already exists') {
      res.status(400).json({
        success: false,
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        code: 'INTERNAL_ERROR',
      });
    }
  }
};

/**
 * Update user with enhanced validation and permissions
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { userId } = req.params;
    const updateData = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Enhanced permission checking
    let canUpdate = false;
    const isSelfUpdate = req.user.userId === userId;

    switch (req.user.role) {
      case 'super_admin':
      case 'admin':
        canUpdate = true;
        break;
      case 'principal':
        canUpdate = existingUser.college_id === req.user.collegeId || isSelfUpdate;
        break;
      case 'hod':
        canUpdate = existingUser.department_id === req.user.departmentId || isSelfUpdate;
        break;
      case 'staff':
      case 'student':
        canUpdate = isSelfUpdate;
        break;
    }

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update this user',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Validate email format if being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
        });
        return;
      }
    }

    const updatedUser = await enhancedUserRepository.updateUserEnhanced(
      userId,
      updateData,
      { userId: req.user.userId, role: req.user.role }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    appLogger.error('Update user error', {
      error,
      userId: req.params.userId,
      updatedBy: req.user?.userId,
    });

    if (error.message === 'Email already exists') {
      res.status(400).json({
        success: false,
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        code: 'INTERNAL_ERROR',
      });
    }
  }
};

/**
 * Delete user with enhanced validation and cascade handling
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { userId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
      });
      return;
    }

    // Only super_admin and admin can delete users
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete users',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Prevent deleting yourself
    if (req.user.userId === userId) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF',
      });
      return;
    }

    // Use soft delete to preserve data integrity
    const deleted = await enhancedUserRepository.softDelete(userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'User not found or already deleted',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    appLogger.info('User soft deleted successfully', {
      deletedUserId: userId,
      deletedUserEmail: existingUser.email,
      deletedBy: req.user.userId,
      deletedByRole: req.user.role,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    appLogger.error('Delete user error', {
      error,
      userId: req.params.userId,
      deletedBy: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin and principal can view statistics
    if (!['admin', 'principal'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    const statistics = await userRepository.getStatistics();

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: statistics,
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
    });
  }
};
