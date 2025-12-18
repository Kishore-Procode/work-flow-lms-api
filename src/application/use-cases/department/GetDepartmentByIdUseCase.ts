/**
 * Get Department By ID Use Case
 * 
 * Application layer use case for retrieving a single department by ID.
 * Handles role-based authorization and data filtering.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IDepartmentRepository } from '../../../domain/repositories/IDepartmentRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Department } from '../../../domain/entities/Department';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { DomainError } from '../../../domain/errors/DomainError';

export interface GetDepartmentByIdRequest {
  departmentId: string;
  requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };
}

export interface GetDepartmentByIdResponse {
  department: {
    id: string;
    name: string;
    code: string;
    collegeId: string;
    courseId?: string;
    hodId?: string;
    totalStudents: number;
    totalStaff: number;
    established?: string;
    isActive: boolean;
    isCustom: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export class GetDepartmentByIdUseCase {
  constructor(
    private readonly departmentRepository: IDepartmentRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the use case
   */
  public async execute(request: GetDepartmentByIdRequest): Promise<GetDepartmentByIdResponse> {
    // Validate request
    if (!request.departmentId) {
      throw DomainError.validation('Department ID is required');
    }

    if (!request.requestingUser?.id) {
      throw DomainError.authentication('User authentication required');
    }

    // Get requesting user
    const requestingUser = await this.userRepository.findById(request.requestingUser.id);
    if (!requestingUser) {
      throw DomainError.authentication('Invalid user');
    }

    // Get department
    const department = await this.departmentRepository.findById(request.departmentId);
    if (!department) {
      throw DomainError.notFound('Department not found');
    }

    // Check authorization
    await this.checkAuthorization(requestingUser, department);

    // Return response
    return {
      department: this.mapDepartmentToResponse(department),
    };
  }

  /**
   * Check if user is authorized to view this department
   */
  private async checkAuthorization(requestingUser: User, department: Department): Promise<void> {
    const userRole = requestingUser.role.value;

    // Super admin and admin can see all departments
    if (userRole === 'super_admin' || userRole === 'admin') {
      return;
    }

    // Principal can only see departments in their college
    if (userRole === 'principal') {
      if (!requestingUser.collegeId) {
        throw DomainError.authorization('Principal must be assigned to a college');
      }

      if (department.getCollegeId() !== requestingUser.collegeId) {
        throw DomainError.authorization('Access denied to department outside your college');
      }
      return;
    }

    // HOD can only see their own department
    if (userRole === 'hod') {
      if (!requestingUser.departmentId) {
        throw DomainError.authorization('HOD must be assigned to a department');
      }

      if (department.getId() !== requestingUser.departmentId) {
        throw DomainError.authorization('Access denied to department outside your authority');
      }
      return;
    }

    // Staff can only see their own department
    if (userRole === 'staff') {
      if (!requestingUser.departmentId) {
        throw DomainError.authorization('Staff must be assigned to a department');
      }

      if (department.getId() !== requestingUser.departmentId) {
        throw DomainError.authorization('Access denied to department outside your authority');
      }
      return;
    }

    // Students cannot access department details
    if (userRole === 'student') {
      throw DomainError.authorization('Students cannot access department details');
    }

    throw DomainError.authorization('Insufficient permissions');
  }

  /**
   * Map department entity to response format
   */
  private mapDepartmentToResponse(department: Department): GetDepartmentByIdResponse['department'] {
    return {
      id: department.getId(),
      name: department.getName(),
      code: department.getCode(),
      collegeId: department.getCollegeId(),
      courseId: department.getCourseId(),
      hodId: department.getHodId(),
      totalStudents: department.getTotalStudents(),
      totalStaff: department.getTotalStaff(),
      established: department.getEstablished(),
      isActive: department.isActiveDepartment(),
      isCustom: department.isCustomDepartment(),
      createdAt: department.getCreatedAt().toISOString(),
      updatedAt: department.getUpdatedAt().toISOString(),
    };
  }

  /**
   * Get department with additional details (HOD name, college name, etc.)
   */
  public async executeWithDetails(request: GetDepartmentByIdRequest): Promise<GetDepartmentByIdResponse & {
    hodName?: string;
    collegeName?: string;
    courseName?: string;
  }> {
    const baseResponse = await this.execute(request);
    
    // TODO: Add logic to fetch HOD name, college name, course name
    // This would require additional repository methods or joins
    
    return {
      ...baseResponse,
      hodName: undefined,
      collegeName: undefined,
      courseName: undefined,
    };
  }
}
