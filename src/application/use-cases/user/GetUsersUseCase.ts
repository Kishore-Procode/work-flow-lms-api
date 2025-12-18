/**
 * Get Users Use Case
 * 
 * Application layer use case for retrieving users with filters and pagination.
 * Implements role-based access control and data filtering.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IUserRepository, UserFilter, PaginatedResult } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { UserStatus } from '../../../domain/value-objects/UserStatus';
import { DomainError } from '../../../domain/errors/DomainError';
import { GetUsersRequest } from '../../dtos/user/GetUsersRequest';
import { GetUsersResponse } from '../../dtos/user/GetUsersResponse';

export class GetUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: GetUsersRequest): Promise<GetUsersResponse> {
    // Validate input
    this.validateRequest(request);

    // Apply role-based filtering
    const filter = this.applyRoleBasedFiltering(request);

    // Get users from repository
    const result = await this.userRepository.findWithFilters(filter);

    // Map to response format
    return new GetUsersResponse({
      users: result.data.map(user => this.mapUserToResponse(user)),
      pagination: result.pagination,
    });
  }

  private validateRequest(request: GetUsersRequest): void {
    if (!request.requestingUser) {
      throw DomainError.authorization('Requesting user information is required');
    }

    if (request.page && request.page < 1) {
      throw DomainError.validation('Page must be greater than 0');
    }

    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      throw DomainError.validation('Limit must be between 1 and 100');
    }
  }

  private applyRoleBasedFiltering(request: GetUsersRequest): UserFilter {
    const requestingUserRole = UserRole.create(request.requestingUser.role);
    const filter: UserFilter = {
      page: request.page || 1,
      limit: request.limit || 25,
      search: request.search,
    };

    // Apply role filter if specified
    if (request.role) {
      filter.role = UserRole.create(request.role);
    }

    // Apply status filter if specified
    if (request.status) {
      filter.status = UserStatus.create(request.status);
    }

    // Apply role-based access control
    if (requestingUserRole.isSuperAdmin()) {
      // Super admin can see all users
      filter.collegeId = request.collegeId;
      filter.departmentId = request.departmentId;
    } else if (requestingUserRole.isAdmin()) {
      // Admin can see all users except super admin
      filter.collegeId = request.collegeId;
      filter.departmentId = request.departmentId;
      // Filter out super admin users (will be handled in repository)
    } else if (requestingUserRole.isPrincipal()) {
      // Principal can only see users in their college
      filter.collegeId = request.requestingUser.collegeId;
      if (request.departmentId) {
        filter.departmentId = request.departmentId;
      }
    } else if (requestingUserRole.isHOD()) {
      // HOD can only see users in their department
      filter.collegeId = request.requestingUser.collegeId;
      filter.departmentId = request.requestingUser.departmentId;
    } else {
      // Staff and students cannot list other users
      throw DomainError.authorization('Insufficient permissions to list users');
    }

    return filter;
  }

  private mapUserToResponse(user: User): any {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      phone: user.phone,
      role: user.role.value,
      status: user.status.value,
      collegeId: user.collegeId,
      departmentId: user.departmentId,
      rollNumber: user.rollNumber,
      year: user.year,
      section: user.section,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
