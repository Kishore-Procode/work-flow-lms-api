/**
 * Profile Controller
 * 
 * Handles user profile management including fetching, updating,
 * and password changes with real user data.
 * 
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import { Request, Response } from 'express';
import { enhancedUserRepository } from '../../user/repositories/enhanced-user.repository';
import { hashPassword, comparePassword } from '../../../utils/auth.utils';
import { appLogger } from '../../../utils/logger';

/**
 * Get current user profile with complete details
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Get user with complete details
    const user = await enhancedUserRepository.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Get additional details
    let collegeName = '';
    let departmentName = '';
    let hodName = '';

    try {
      // Fetch college name if collegeId exists
      if (user.college_id) {
        const collegeQuery = 'SELECT name FROM colleges WHERE id = $1';
        const collegeResult = await (enhancedUserRepository as any).query(collegeQuery, [user.college_id]);
        if (collegeResult.rows.length > 0) {
          collegeName = collegeResult.rows[0].name;
        }
      }

      // Fetch department name and HOD if departmentId exists
      if (user.department_id) {
        const deptQuery = `
          SELECT d.name, u.name as hod_name 
          FROM departments d 
          LEFT JOIN users u ON d.hod_id = u.id 
          WHERE d.id = $1
        `;
        const deptResult = await (enhancedUserRepository as any).query(deptQuery, [user.department_id]);
        if (deptResult.rows.length > 0) {
          departmentName = (deptResult.rows[0] as any).name;
          hodName = (deptResult.rows[0] as any).hod_name || '';
        }
      }
    } catch (error) {
      appLogger.warn('Failed to fetch additional profile details', {
        userId: user.id,
        error,
      });
    }

    // Remove sensitive data
    const { password_hash, ...userProfile } = user;

    const profileData = {
      ...userProfile,
      collegeName,
      departmentName,
      hodName,
    };

    appLogger.info('Profile retrieved successfully', {
      userId: user.id,
      hasCollege: !!collegeName,
      hasDepartment: !!departmentName,
    });

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profileData,
    });
  } catch (error) {
    appLogger.error('Get profile error', {
      error,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Update current user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { name, phone, class: userClass, semester, profileImageUrl } = req.body;

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long',
        code: 'INVALID_NAME',
      });
      return;
    }

    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
      res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
      });
      return;
    }

    if (profileImageUrl && !/^https?:\/\/.+/.test(profileImageUrl)) {
      res.status(400).json({
        success: false,
        message: 'Invalid profile image URL',
        code: 'INVALID_IMAGE_URL',
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (userClass !== undefined) updateData.class = userClass;
    if (semester !== undefined) updateData.semester = semester;
    if (profileImageUrl !== undefined) updateData.profile_image_url = profileImageUrl;

    // Update user profile
    const updatedUser = await enhancedUserRepository.updateUserEnhanced(
      req.user.userId,
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

    // Remove sensitive data
    const { password_hash, ...userProfile } = updatedUser;

    appLogger.info('Profile updated successfully', {
      userId: req.user.userId,
      updatedFields: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userProfile,
    });
  } catch (error) {
    appLogger.error('Update profile error', {
      error,
      userId: req.user?.userId,
      updateData: req.body,
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
        message: 'Failed to update profile',
        code: 'INTERNAL_ERROR',
      });
    }
  }
};

/**
 * Change user password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        message: 'New passwords do not match',
        code: 'PASSWORD_MISMATCH',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT',
      });
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        code: 'PASSWORD_TOO_WEAK',
      });
      return;
    }

    // Get current user
    const user = await enhancedUserRepository.findById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await enhancedUserRepository.updateUserEnhanced(
      req.user.userId,
      { password_hash: newPasswordHash } as any,
      { userId: req.user.userId, role: req.user.role }
    );

    appLogger.info('Password changed successfully', {
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    appLogger.error('Change password error', {
      error,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      code: 'INTERNAL_ERROR',
    });
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword,
};
