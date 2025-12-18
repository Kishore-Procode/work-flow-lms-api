/**
 * Enhanced Authentication Middleware
 * 
 * Comprehensive authentication and authorization middleware with enterprise-level
 * security features including role hierarchy, session management, and audit logging.
 * 
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/auth.utils';
import { userRepository } from '../modules/user/repositories/user.repository';
import { appLogger } from '../utils/logger';
import { UserRole } from '../types';

// Role hierarchy definition
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'super_admin': 100,
  'admin': 80,
  'principal': 60,
  'hod': 40,
  'staff': 20,
  'student': 10,
};

// Session tracking for security
const activeSessions = new Map<string, { userId: string; lastActivity: Date; ipAddress: string }>();

/**
 * Enhanced authentication middleware with session tracking
 */
export const enhancedAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!token) {
      appLogger.warn('Authentication attempt without token', {
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        path: req.path,
      });
      
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED',
      });
      return;
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      appLogger.warn('Invalid token attempt', {
        ip: clientIP,
        error: error.message,
        path: req.path,
      });
      
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
      return;
    }
    
    // Check if user still exists and is active
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      appLogger.warn('Token for non-existent user', {
        userId: decoded.userId,
        ip: clientIP,
      });
      
      res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (user.status !== 'active') {
      appLogger.warn('Inactive user login attempt', {
        userId: user.id,
        status: user.status,
        ip: clientIP,
      });
      
      res.status(401).json({
        success: false,
        message: 'User account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
      return;
    }

    // Session management
    const sessionKey = `${user.id}-${token.slice(-10)}`;
    const existingSession = activeSessions.get(sessionKey);
    
    if (existingSession) {
      // Check for session timeout (24 hours)
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - existingSession.lastActivity.getTime() > sessionTimeout) {
        activeSessions.delete(sessionKey);
        
        res.status(401).json({
          success: false,
          message: 'Session expired',
          code: 'SESSION_EXPIRED',
        });
        return;
      }
      
      // Update last activity
      existingSession.lastActivity = new Date();
      existingSession.ipAddress = clientIP;
    } else {
      // Create new session
      activeSessions.set(sessionKey, {
        userId: user.id,
        lastActivity: new Date(),
        ipAddress: clientIP,
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      collegeId: user.college_id,
      departmentId: user.department_id,
      status: user.status,
    };

    // Log successful authentication
    appLogger.info('User authenticated successfully', {
      userId: user.id,
      role: user.role,
      ip: clientIP,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    appLogger.error('Authentication middleware error', {
      error,
      ip: req.ip,
      path: req.path,
    });

    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

/**
 * Enhanced role-based authorization with hierarchy support
 */
export const enhancedAuthorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userRole = req.user.role;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
    
    // Check if user has required role or higher
    const hasPermission = allowedRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasPermission) {
      appLogger.warn('Authorization failed', {
        userId: req.user.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    next();
  };
};

/**
 * Resource-based authorization with enhanced security
 */
export const enhancedAuthorizeResource = (options: {
  allowSelfAccess?: boolean;
  allowCollegeAccess?: boolean;
  allowDepartmentAccess?: boolean;
  resourceUserIdParam?: string;
  resourceCollegeIdParam?: string;
  resourceDepartmentIdParam?: string;
  requireOwnership?: boolean;
} = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const {
      allowSelfAccess = true,
      allowCollegeAccess = true,
      allowDepartmentAccess = true,
      resourceUserIdParam = 'userId',
      resourceCollegeIdParam = 'collegeId',
      resourceDepartmentIdParam = 'departmentId',
      requireOwnership = false,
    } = options;

    const userRole = req.user.role;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
    
    // Super admin and admin have access to everything
    if (userRoleLevel >= ROLE_HIERARCHY.admin) {
      next();
      return;
    }

    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];
    const resourceCollegeId = req.params[resourceCollegeIdParam] || req.body[resourceCollegeIdParam];
    const resourceDepartmentId = req.params[resourceDepartmentIdParam] || req.body[resourceDepartmentIdParam];

    let hasAccess = false;

    // Check self access
    if (allowSelfAccess && resourceUserId === req.user.userId) {
      hasAccess = true;
    }

    // Check college access for principals
    if (!hasAccess && allowCollegeAccess && userRole === 'principal' && req.user.collegeId) {
      if (resourceCollegeId === req.user.collegeId) {
        hasAccess = true;
      }
    }

    // Check department access for HODs and staff
    if (!hasAccess && allowDepartmentAccess && ['hod', 'staff'].includes(userRole) && req.user.departmentId) {
      if (resourceDepartmentId === req.user.departmentId) {
        hasAccess = true;
      }
    }

    // Additional ownership check if required
    if (requireOwnership && !hasAccess) {
      // This would require additional database queries to verify ownership
      // Implementation depends on specific resource type
    }

    if (!hasAccess) {
      appLogger.warn('Resource access denied', {
        userId: req.user.userId,
        userRole,
        resourceUserId,
        resourceCollegeId,
        resourceDepartmentId,
        path: req.path,
        method: req.method,
      });
      
      res.status(403).json({
        success: false,
        message: 'Access denied to this resource',
        code: 'RESOURCE_ACCESS_DENIED',
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    appLogger.warn('Rate limit exceeded for authentication', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Session cleanup utility
 */
export const cleanupExpiredSessions = (): void => {
  const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  
  for (const [sessionKey, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > sessionTimeout) {
      activeSessions.delete(sessionKey);
    }
  }
  
  appLogger.info('Session cleanup completed', {
    activeSessions: activeSessions.size,
  });
};

// Run session cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

export default {
  enhancedAuthenticate,
  enhancedAuthorize,
  enhancedAuthorizeResource,
  authRateLimit,
  cleanupExpiredSessions,
};
