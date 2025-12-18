import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * GetAssignmentSubmissionStatusUseCase
 *
 * Gets the submission status for a student's assignment.
 * Used to display submission status and graded marks in the course player.
 *
 * Process:
 * 1. Validate content block is an assignment
 * 2. Get submission if exists
 * 3. Return submission status and details
 */

export interface GetAssignmentSubmissionStatusRequest {
  contentBlockId: string;
  userId: string;
}

export interface GetAssignmentSubmissionStatusResponse {
  hasSubmitted: boolean;
  submission: {
    id: string;
    submissionText: string | null;
    submissionFiles: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      uploadedAt: Date;
    }> | null;
    submittedAt: Date;
    status: 'submitted' | 'graded' | 'returned' | 'resubmitted';
    isGraded: boolean;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    isPassed: boolean;
    feedback: string | null;
    gradedAt: Date | null;
  } | null;
}

export class GetAssignmentSubmissionStatusUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: GetAssignmentSubmissionStatusRequest): Promise<GetAssignmentSubmissionStatusResponse> {
    try {
      // Step 1: Validate content block is an assignment
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Assignment not found');
      }

      if (contentBlock.type !== 'assignment') {
        throw new DomainError('Content block is not an assignment');
      }

      // Step 2: Get submission if exists
      const submission = await this.sessionRepository.getAssignmentSubmissionByUser(
        request.userId,
        request.contentBlockId
      );

      if (!submission) {
        return {
          hasSubmitted: false,
          submission: null
        };
      }

      // Step 3: Return submission details
      return {
        hasSubmitted: true,
        submission: {
          id: submission.id,
          submissionText: submission.submissionText,
          submissionFiles: submission.submissionFiles,
          submittedAt: submission.submittedAt,
          status: submission.status,
          isGraded: submission.status === 'graded',
          score: submission.score,
          maxScore: submission.maxScore,
          percentage: submission.percentage,
          isPassed: submission.isPassed,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt
        }
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get assignment submission status: ${error.message}`);
    }
  }
}

