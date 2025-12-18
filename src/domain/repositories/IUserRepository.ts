/**
 * User Repository Interface
 * 
 * Domain interface for user data access operations.
 * Defines the contract that infrastructure layer must implement.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { User } from '../entities/User';
import { Email } from '../value-objects/Email';
import { UserRole } from '../value-objects/UserRole';
import { UserStatus } from '../value-objects/UserStatus';

export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IUserRepository {
  /**
   * Find user by unique identifier
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email address
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Find users with filters and pagination
   */
  findWithFilters(filter: UserFilter): Promise<PaginatedResult<User>>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole, page?: number, limit?: number): Promise<PaginatedResult<User>>;

  /**
   * Find users by college
   */
  findByCollege(collegeId: string, page?: number, limit?: number): Promise<PaginatedResult<User>>;

  /**
   * Find users by department
   */
  findByDepartment(departmentId: string, page?: number, limit?: number): Promise<PaginatedResult<User>>;

  /**
   * Find users by status
   */
  findByStatus(status: UserStatus, page?: number, limit?: number): Promise<PaginatedResult<User>>;

  /**
   * Check if email already exists
   */
  existsByEmail(email: Email): Promise<boolean>;

  /**
   * Check if roll number exists in a college/department
   */
  existsByRollNumber(rollNumber: string, collegeId: string, departmentId: string): Promise<boolean>;

  /**
   * Save a new user
   */
  save(user: User): Promise<User>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete a user (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get total count of users
   */
  count(): Promise<number>;

  /**
   * Get count of users by role
   */
  countByRole(role: UserRole): Promise<number>;

  /**
   * Get count of users by status
   */
  countByStatus(status: UserStatus): Promise<number>;

  /**
   * Get count of users by college
   */
  countByCollege(collegeId: string): Promise<number>;

  /**
   * Get count of users by department
   */
  countByDepartment(departmentId: string): Promise<number>;

  /**
   * Find users created within a date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * Find users with pending status older than specified days
   */
  findPendingUsersOlderThan(days: number): Promise<User[]>;

  /**
   * Search users by name or email
   */
  search(query: string, page?: number, limit?: number): Promise<PaginatedResult<User>>;

  /**
   * Get user statistics
   */
  getStatistics(): Promise<{
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    byCollege: Record<string, number>;
    recentRegistrations: number;
  }>;

  /**
   * Batch operations
   */
  saveMany(users: User[]): Promise<User[]>;
  updateMany(users: User[]): Promise<User[]>;
  deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Transaction support
   */
  withTransaction<T>(operation: (repository: IUserRepository) => Promise<T>): Promise<T>;
}
