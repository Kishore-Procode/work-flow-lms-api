/**
 * Get User By ID Use Case
 * 
 * Application service that retrieves a specific user by ID.
 * Handles role-based access control and data filtering.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { DomainError } from '../../../domain/errors/DomainError';

export interface GetUserByIdRequest {
  userId: string;
  requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };
}

export interface GetUserByIdResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    collegeId?: string;
    departmentId?: string;
    rollNumber?: string;
    semester?: number;
    batchYear?: number;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    joiningDate?: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export class GetUserByIdUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the get user by ID use case
   */
  public async execute(request: GetUserByIdRequest): Promise<GetUserByIdResponse> {
    // Validate request
    if (!request.userId?.trim()) {
      throw DomainError.validation('User ID is required');
    }

    if (!request.requestingUser?.id?.trim()) {
      throw DomainError.validation('Requesting user ID is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(request.userId)) {
      throw DomainError.validation('Invalid user ID format');
    }

    // Get requesting user
    const requestingUser = await this.userRepository.findById(request.requestingUser.id);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Get target user
    const targetUser = await this.userRepository.findById(request.userId);
    if (!targetUser) {
      throw DomainError.notFound('User');
    }

    // Verify authorization
    this.verifyAuthorization(requestingUser, targetUser);

    // Filter sensitive data based on role
    const userData = this.filterUserData(requestingUser, targetUser);

    return {
      user: userData,
    };
  }

  /**
   * Verify user authorization to view target user
   */
  private verifyAuthorization(requestingUser: User, targetUser: User): void {
    const requestingRole = requestingUser.role;

    // Users can view their own profile
    if (requestingUser.getId() === targetUser.getId()) {
      return;
    }

    // Super admin and admin can view any user
    if (requestingRole.equals(UserRole.superAdmin()) || requestingRole.equals(UserRole.admin())) {
      return;
    }

    // Principal can view users in their college
    if (requestingRole.equals(UserRole.principal())) {
      if (requestingUser.collegeId !== targetUser.collegeId) {
        throw DomainError.authorization('Principal can only view users in their college');
      }
      return;
    }

    // HOD can view users in their department
    if (requestingRole.equals(UserRole.hod())) {
      if (requestingUser.collegeId !== targetUser.collegeId ||
          requestingUser.departmentId !== targetUser.departmentId) {
        throw DomainError.authorization('HOD can only view users in their department');
      }
      return;
    }

    // Staff can view users in their department
    if (requestingRole.equals(UserRole.staff())) {
      if (requestingUser.collegeId !== targetUser.collegeId ||
          requestingUser.departmentId !== targetUser.departmentId) {
        throw DomainError.authorization('Staff can only view users in their department');
      }
      return;
    }

    // Students can only view their own profile (already handled above)
    throw DomainError.authorization('User does not have permission to view this profile');
  }

  /**
   * Filter user data based on requesting user's role
   */
  private filterUserData(requestingUser: User, targetUser: User): any {
    const requestingRole = requestingUser.role;
    const isOwnProfile = requestingUser.getId() === targetUser.getId();

    // Base data that everyone can see
    const baseData = {
      id: targetUser.getId(),
      name: targetUser.name,
      email: targetUser.email.value,
      role: targetUser.role.value,
      status: targetUser.status.value,
      createdAt: targetUser.createdAt.toISOString(),
      updatedAt: targetUser.updatedAt.toISOString(),
    };

    // Additional data for own profile or higher roles
    if (isOwnProfile || requestingRole.hasAuthorityOver(targetUser.role)) {
      return {
        ...baseData,
        collegeId: targetUser.collegeId,
        departmentId: targetUser.departmentId,
        rollNumber: targetUser.rollNumber,
        semester: undefined, // User entity doesn't have semester field
        batchYear: targetUser.year,
        phoneNumber: targetUser.phone,
        address: undefined, // User entity doesn't have address field
        dateOfBirth: undefined, // User entity doesn't have dateOfBirth field
        joiningDate: undefined, // User entity doesn't have joiningDate field
        lastLogin: undefined, // User entity doesn't have lastLogin field
      };
    }

    // Limited data for peers or lower authority
    return {
      ...baseData,
      collegeId: targetUser.collegeId,
      departmentId: targetUser.departmentId,
      rollNumber: targetUser.rollNumber,
      semester: undefined,
    };
  }

  /**
   * Get user profile (convenience method for own profile)
   */
  public async getUserProfile(userId: string): Promise<GetUserByIdResponse> {
    return await this.execute({
      userId,
      requestingUser: {
        id: userId,
        role: 'student', // Will be overridden by actual user role
      },
    });
  }

  /**
   * Check if user exists
   */
  public async userExists(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      return user !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user basic info (for internal use)
   */
  public async getUserBasicInfo(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  } | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.getId(),
      name: user.name,
      email: user.email.value,
      role: user.role.value,
      status: user.status.value,
    };
  }
}
