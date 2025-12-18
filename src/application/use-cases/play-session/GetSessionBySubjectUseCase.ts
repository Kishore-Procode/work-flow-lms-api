import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';

/**
 * GetSessionBySubjectUseCase
 *
 * Retrieves the workflow session mapped to an LMS subject.
 * Validates that the requesting user is enrolled in the subject.
 *
 * Process:
 * 1. Validate user is enrolled in the subject
 * 2. Query subject_session_mapping to find workflow session
 * 3. Return session details from workflowmgmt.sessions
 */

export interface GetSessionBySubjectRequest {
  subjectId: string;
  userId: string;
  enrollmentId?: string; // Optional: for additional validation
}

export interface GetSessionBySubjectResponse {
  session: {
    id: string;
    title: string;
    instructor: string | null;
    durationMinutes: number | null;
    sessionDescription: string | null;
    sessionObjectives: string | null;
    detailedContent: string | null;
    status: string;
    isActive: boolean;
  };
  subjectId: string;
  enrollmentId: string | null; // Add enrollmentId to response
  hasAccess: boolean;
}

export class GetSessionBySubjectUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: GetSessionBySubjectRequest): Promise<GetSessionBySubjectResponse> {
    // Validate input
    if (!request.subjectId) {
      throw new DomainError('Subject ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }

    try {
      // Step 1: Validate user has access to this subject and get enrollmentId
      const accessResult = await this.validateUserAccess(request.subjectId, request.userId);

      if (!accessResult.hasAccess) {
        throw new DomainError('Unauthorized: You are not enrolled in this subject');
      }

      // Step 2: Get session via mapping
      const session = await this.sessionRepository.getSessionBySubjectId(request.subjectId);

      if (!session) {
        throw new DomainError('No interactive session is mapped to this subject. Please contact your instructor.');
      }

      // Step 3: Return session details
      return {
        session: {
          id: session.id,
          title: session.title,
          instructor: session.instructor,
          durationMinutes: session.durationMinutes,
          sessionDescription: session.sessionDescription,
          sessionObjectives: session.sessionObjectives,
          detailedContent: session.detailedContent,
          status: session.status,
          isActive: session.isActive,
        },
        subjectId: request.subjectId,
        enrollmentId: accessResult.enrollmentId, // Include enrollmentId in response
        hasAccess: true,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get session by subject: ${error.message}`);
    }
  }

  /**
   * Validate that the user is enrolled in the subject and return enrollmentId
   */
  private async validateUserAccess(subjectId: string, userId: string): Promise<{ hasAccess: boolean; enrollmentId: string | null }> {
    try {
      // Check if user has an active enrollment for this subject
      const enrollments = await this.enrollmentRepository.findByStudentId(userId);

      console.log('🔍 Validating user access:', {
        userId,
        subjectId,
        totalEnrollments: enrollments.length,
        enrollmentSubjectIds: enrollments.map(e => e.getContentMapSubDetailsId()),
        enrollmentStatuses: enrollments.map(e => e.getStatus()),
      });

      let foundEnrollmentId: string | null = null;

      const hasEnrollment = enrollments.some(
        enrollment => {
          const matches = enrollment.getContentMapSubDetailsId() === subjectId &&
            (enrollment.getStatus() === 'active' ||
             enrollment.getStatus() === 'completed'); // ✅ Allow completed status

          if (enrollment.getContentMapSubDetailsId() === subjectId) {
            console.log('✅ Found matching enrollment:', {
              enrollmentId: enrollment.getId(),
              status: enrollment.getStatus(),
              matches,
            });

            if (matches) {
              foundEnrollmentId = enrollment.getId();
            }
          }

          return matches;
        }
      );

      console.log('🔍 Access validation result:', { hasEnrollment, enrollmentId: foundEnrollmentId });
      return { hasAccess: hasEnrollment, enrollmentId: foundEnrollmentId };
    } catch (error) {
      console.error('❌ Error validating user access:', error);
      return { hasAccess: false, enrollmentId: null };
    }
  }
}

