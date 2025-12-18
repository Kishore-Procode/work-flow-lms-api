import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AuthTokenPayload, UserRole } from '../types';

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a password with its hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Failed to compare password');
  }
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: AuthTokenPayload): string => {
  try {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'student-act-lms',
      audience: 'student-act-lms-users',
    } as any);
  } catch (error) {
    console.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: AuthTokenPayload): string => {
  try {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'one-student-one-resource',
      audience: 'one-student-one-resource-users',
    } as any);
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'student-act-lms',
      audience: 'student-act-lms-users',
    }) as AuthTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      console.error('Error verifying access token:', error);
      throw new Error('Failed to verify token');
    }
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'student-act-lms',
      audience: 'student-act-lms-users',
    }) as AuthTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      console.error('Error verifying refresh token:', error);
      throw new Error('Failed to verify refresh token');
    }
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Generate a random token for invitations, password reset, etc.
 */
export const generateRandomToken = (length: number = 32): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Role hierarchy for authorization checks
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 6,
  admin: 5,
  principal: 4,
  hod: 3,
  staff: 2,
  student: 1,
};

/**
 * Check if user has required role or higher
 */
export const hasRequiredRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user can access resource based on role and ownership
 */
export const canAccessResource = (
  userRole: UserRole,
  userCollegeId: string | undefined,
  userDepartmentId: string | undefined,
  resourceCollegeId?: string,
  resourceDepartmentId?: string,
  resourceUserId?: string,
  currentUserId?: string
): boolean => {
  // Admin can access everything
  if (userRole === 'admin') {
    return true;
  }

  // Users can always access their own resources
  if (resourceUserId && currentUserId && resourceUserId === currentUserId) {
    return true;
  }

  // Principal can access resources in their college
  if (userRole === 'principal' && userCollegeId && resourceCollegeId) {
    return userCollegeId === resourceCollegeId;
  }

  // HOD can access resources in their department
  if (userRole === 'hod' && userDepartmentId && resourceDepartmentId) {
    return userDepartmentId === resourceDepartmentId;
  }

  // Staff can access resources in their department (limited scope)
  if (userRole === 'staff' && userDepartmentId && resourceDepartmentId) {
    return userDepartmentId === resourceDepartmentId;
  }

  // Students can only access their own resources (handled above)
  return false;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate secure session ID
 */
export const generateSessionId = (): string => {
  return generateRandomToken(64);
};

/**
 * Check if token is about to expire (within 5 minutes)
 */
export const isTokenNearExpiry = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    return (expirationTime - currentTime) <= fiveMinutes;
  } catch (error) {
    return true; // If we can't decode, assume it's expired
  }
};

/**
 * Generate invitation token
 */
export const generateInvitationToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'inv-';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
