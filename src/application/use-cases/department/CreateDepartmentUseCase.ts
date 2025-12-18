/**
 * Create Department Use Case
 * 
 * Application service that orchestrates department creation.
 * Handles business logic, validation, and coordination between domain entities.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IDepartmentRepository } from '../../../domain/repositories/IDepartmentRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Department } from '../../../domain/entities/Department';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { CreateDepartmentRequest } from '../../dtos/department/CreateDepartmentRequest';
import { CreateDepartmentResponse } from '../../dtos/department/CreateDepartmentResponse';
import { DomainError } from '../../../domain/errors/DomainError';

export class CreateDepartmentUseCase {
  constructor(
    private readonly departmentRepository: IDepartmentRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the create department use case
   */
  public async execute(request: CreateDepartmentRequest): Promise<CreateDepartmentResponse> {
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

    // Verify authorization
    await this.verifyAuthorization(requestingUser, request);

    // Check if department code already exists in the college
    const existingDepartment = await this.departmentRepository.findByCode(
      request.getNormalizedCode(),
      request.collegeId
    );

    if (existingDepartment) {
      throw DomainError.conflict(`Department with code '${request.code}' already exists in this college`);
    }

    // Check if department name already exists in the college
    const existingByName = await this.departmentRepository.existsByName(
      request.getNormalizedName(),
      request.collegeId
    );

    if (existingByName) {
      throw DomainError.conflict(`Department with name '${request.name}' already exists in this college`);
    }

    // Validate HOD if provided
    let hodUser: User | null = null;
    if (request.hodId) {
      hodUser = await this.validateHod(request.hodId, request.collegeId);
    }

    // Create department entity
    const department = Department.create({
      name: request.getNormalizedName(),
      code: request.getNormalizedCode(),
      collegeId: request.collegeId,
      courseId: request.courseId,
      hodId: request.hodId,
      totalStudents: 0,
      totalStaff: 0,
      established: request.established,
      isActive: true,
      isCustom: false,
    });

    // Save department
    const savedDepartment = await this.departmentRepository.save(department);

    // Update HOD's department association if HOD was assigned
    if (hodUser && request.hodId) {
      hodUser.assignToDepartment(savedDepartment.getId());
      await this.userRepository.update(hodUser);
    }

    return CreateDepartmentResponse.fromDomain(savedDepartment);
  }

  /**
   * Verify user authorization to create department
   */
  private async verifyAuthorization(user: User, request: CreateDepartmentRequest): Promise<void> {
    const userRole = user.role;

    // Check if user has permission to create departments
    if (!userRole.getPermissions().includes('manage_departments')) {
      throw DomainError.authorization('User does not have permission to create departments');
    }

    // Super admin and admin can create departments in any college
    if (userRole.equals(UserRole.superAdmin()) || userRole.equals(UserRole.admin())) {
      return;
    }

    // Principal can only create departments in their own college
    if (userRole.equals(UserRole.principal())) {
      if (!user.collegeId) {
        throw DomainError.authorization('Principal must be associated with a college');
      }

      if (user.collegeId !== request.collegeId) {
        throw DomainError.authorization('Principal can only create departments in their own college');
      }

      return;
    }

    // Other roles cannot create departments
    throw DomainError.authorization('Insufficient permissions to create departments');
  }

  /**
   * Validate HOD assignment
   */
  private async validateHod(hodId: string, collegeId: string): Promise<User> {
    const hodUser = await this.userRepository.findById(hodId);
    if (!hodUser) {
      throw DomainError.notFound('HOD user');
    }

    // Check if user can be HOD
    const userRole = hodUser.role;
    if (!userRole.equals(UserRole.hod()) && !userRole.equals(UserRole.staff())) {
      throw DomainError.businessRule('Only HOD or staff users can be assigned as department HOD');
    }

    // Check if user is in the same college
    if (hodUser.collegeId !== collegeId) {
      throw DomainError.businessRule('HOD must belong to the same college as the department');
    }

    // Check if user is active
    if (!hodUser.status.canAccessResources()) {
      throw DomainError.businessRule('HOD user must be active');
    }

    // Check if user is already HOD of another department
    const existingDepartments = await this.departmentRepository.findByHod(hodId);
    if (existingDepartments.length > 0) {
      throw DomainError.businessRule('User is already HOD of another department');
    }

    return hodUser;
  }

  /**
   * Validate college exists and is active
   */
  private async validateCollege(collegeId: string): Promise<void> {
    // This would require ICollegeRepository
    // For now, we assume the college exists if the user has access to it
    // In a complete implementation, we would:
    // const college = await this.collegeRepository.findById(collegeId);
    // if (!college || !college.isActive()) {
    //   throw DomainError.businessRule('College must exist and be active');
    // }
  }

  /**
   * Validate course exists and belongs to college
   */
  private async validateCourse(courseId: string, collegeId: string): Promise<void> {
    // This would require ICourseRepository
    // For now, we assume the course exists if provided
    // In a complete implementation, we would:
    // const course = await this.courseRepository.findById(courseId);
    // if (!course || course.collegeId !== collegeId) {
    //   throw DomainError.businessRule('Course must exist and belong to the same college');
    // }
  }
}
