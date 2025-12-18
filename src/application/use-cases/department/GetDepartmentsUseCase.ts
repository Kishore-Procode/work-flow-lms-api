/**
 * Get Departments Use Case
 * 
 * Application service that orchestrates department retrieval with filtering and pagination.
 * Handles role-based access control and business logic.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IDepartmentRepository } from '../../../domain/repositories/IDepartmentRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Department } from '../../../domain/entities/Department';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { GetDepartmentsRequest } from '../../dtos/department/GetDepartmentsRequest';
import { GetDepartmentsResponse } from '../../dtos/department/GetDepartmentsResponse';
import { DomainError } from '../../../domain/errors/DomainError';

export interface DepartmentFilter {
  collegeId?: string;
  courseId?: string;
  hodId?: string;
  isActive?: boolean;
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  offset: number;
}

export class GetDepartmentsUseCase {
  constructor(
    private readonly departmentRepository: IDepartmentRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the get departments use case
   */
  public async execute(request: GetDepartmentsRequest): Promise<GetDepartmentsResponse> {
    // Validate request
    const validationErrors = request.validate();
    if (validationErrors.length > 0) {
      throw DomainError.validation(validationErrors.join(', '));
    }

    // Get requesting user
    const requestingUser = await this.userRepository.findById(request.requestingUser.id);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Apply role-based filtering
    const filter = this.applyRoleBasedFiltering(requestingUser, request);

    // Create pagination info
    const pagination: PaginationInfo = {
      page: request.getEffectivePage(),
      limit: request.getEffectiveLimit(),
      offset: (request.getEffectivePage() - 1) * request.getEffectiveLimit(),
    };

    // Get departments with count
    const [departments, total] = await Promise.all([
      this.departmentRepository.findWithSimpleFilters(filter, pagination),
      this.departmentRepository.countWithFilters(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / pagination.limit);

    return GetDepartmentsResponse.fromDomain(departments, {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
    });
  }

  /**
   * Apply role-based filtering to department queries
   */
  private applyRoleBasedFiltering(user: User, request: GetDepartmentsRequest): DepartmentFilter {
    const userRole = user.role;
    const filter: DepartmentFilter = {
      courseId: request.courseId,
      hodId: request.hodId,
      search: request.search,
    };

    // Super admin and admin can see all departments
    if (userRole.equals(UserRole.superAdmin()) || userRole.equals(UserRole.admin())) {
      filter.collegeId = request.collegeId; // Use requested college or show all
      filter.isActive = request.isActive; // Use requested status or show all
      return filter;
    }

    // Principal can see all departments in their college
    if (userRole.equals(UserRole.principal())) {
      filter.collegeId = user.collegeId; // Force user's college
      filter.isActive = request.isActive; // Can see active/inactive
      return filter;
    }

    // HOD can see all departments in their college
    if (userRole.equals(UserRole.hod())) {
      filter.collegeId = user.collegeId; // Force user's college
      filter.isActive = request.isActive; // Can see active/inactive
      return filter;
    }

    // Staff can see all departments in their college
    if (userRole.equals(UserRole.staff())) {
      filter.collegeId = user.collegeId; // Force user's college
      filter.isActive = request.isActive !== false ? true : undefined; // Prefer active, but allow all if explicitly requested
      return filter;
    }

    // Students can only see active departments in their college
    if (userRole.equals(UserRole.student())) {
      filter.collegeId = user.collegeId; // Force user's college
      filter.isActive = true; // Force active only
      return filter;
    }

    // Default: no access
    throw DomainError.authorization('User does not have permission to view departments');
  }

  /**
   * Get departments by college (public method for specific use cases)
   */
  public async getDepartmentsByCollege(
    collegeId: string,
    requestingUserId: string,
    includeInactive: boolean = false
  ): Promise<Department[]> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Verify user can access this college
    this.verifyCollegeAccess(requestingUser, collegeId);

    const filter: DepartmentFilter = {
      collegeId,
      isActive: includeInactive ? undefined : true,
    };

    return await this.departmentRepository.findWithSimpleFilters(filter);
  }

  /**
   * Get departments by HOD
   */
  public async getDepartmentsByHod(
    hodId: string,
    requestingUserId: string
  ): Promise<Department[]> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Verify authorization
    const userRole = requestingUser.role;
    if (!userRole.hasAuthorityOver(UserRole.hod()) && requestingUser.getId() !== hodId) {
      throw DomainError.authorization('User cannot view departments for this HOD');
    }

    return await this.departmentRepository.findByHod(hodId);
  }

  /**
   * Get departments without HOD (for assignment purposes)
   */
  public async getDepartmentsWithoutHod(
    requestingUserId: string,
    collegeId?: string
  ): Promise<Department[]> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Verify user can manage departments
    const userRole = requestingUser.role;
    if (!userRole.getPermissions().includes('manage_departments')) {
      throw DomainError.authorization('User does not have permission to manage departments');
    }

    // Apply college filtering based on role
    let effectiveCollegeId = collegeId;
    if (userRole.equals(UserRole.principal())) {
      effectiveCollegeId = requestingUser.collegeId;
    }

    return await this.departmentRepository.findWithoutHod(effectiveCollegeId);
  }

  /**
   * Search departments by name or code
   */
  public async searchDepartments(
    searchTerm: string,
    requestingUserId: string,
    collegeId?: string,
    limit: number = 10
  ): Promise<Department[]> {
    if (!searchTerm?.trim()) {
      return [];
    }

    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Apply role-based college filtering
    const effectiveCollegeId = this.getEffectiveCollegeId(requestingUser, collegeId);

    const filter: DepartmentFilter = {
      collegeId: effectiveCollegeId,
      search: searchTerm.trim(),
      isActive: true, // Only search active departments
    };

    const pagination: PaginationInfo = {
      page: 1,
      limit: Math.min(limit, 50), // Cap at 50 results
      offset: 0,
    };

    return await this.departmentRepository.findWithSimpleFilters(filter, pagination);
  }

  /**
   * Get department statistics
   */
  public async getDepartmentStatistics(
    requestingUserId: string,
    collegeId?: string
  ): Promise<{
    total: number;
    active: number;
    inactive: number;
    withHod: number;
    withoutHod: number;
    totalStudents: number;
    totalStaff: number;
  }> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Verify user can view statistics
    const userRole = requestingUser.role;
    if (!['super_admin', 'admin', 'principal', 'hod'].includes(userRole.value)) {
      throw DomainError.authorization('User does not have permission to view department statistics');
    }

    // Apply college filtering based on role
    const effectiveCollegeId = this.getEffectiveCollegeId(requestingUser, collegeId);

    return await this.departmentRepository.getStatistics(effectiveCollegeId);
  }

  /**
   * Verify user can access specific college
   */
  private verifyCollegeAccess(user: User, collegeId: string): void {
    const userRole = user.role;

    // Super admin and admin can access any college
    if (userRole.equals(UserRole.superAdmin()) || userRole.equals(UserRole.admin())) {
      return;
    }

    // Other roles can only access their own college
    if (user.collegeId !== collegeId) {
      throw DomainError.authorization('User cannot access departments from this college');
    }
  }

  /**
   * Get effective college ID based on user role and request
   */
  private getEffectiveCollegeId(user: User, requestedCollegeId?: string): string | undefined {
    const userRole = user.role;

    // Super admin and admin can use requested college or see all
    if (userRole.equals(UserRole.superAdmin()) || userRole.equals(UserRole.admin())) {
      return requestedCollegeId;
    }

    // Other roles are restricted to their college
    return user.collegeId;
  }
}
