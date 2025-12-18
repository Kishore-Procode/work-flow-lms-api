import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginRequest } from '../../../types';

const authService = new AuthService();

/**
 * User login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, allowedRoles, selectedRole } = req.body;
    const loginData: LoginRequest = { email, password };
    const result = await authService.login(loginData, selectedRole, allowedRoles);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);

    const message = error instanceof Error ? error.message : 'Login failed';
    let statusCode = 500;

    // Determine appropriate status code based on error type
    if (message.includes('No account found') ||
      message.includes('Incorrect password') ||
      message.includes('Invalid email')) {
      statusCode = 401; // Unauthorized - invalid credentials
    } else if (message.includes('pending') ||
      message.includes('suspended') ||
      message.includes('inactive') ||
      message.includes('not active') ||
      message.includes('cannot access') ||
      message.includes('Access denied') ||
      message.includes('restricted to')) {
      statusCode = 403; // Forbidden - account status issue or role restriction
    } else if (message.includes('Too many')) {
      statusCode = 429; // Too many requests
    }

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);

    const message = error instanceof Error ? error.message : 'Failed to change password';
    const statusCode = message.includes('incorrect') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const profile = await authService.getUserProfile(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const updateData = req.body;
    const updatedProfile = await authService.updateProfile(req.user.userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

/**
 * Logout (client-side token invalidation)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      console.log(`User ${req.user.email} logged out at ${new Date().toISOString()}`);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

/**
 * Check authentication status
 */
export const checkAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const profile = await authService.getUserProfile(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Authenticated',
      data: {
        user: profile,
        permissions: {
          role: req.user.role,
          collegeId: req.user.collegeId,
          departmentId: req.user.departmentId,
        },
      },
    });
  } catch (error) {
    console.error('Check auth error:', error);

    res.status(500).json({
      success: false,
      message: 'Authentication check failed',
    });
  }
};
