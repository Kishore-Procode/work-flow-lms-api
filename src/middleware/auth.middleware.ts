import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload, UserRole } from '../types';
import { 
  extractTokenFromHeader, 
  verifyAccessToken, 
  hasRequiredRole,
  canAccessResource 
} from '../utils/auth.utils';
import { userRepository } from '../modules/user/repositories/user.repository';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists and is active
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'User account is not active',
      });
      return;
    }

    // Attach enriched user data to request
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
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    let message = 'Invalid token';
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        message = 'Token expired';
      } else if (error.message === 'Invalid token') {
        message = 'Invalid token';
      }
    }

    res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      
      // Check if user still exists and is active
      const user = await userRepository.findById(decoded.userId);
      if (user && user.status === 'active') {
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
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log('=== AUTHORIZE MIDDLEWARE ===');
    console.log('Allowed Roles:', allowedRoles);
    console.log('User:', req.user ? {
      id: req.user.id,
      role: req.user.role,
      collegeId: req.user.collegeId,
      departmentId: req.user.departmentId
    } : 'No user');

    if (!req.user) {
      console.log('❌ AUTHORIZE: No user found');
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role;
    const hasPermission = allowedRoles.some(role => hasRequiredRole(userRole, role));

    console.log('User Role:', userRole);
    console.log('Has Permission:', hasPermission);

    if (!hasPermission) {
      console.log('❌ AUTHORIZE: Insufficient permissions');
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    console.log('✅ AUTHORIZE: Permission granted');
    next();
  };
};

/**
 * Resource-based authorization middleware
 */
export const authorizeResource = (options: {
  allowSelfAccess?: boolean;
  allowCollegeAccess?: boolean;
  allowDepartmentAccess?: boolean;
  resourceUserIdParam?: string;
  resourceCollegeIdParam?: string;
  resourceDepartmentIdParam?: string;
} = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
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
    } = options;

    const userRole = req.user.role;
    const userCollegeId = req.user.collegeId;
    const userDepartmentId = req.user.departmentId;
    const currentUserId = req.user.userId;

    // Extract resource identifiers from request
    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];
    const resourceCollegeId = req.params[resourceCollegeIdParam] || req.body[resourceCollegeIdParam];
    const resourceDepartmentId = req.params[resourceDepartmentIdParam] || req.body[resourceDepartmentIdParam];

    // Check access permissions
    const hasAccess = canAccessResource(
      userRole,
      userCollegeId,
      userDepartmentId,
      allowCollegeAccess ? resourceCollegeId : undefined,
      allowDepartmentAccess ? resourceDepartmentId : undefined,
      allowSelfAccess ? resourceUserId : undefined,
      currentUserId
    );

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this resource',
      });
      return;
    }

    next();
  };
};

/**
 * College-specific authorization middleware
 */
export const authorizeCollege = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const userRole = req.user.role;
  const userCollegeId = req.user.collegeId;
  const targetCollegeId = req.params.collegeId || req.body.collegeId;

  // Admin can access any college
  if (userRole === 'admin') {
    next();
    return;
  }

  // Users can only access their own college
  if (!userCollegeId || userCollegeId !== targetCollegeId) {
    res.status(403).json({
      success: false,
      message: 'Access denied to this college',
    });
    return;
  }

  next();
};

/**
 * Department-specific authorization middleware
 */
export const authorizeDepartment = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const userRole = req.user.role;
  const userCollegeId = req.user.collegeId;
  const userDepartmentId = req.user.departmentId;
  const targetDepartmentId = req.params.departmentId || req.body.departmentId;

  // Admin can access any department
  if (userRole === 'admin') {
    next();
    return;
  }

  // Principal can access departments in their college
  if (userRole === 'principal' && userCollegeId) {
    // We need to verify the department belongs to the user's college
    // This would require a database query, so we'll handle it in the controller
    next();
    return;
  }

  // HOD and Staff can only access their own department
  if ((userRole === 'hod' || userRole === 'staff') && userDepartmentId === targetDepartmentId) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Access denied to this department',
  });
};

/**
 * Self-access authorization middleware
 */
export const authorizeSelf = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const currentUserId = req.user.userId;
    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    const userRole = req.user.role;

    // Admin can access any user
    if (userRole === 'admin') {
      next();
      return;
    }

    // Users can only access their own data
    if (currentUserId !== targetUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied - can only access your own data',
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically use a rate limiting library like express-rate-limit
  // For now, we'll just pass through
  next();
};
