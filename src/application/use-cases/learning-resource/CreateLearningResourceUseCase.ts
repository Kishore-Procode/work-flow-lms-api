/**
 * Create Learning Resource Use Case
 * 
 * Application service that orchestrates learning resource creation.
 * Handles business logic, validation, and coordination between domain entities.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ILearningResourceRepository } from '../../../domain/repositories/ILearningResourceRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { LearningResource } from '../../../domain/entities/LearningResource';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { ResourceCode } from '../../../domain/value-objects/ResourceCode';
import { CreateLearningResourceRequest } from '../../dtos/learning-resource/CreateLearningResourceRequest';
import { DomainError } from '../../../domain/errors/DomainError';

export interface CreateLearningResourceResponse {
  resource: {
    id: string;
    resourceCode: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    location?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export class CreateLearningResourceUseCase {
  constructor(
    private readonly learningResourceRepository: ILearningResourceRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the create learning resource use case
   */
  public async execute(request: CreateLearningResourceRequest): Promise<CreateLearningResourceResponse> {
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

    // Check if resource code already exists
    const resourceCode = request.getNormalizedResourceCode();
    const existingResource = await this.learningResourceRepository.findByResourceCode(resourceCode.value);

    if (existingResource) {
      throw DomainError.conflict(`Learning resource with code '${resourceCode.value}' already exists`);
    }

    // Validate resource code pattern and generate suggestions if needed
    await this.validateResourceCode(resourceCode, request);

    // Get location coordinates
    const coordinates = request.getLocationObject();

    // Create learning resource entity
    const learningResource = LearningResource.create({
      resourceCode: resourceCode.value,
      category: request.getNormalizedCategory(),
      learningContext: request.description?.trim(),
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      status: 'available',
      assignedStudentId: undefined,
      assignmentDate: undefined,
      startDate: undefined,
      collegeId: request.requestingUser.collegeId || '',
      departmentId: request.requestingUser.departmentId,
      notes: request.notes?.trim(),
    });

    // Save learning resource
    const savedResource = await this.learningResourceRepository.save(learningResource);

    return this.formatResponse(savedResource);
  }

  /**
   * Verify user authorization to create learning resource
   */
  private async verifyAuthorization(user: User, request: CreateLearningResourceRequest): Promise<void> {
    const userRole = user.role;

    // Check if user has permission to create learning resources
    if (!userRole.getPermissions().includes('manage_learning_resources')) {
      throw DomainError.authorization('User does not have permission to create learning resources');
    }

    // Super admin and admin can create resources anywhere
    if (userRole.equals(UserRole.superAdmin()) || userRole.equals(UserRole.admin())) {
      return;
    }

    // Principal can create resources in their college
    if (userRole.equals(UserRole.principal())) {
      if (!user.collegeId) {
        throw DomainError.authorization('Principal must be associated with a college');
      }
      return;
    }

    // HOD can create resources in their department/college
    if (userRole.equals(UserRole.hod())) {
      if (!user.collegeId || !user.departmentId) {
        throw DomainError.authorization('HOD must be associated with a college and department');
      }
      return;
    }

    // Staff can create resources in their department/college
    if (userRole.equals(UserRole.staff())) {
      if (!user.collegeId || !user.departmentId) {
        throw DomainError.authorization('Staff must be associated with a college and department');
      }
      return;
    }

    // Other roles cannot create learning resources
    throw DomainError.authorization('Insufficient permissions to create learning resources');
  }

  /**
   * Validate resource code and provide suggestions
   */
  private async validateResourceCode(resourceCode: ResourceCode, request: CreateLearningResourceRequest): Promise<void> {
    // Check if code follows expected patterns
    const isValidPattern = resourceCode.isCoursePattern() || resourceCode.isModulePattern();

    if (!isValidPattern) {
      // TODO: Get existing codes for suggestions when getResourceCodes is implemented
      // const existingCodes = await this.learningResourceRepository.getResourceCodes();
      // const suggestions = ResourceCode.generateSuggestions(existingCodes, request.category);

      // if (suggestions.length > 0) {
      //   throw DomainError.validation(
      //     `Resource code '${resourceCode.value}' doesn't follow standard patterns. ` +
      //     `Suggested codes: ${suggestions.slice(0, 3).join(', ')}`
      //   );
      // }
    }

    // Check for sequential consistency if it's a sequential code
    if (resourceCode.numericSuffix) {
      // TODO: Get existing codes when getResourceCodes is implemented
      // const existingCodes = await this.learningResourceRepository.getResourceCodes();
      // const relatedCodes = existingCodes.filter(code =>
      //   code.prefix === resourceCode.prefix
      // );

      // if (relatedCodes.length > 0) {
      //   // Check if there's a gap in the sequence
      //   const lastCode = relatedCodes
      //     .filter(code => code.numericSuffix)
      //     .sort((a, b) => {
      //       const aNum = parseInt(a.numericSuffix!, 10);
      //       const bNum = parseInt(b.numericSuffix!, 10);
      //       return bNum - aNum;
      //     })[0];

      //   if (lastCode) {
      //     const expectedNext = lastCode.getNextSequential();
      //     if (expectedNext && !expectedNext.equals(resourceCode)) {
      //       throw DomainError.validation(
      //         `Resource code '${resourceCode.value}' breaks sequence. ` +
      //         `Expected next code: '${expectedNext.value}'`
      //       );
      //     }
      //   }
      // }
    }
  }

  /**
   * Format response for API
   */
  private formatResponse(resource: LearningResource): CreateLearningResourceResponse {
    const location = resource.getLocation();

    return {
      resource: {
        id: resource.getId(),
        resourceCode: resource.getResourceCode(),
        title: resource.getResourceCode(), // Using resourceCode as title since title doesn't exist
        description: resource.getLearningContext(),
        category: resource.getCategory(),
        status: resource.getStatus(),
        location: location.latitude && location.longitude ?
          `${location.latitude},${location.longitude}` : undefined,
        coordinates: location.latitude && location.longitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
        } : undefined,
        notes: resource.getNotes(),
        createdAt: resource.getCreatedAt().toISOString(),
        updatedAt: resource.getUpdatedAt().toISOString(),
      },
    };
  }

  /**
   * Create resource with auto-generated code
   */
  public async createWithAutoCode(
    title: string,
    category: string,
    description: string | undefined,
    requestingUserId: string,
    location?: string,
    coordinates?: { latitude: number; longitude: number }
  ): Promise<CreateLearningResourceResponse> {
    // TODO: Get existing codes to generate new one when getResourceCodes is implemented
    // const existingCodes = await this.learningResourceRepository.getResourceCodes();
    // const suggestions = ResourceCode.generateSuggestions(existingCodes, category);

    // Generate a simple auto code based on category and timestamp
    const timestamp = Date.now().toString().slice(-6);
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const autoCode = `${categoryPrefix}-${timestamp}`;

    // Get requesting user
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Create request with auto-generated code
    const request = CreateLearningResourceRequest.fromPlainObject({
      resourceCode: autoCode,
      title,
      description,
      category,
      location,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      requestingUser: {
        id: requestingUser.getId(),
        role: requestingUser.role.value,
        collegeId: requestingUser.collegeId,
        departmentId: requestingUser.departmentId,
      },
    });

    return await this.execute(request);
  }

  /**
   * Bulk create resources
   */
  public async bulkCreate(
    resources: Array<{
      resourceCode: string;
      title: string;
      description?: string;
      category: string;
      location?: string;
      coordinates?: { latitude: number; longitude: number };
      notes?: string;
    }>,
    requestingUserId: string
  ): Promise<CreateLearningResourceResponse[]> {
    if (resources.length === 0) {
      throw DomainError.validation('At least one resource must be provided');
    }

    if (resources.length > 100) {
      throw DomainError.validation('Cannot create more than 100 resources at once');
    }

    // Get requesting user
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    const results: CreateLearningResourceResponse[] = [];
    const errors: string[] = [];

    // Process each resource
    for (let i = 0; i < resources.length; i++) {
      const resourceData = resources[i];
      
      try {
        const request = CreateLearningResourceRequest.fromPlainObject({
          ...resourceData,
          requestingUser: {
            id: requestingUser.getId(),
            role: requestingUser.role.value,
            collegeId: requestingUser.collegeId,
            departmentId: requestingUser.departmentId,
          },
        });

        const result = await this.execute(request);
        results.push(result);
      } catch (error) {
        errors.push(`Resource ${i + 1} (${resourceData.resourceCode}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw DomainError.validation(`Bulk creation failed:\n${errors.join('\n')}`);
    }

    return results;
  }
}
