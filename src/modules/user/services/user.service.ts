import { userRepository } from '../repositories/user.repository';
import { UserModel, CreateUserRequest, UpdateUserRequest, UserProfile, UserWithDetails } from '../models/user.model';
import { UserFilter, UserRole } from '../../../types';
import { hashPassword } from '../../../utils/auth.utils';
import { PaginatedResult } from '../../../models/base.repository';
import { transformUser } from '../../../utils/data.utils';
import { emailService } from '../../../utils/email.service';

export class UserService {
  /**
   * Get users with filtering and role-based access
   */
  async getUsers(
    filters: UserFilter,
    requestingUser: { role: UserRole; collegeId?: string; departmentId?: string }
  ): Promise<PaginatedResult<UserProfile>> {
    // Apply role-based filtering
    const appliedFilters = { ...filters };
    
    if (requestingUser.role !== 'admin') {
      if (requestingUser.role === 'principal' && requestingUser.collegeId) {
        appliedFilters.collegeId = requestingUser.collegeId;
      } else if ((requestingUser.role === 'hod' || requestingUser.role === 'staff') && requestingUser.departmentId) {
        appliedFilters.departmentId = requestingUser.departmentId;
      }
    }

    const result = await userRepository.findWithFilters(appliedFilters);

    return {
      data: result.data.map(user => transformUser(user)),
      pagination: result.pagination,
    };
  }

  /**
   * Get user by ID with access control
   */
  async getUserById(
    userId: string,
    requestingUser: { role: UserRole; userId: string; collegeId?: string; departmentId?: string }
  ): Promise<UserProfile | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    // Check access permissions
    if (requestingUser.userId !== userId && !UserModel.canManageUser(
      requestingUser.role,
      requestingUser.collegeId,
      requestingUser.departmentId,
      user
    )) {
      throw new Error('Access denied to this user');
    }

    return UserModel.createUserProfile(user);
  }

  /**
   * Create new user
   */
  async createUser(
    userData: CreateUserRequest,
    createdBy: { role: UserRole; collegeId?: string; departmentId?: string }
  ): Promise<UserProfile> {
    // Validate permissions
    if (!UserModel.canCreateUserWithRole(createdBy.role, userData.role)) {
      throw new Error('Insufficient permissions to create user with this role');
    }

    // Check if email already exists
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Validate email format
    if (!UserModel.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (userData.phone && !UserModel.isValidPhone(userData.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Apply role-based restrictions
    const createData = {
      ...userData,
      passwordHash,
      email: userData.email.toLowerCase(),
      status: 'pending' as const,
    };

    // Remove password from data
    delete (createData as any).password;

    // Apply creator's context for non-admin users
    if (createdBy.role === 'principal' && createdBy.collegeId) {
      createData.collegeId = createdBy.collegeId;
    } else if ((createdBy.role === 'hod' || createdBy.role === 'staff') && createdBy.departmentId) {
      createData.departmentId = createdBy.departmentId;
    }

    const newUser = await userRepository.createUser(createData);

    // Send welcome email with credentials
    try {
      const emailOptions = emailService.generateWelcomeEmail(
        newUser.name,
        newUser.email,
        userData.password, // Send the original password (before hashing)
        newUser.role
      );

      await emailService.sendEmail(emailOptions);
      console.log('✅ Welcome email sent to:', newUser.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send welcome email:', emailError);
      // Don't fail user creation if email fails
    }

    return UserModel.createUserProfile(newUser);
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updateData: UpdateUserRequest,
    updatedBy: { role: UserRole; userId: string; collegeId?: string; departmentId?: string }
  ): Promise<UserProfile> {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check permissions
    if (updatedBy.userId !== userId && !UserModel.canManageUser(
      updatedBy.role,
      updatedBy.collegeId,
      updatedBy.departmentId,
      existingUser
    )) {
      throw new Error('Access denied to update this user');
    }

    // Validate email if being changed
    if (updateData.email) {
      if (!UserModel.isValidEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }

      const emailExists = await userRepository.emailExists(updateData.email, userId);
      if (emailExists) {
        throw new Error('Email already exists');
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Validate phone if provided
    if (updateData.phone && !UserModel.isValidPhone(updateData.phone)) {
      throw new Error('Invalid phone number format');
    }

    const updatedUser = await userRepository.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return UserModel.createUserProfile(updatedUser);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string, deletedBy: { role: UserRole; userId: string }): Promise<void> {
    if (deletedBy.role !== 'admin') {
      throw new Error('Only administrators can delete users');
    }

    if (deletedBy.userId === userId) {
      throw new Error('Cannot delete your own account');
    }

    const deleted = await userRepository.delete(userId);
    if (!deleted) {
      throw new Error('User not found');
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole, options: any = {}): Promise<PaginatedResult<UserProfile>> {
    const result = await userRepository.findByRole(role, options);
    
    return {
      data: result.data.map(user => UserModel.createUserProfile(user)),
      pagination: result.pagination,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<any> {
    return await userRepository.getStatistics();
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    requestingUser: { role: UserRole; collegeId?: string; departmentId?: string }
  ): Promise<UserProfile[]> {
    const filters: UserFilter = {
      search: query,
      limit: 20,
    };

    // Apply role-based filtering
    if (requestingUser.role !== 'admin') {
      if (requestingUser.role === 'principal' && requestingUser.collegeId) {
        filters.collegeId = requestingUser.collegeId;
      } else if ((requestingUser.role === 'hod' || requestingUser.role === 'staff') && requestingUser.departmentId) {
        filters.departmentId = requestingUser.departmentId;
      }
    }

    const result = await userRepository.findWithFilters(filters);
    return result.data.map(user => UserModel.createUserProfile(user));
  }

  /**
   * Get users by college
   */
  async getUsersByCollege(collegeId: string, options: any = {}): Promise<PaginatedResult<UserProfile>> {
    const result = await userRepository.findByCollege(collegeId, options);
    
    return {
      data: result.data.map(user => UserModel.createUserProfile(user)),
      pagination: result.pagination,
    };
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(departmentId: string, options: any = {}): Promise<PaginatedResult<UserProfile>> {
    const result = await userRepository.findByDepartment(departmentId, options);
    
    return {
      data: result.data.map(user => UserModel.createUserProfile(user)),
      pagination: result.pagination,
    };
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<UserProfile> {
    const updatedUser = await userRepository.updateUser(userId, { status: 'active' });
    if (!updatedUser) {
      throw new Error('User not found');
    }

    return UserModel.createUserProfile(updatedUser);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<UserProfile> {
    const updatedUser = await userRepository.updateUser(userId, { status: 'inactive' });
    if (!updatedUser) {
      throw new Error('User not found');
    }

    return UserModel.createUserProfile(updatedUser);
  }
}
