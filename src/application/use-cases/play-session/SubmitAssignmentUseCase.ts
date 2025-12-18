import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * SubmitAssignmentUseCase
 *
 * Submits a student's assignment with text and/or file submissions.
 *
 * Process:
 * 1. Validate content block is an assignment
 * 2. Check if student has already submitted
 * 3. Validate submission format matches requirements
 * 4. Save assignment submission
 * 5. Return submission details
 */

export interface SubmitAssignmentRequest {
  contentBlockId: string;
  userId: string;
  submissionText?: string;
  submissionFiles?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
}

export interface SubmitAssignmentResponse {
  submission: {
    id: string;
    contentBlockId: string;
    userId: string;
    submissionText: string | null;
    submissionFiles: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      uploadedAt: Date;
    }> | null;
    submittedAt: Date;
    status: string;
  };
  message: string;
}

export class SubmitAssignmentUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: SubmitAssignmentRequest): Promise<SubmitAssignmentResponse> {
    try {
      // Step 1: Validate content block is an assignment
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Assignment not found');
      }

      if (contentBlock.type !== 'assignment') {
        throw new DomainError('Content block is not an assignment');
      }

      // Step 2: Check if student has already submitted
      const existingSubmission = await this.sessionRepository.getAssignmentSubmissionByUser(
        request.userId,
        request.contentBlockId
      );

      if (existingSubmission) {
        throw new DomainError('You have already submitted this assignment. Resubmission is not allowed.');
      }

      // Step 3: Validate submission format
      const contentData = contentBlock.contentData as any;
      const submissionFormat = contentData.submissionFormat || 'both'; // 'text', 'file', 'both'

      if (submissionFormat === 'text' && !request.submissionText) {
        throw new DomainError('Text submission is required for this assignment');
      }

      if (submissionFormat === 'file' && (!request.submissionFiles || request.submissionFiles.length === 0)) {
        throw new DomainError('File submission is required for this assignment');
      }

      if (submissionFormat === 'both' && !request.submissionText && (!request.submissionFiles || request.submissionFiles.length === 0)) {
        throw new DomainError('Either text or file submission is required for this assignment');
      }

      // Step 4: Prepare submission files with upload timestamp
      const submissionFiles = request.submissionFiles?.map(file => ({
        ...file,
        uploadedAt: new Date()
      })) || null;

      // Step 5: Save assignment submission
      const maxScore = contentData.maxPoints || 100;
      const submission = await this.sessionRepository.createAssignmentSubmission({
        contentBlockId: request.contentBlockId,
        userId: request.userId,
        submissionText: request.submissionText || null,
        submissionFiles,
        gradedBy: null,
        gradedAt: null,
        score: null,
        maxScore,
        percentage: null,
        isPassed: false,
        feedback: null,
        rubricScores: null,
        status: 'submitted'
      });

      // Step 6: Return success response
      return {
        submission: {
          id: submission.id,
          contentBlockId: submission.contentBlockId,
          userId: submission.userId,
          submissionText: submission.submissionText,
          submissionFiles: submission.submissionFiles,
          submittedAt: submission.submittedAt,
          status: submission.status
        },
        message: 'Assignment submitted successfully! Your submission will be graded by your instructor.'
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to submit assignment: ${error.message}`);
    }
  }
}

