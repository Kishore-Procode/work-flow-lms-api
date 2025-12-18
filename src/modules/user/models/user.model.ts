import { User, UserRole, UserStatus } from '../../../types';

export interface UserProfile extends Omit<User, 'password_hash'> {
  // User profile without sensitive data
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  collegeId?: string;
  departmentId?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  rollNumber?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  rollNumber?: string;
  profileImageUrl?: string;
}

export interface UserWithDetails extends UserProfile {
  collegeName?: string;
  departmentName?: string;
  assignedresourcesCount?: number;
  lastLoginFormatted?: string;
}

export interface UserStatistics {
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  activeUsers: number;
  newUsersThisMonth: number;
}

export class UserModel {
  /**
   * Create safe user profile
   */
  static createUserProfile(user: User): UserProfile {
    const { password_hash, ...profile } = user;
    return profile;
  }

  /**
   * Convert user data to frontend format (camelCase)
   */
  static toFrontendFormat(user: User): any {
    const { password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      collegeId: user.college_id,
      departmentId: user.department_id,
      classInCharge: user.class_in_charge,
      rollNumber: user.roll_number,
      profileImageUrl: user.profile_image_url,
      emailVerified: user.email_verified,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Create user with details
   */
  static createUserWithDetails(
    user: User,
    collegeName?: string,
    departmentName?: string,
    assignedresourcesCount?: number
  ): UserWithDetails {
    const profile = this.createUserProfile(user);
    return {
      ...profile,
      collegeName,
      departmentName,
      assignedresourcesCount,
      lastLoginFormatted: user.last_login ? this.formatDate(user.last_login) : 'Never',
    };
  }

  /**
   * Validate create user request
   */
  static validateCreateUserRequest(data: any): data is CreateUserRequest {
    return (
      typeof data === 'object' &&
      typeof data.email === 'string' &&
      typeof data.password === 'string' &&
      typeof data.name === 'string' &&
      typeof data.role === 'string' &&
      ['admin', 'principal', 'hod', 'staff', 'student'].includes(data.role)
    );
  }

  /**
   * Validate update user request
   */
  static validateUpdateUserRequest(data: any): data is UpdateUserRequest {
    if (typeof data !== 'object') return false;
    
    // Check optional fields
    const validFields = ['name', 'phone', 'status', 'collegeId', 'departmentId', 
                        'classInCharge', 'class', 'semester', 'rollNumber', 'profileImageUrl'];
    
    return Object.keys(data).every(key => validFields.includes(key));
  }

  /**
   * Check if user can manage another user
   */
  static canManageUser(managerRole: UserRole, managerCollegeId: string | undefined, managerDepartmentId: string | undefined, 
                      targetUser: User): boolean {
    // Admin can manage anyone
    if (managerRole === 'admin') return true;
    
    // Principal can manage users in their college
    if (managerRole === 'principal' && managerCollegeId === targetUser.college_id) return true;

    // HOD can manage users in their department
    if (managerRole === 'hod' && managerDepartmentId === targetUser.department_id) return true;
    
    return false;
  }

  /**
   * Get user role hierarchy level
   */
  static getRoleLevel(role: UserRole): number {
    const levels = {
      admin: 5,
      principal: 4,
      hod: 3,
      staff: 2,
      student: 1,
    };
    return levels[role] || 0;
  }

  /**
   * Check if user can create user with specific role
   */
  static canCreateUserWithRole(creatorRole: UserRole, targetRole: UserRole): boolean {
    const creatorLevel = this.getRoleLevel(creatorRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    // Can only create users with lower or equal hierarchy level
    return creatorLevel >= targetLevel;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  /**
   * Generate username from email
   */
  static generateUsername(email: string): string {
    return email.split('@')[0].toLowerCase();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
}
