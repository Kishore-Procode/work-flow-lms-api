/**
 * Create Progress Use Case
 * 
 * Application service that orchestrates learning progress creation.
 * Handles business logic, validation, and coordination between domain entities.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ILearningProgressRepository } from '../../../domain/repositories/ILearningProgressRepository';
import { ILearningResourceRepository } from '../../../domain/repositories/ILearningResourceRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { LearningProgress } from '../../../domain/entities/LearningProgress';
import { LearningResource } from '../../../domain/entities/LearningResource';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { CreateProgressRequest } from '../../dtos/progress/CreateProgressRequest';
import { DomainError } from '../../../domain/errors/DomainError';

export interface CreateProgressResponse {
  progress: {
    id: string;
    userId: string;
    resourceId: string;
    completionPercentage?: number;
    timeSpentMinutes?: number;
    progressStatus: string;
    trackingType: string;
    challengesFaced?: string;
    resourcesAccessed?: boolean;
    assignmentsCompleted?: boolean;
    engagementScore: number;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    mediaAttachments?: Array<{
      mediaUrl: string;
      caption?: string;
      mediaType: string;
      filename: string;
      fileSize: number;
      mimeType: string;
    }>;
    notes?: string;
    trackingDate: string;
    createdAt: string;
    updatedAt: string;
  };
}

export class CreateProgressUseCase {
  constructor(
    private readonly progressRepository: ILearningProgressRepository,
    private readonly resourceRepository: ILearningResourceRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Execute the create progress use case
   */
  public async execute(request: CreateProgressRequest): Promise<CreateProgressResponse> {
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

    // Get target user (student)
    const targetUser = await this.userRepository.findById(request.userId);
    if (!targetUser) {
      throw DomainError.notFound('Target user');
    }

    // Get learning resource
    const learningResource = await this.resourceRepository.findById(request.resourceId);
    if (!learningResource) {
      throw DomainError.notFound('Learning resource');
    }

    // Verify authorization
    await this.verifyAuthorization(requestingUser, targetUser, learningResource, request);

    // Validate business rules
    await this.validateBusinessRules(targetUser, learningResource, request);

    // Check for existing progress on the same day
    const existingProgress = await this.checkExistingProgress(request);

    // Create progress entity
    const progress = LearningProgress.create({
      userId: request.userId,
      resourceId: request.resourceId,
      completionPercentage: request.completionPercentage,
      timeSpentMinutes: request.timeSpentMinutes,
      progressStatus: request.progressStatus,
      trackingType: request.trackingType,
      challengesFaced: request.challengesFaced,
      resourcesAccessed: request.resourcesAccessed || false,
      assignmentsCompleted: request.assignmentsCompleted || false,
      assessmentsTaken: false,
      studyNotes: request.notes,
      mediaType: 'milestone',
      verified: false,
      verifiedBy: undefined,
      verifiedAt: undefined,
      trackingDate: request.getEffectiveTrackingDate(),
    });

    // Auto-verify if created by staff or above
    if (this.shouldAutoVerify(requestingUser)) {
      progress.verify(requestingUser.getId());
    }

    // Save progress
    const savedProgress = await this.progressRepository.save(progress);

    // Update resource status if progress indicates completion
    if (request.isComplete() && learningResource.getStatus() === 'assigned') {
      learningResource.markAsCompleted();
      await this.resourceRepository.update(learningResource);
    }

    return this.formatResponse(savedProgress);
  }

  /**
   * Verify user authorization to create progress
   */
  private async verifyAuthorization(
    requestingUser: User,
    targetUser: User,
    resource: LearningResource,
    request: CreateProgressRequest
  ): Promise<void> {
    const requestingRole = requestingUser.role;

    // Users can create progress for themselves
    if (requestingUser.getId() === targetUser.getId()) {
      // Students can only create progress for their assigned resources
      if (requestingRole.equals(UserRole.student())) {
        if (resource.getAssignedStudentId() !== targetUser.getId()) {
          throw DomainError.authorization('Student can only create progress for their assigned resources');
        }
      }
      return;
    }

    // Staff and above can create progress for students
    if (!requestingRole.hasAuthorityOver(UserRole.student())) {
      throw DomainError.authorization('User does not have permission to create progress for other users');
    }

    // Verify college/department constraints
    await this.verifyInstitutionalConstraints(requestingUser, targetUser);
  }

  /**
   * Verify institutional constraints (college/department)
   */
  private async verifyInstitutionalConstraints(requestingUser: User, targetUser: User): Promise<void> {
    const requestingRole = requestingUser.role;

    // Super admin and admin can manage any user
    if (requestingRole.equals(UserRole.superAdmin()) || requestingRole.equals(UserRole.admin())) {
      return;
    }

    // Principal can manage users in their college
    if (requestingRole.equals(UserRole.principal())) {
      if (requestingUser.collegeId !== targetUser.collegeId) {
        throw DomainError.authorization('Principal can only manage users in their college');
      }
      return;
    }

    // HOD can manage users in their department
    if (requestingRole.equals(UserRole.hod())) {
      if (requestingUser.collegeId !== targetUser.collegeId ||
          requestingUser.departmentId !== targetUser.departmentId) {
        throw DomainError.authorization('HOD can only manage users in their department');
      }
      return;
    }

    // Staff can manage users in their department
    if (requestingRole.equals(UserRole.staff())) {
      if (requestingUser.collegeId !== targetUser.collegeId ||
          requestingUser.departmentId !== targetUser.departmentId) {
        throw DomainError.authorization('Staff can only manage users in their department');
      }
      return;
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    targetUser: User,
    resource: LearningResource,
    request: CreateProgressRequest
  ): Promise<void> {
    // Validate user is active
    if (!targetUser.status.canAccessResources()) {
      throw DomainError.businessRule('User must be active to create progress records');
    }

    // Validate resource is available or assigned to user
    const resourceStatus = resource.getStatus();
    if (resourceStatus === 'archived') {
      throw DomainError.businessRule('Cannot create progress for archived resources');
    }

    if (resourceStatus === 'assigned' && resource.getAssignedStudentId() !== targetUser.getId()) {
      throw DomainError.businessRule('Cannot create progress for resources assigned to other users');
    }

    // Validate completion percentage consistency
    if (request.completionPercentage === 100 && request.isStruggling()) {
      throw DomainError.businessRule('Cannot mark as 100% complete while status indicates struggling');
    }

    // Validate time spent is reasonable
    if (request.timeSpentMinutes && request.completionPercentage) {
      const timePerPercent = request.timeSpentMinutes / request.completionPercentage;
      if (timePerPercent > 10) { // More than 10 minutes per 1% seems excessive
        throw DomainError.businessRule('Time spent seems excessive for the completion percentage');
      }
    }
  }

  /**
   * Check for existing progress on the same day
   */
  private async checkExistingProgress(request: CreateProgressRequest): Promise<LearningProgress | null> {
    // Get existing progress for this user and resource
    const existingProgress = await this.progressRepository.findByUserAndResource(
      request.userId,
      request.resourceId
    );

    if (existingProgress.length > 0) {
      const trackingDate = request.getEffectiveTrackingDate();
      // Filter by same day
      const sameDay = existingProgress.filter(p => {
        const pDate = p.getTrackingDate();
        return pDate.getFullYear() === trackingDate.getFullYear() &&
               pDate.getMonth() === trackingDate.getMonth() &&
               pDate.getDate() === trackingDate.getDate();
      });

      if (sameDay.length > 0) {
        // Allow multiple progress entries per day, but warn about potential duplicates
        const sameTypeProgress = sameDay.filter(p => p.getTrackingType() === request.trackingType);
        if (sameTypeProgress.length > 0) {
          // This is a warning, not an error - allow it but could be logged
          console.warn(`Multiple ${request.trackingType} progress entries for user ${request.userId} on ${trackingDate.toDateString()}`);
        }
      }
    }

    return existingProgress.length > 0 ? existingProgress[0] : null;
  }

  /**
   * Check if progress should be auto-verified
   */
  private shouldAutoVerify(requestingUser: User): boolean {
    const role = requestingUser.role;
    return role.hasAuthorityOver(UserRole.student()) && !role.equals(UserRole.student());
  }

  /**
   * Format response for API
   */
  private formatResponse(progress: LearningProgress): CreateProgressResponse {
    return {
      progress: {
        id: progress.getId(),
        userId: progress.getUserId(),
        resourceId: progress.getResourceId(),
        completionPercentage: progress.getCompletionPercentage(),
        timeSpentMinutes: progress.getTimeSpentMinutes(),
        progressStatus: progress.getProgressStatus(),
        trackingType: progress.getTrackingType(),
        challengesFaced: progress.getChallengesFaced(),
        resourcesAccessed: progress.getResourcesAccessed(),
        assignmentsCompleted: progress.getAssignmentsCompleted(),
        engagementScore: progress.getEngagementScore(),
        isVerified: progress.isVerified(),
        verifiedBy: progress.getVerifiedBy(),
        verifiedAt: progress.getVerifiedAt()?.toISOString(),
        mediaAttachments: [],
        notes: progress.getStudyNotes(),
        trackingDate: progress.getTrackingDate().toISOString(),
        createdAt: progress.getCreatedAt().toISOString(),
        updatedAt: progress.getUpdatedAt().toISOString(),
      },
    };
  }

  /**
   * Create progress with automatic engagement scoring
   */
  public async createWithAutoEngagement(
    userId: string,
    resourceId: string,
    completionPercentage: number,
    timeSpentMinutes: number,
    requestingUserId: string,
    notes?: string
  ): Promise<CreateProgressResponse> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw DomainError.notFound('Requesting user');
    }

    // Determine progress status based on completion and time
    let progressStatus: 'excellent' | 'struggling' | 'needs_help' | 'blocked' | 'improving' = 'excellent';
    
    if (completionPercentage < 25 && timeSpentMinutes > 120) {
      progressStatus = 'struggling';
    } else if (completionPercentage < 50 && timeSpentMinutes > 180) {
      progressStatus = 'needs_help';
    } else if (completionPercentage === 0 && timeSpentMinutes > 60) {
      progressStatus = 'blocked';
    } else if (completionPercentage > 0 && completionPercentage < 75) {
      progressStatus = 'improving';
    }

    const request = CreateProgressRequest.fromPlainObject({
      userId,
      resourceId,
      completionPercentage,
      timeSpentMinutes,
      progressStatus,
      trackingType: 'learning',
      resourcesAccessed: timeSpentMinutes > 30,
      assignmentsCompleted: completionPercentage >= 100,
      notes,
      requestingUser: {
        id: requestingUser.getId(),
        role: requestingUser.role.value,
        collegeId: requestingUser.collegeId,
        departmentId: requestingUser.departmentId,
      },
    });

    return await this.execute(request);
  }
}
