import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * GradeAssignmentUseCase
 *
 * Grades a student's assignment submission and automatically marks content as complete if passed.
 *
 * Process:
 * 1. Validate staff has permission to grade (assigned to subject)
 * 2. Validate submission exists and is not already graded
 * 3. Validate score is within valid range
 * 4. Save grading details
 * 5. Auto-complete content block if student passed
 * 6. Return grading result
 */

export interface GradeAssignmentRequest {
  submissionId: string;
  staffId: string;
  score: number;
  maxScore: number;
  feedback?: string;
  rubricScores?: Array<{
    criteria: string;
    score: number;
    maxScore: number;
    comments?: string;
  }>;
}

export interface GradeAssignmentResponse {
  submission: {
    id: string;
    contentBlockId: string;
    userId: string;
    score: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    feedback: string | null;
    gradedAt: Date;
    status: string;
  };
  message: string;
}

export class GradeAssignmentUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: GradeAssignmentRequest): Promise<GradeAssignmentResponse> {
    try {
      // Step 1: Get submission details
      const submissionQuery = `
        SELECT
          sub.id,
          sub.content_block_id,
          sub.user_id,
          sub.status,
          cb.session_id,
          cb.content_data
        FROM workflowmgmt.session_assignment_submissions sub
        INNER JOIN workflowmgmt.session_content_blocks cb ON sub.content_block_id = cb.id
        WHERE sub.id = $1
      `;

      const submissionResult = await this.pool.query(submissionQuery, [request.submissionId]);

      if (submissionResult.rows.length === 0) {
        throw new DomainError('Assignment submission not found');
      }

      const submissionData = submissionResult.rows[0];

      // Step 2: Validate staff has permission to grade
      // Check if staff is assigned to the subject that contains this assignment
      const permissionQuery = `
        SELECT COUNT(*) as count
        FROM lmsact.subject_staff_assignments ssa
        INNER JOIN lmsact.subject_session_mapping ssm ON ssa.content_map_sub_details_id = ssm.content_map_sub_details_id
        WHERE ssa.staff_id = $1
          AND ssm.workflow_session_id = $2
          AND ssa.is_active = true
          AND ssm.is_active = true
      `;

      const permissionResult = await this.pool.query(permissionQuery, [
        request.staffId,
        submissionData.session_id
      ]);

      if (parseInt(permissionResult.rows[0].count) === 0) {
        throw new DomainError('You do not have permission to grade this assignment');
      }

      // Step 3: Validate submission is not already graded
      if (submissionData.status === 'graded') {
        throw new DomainError('This assignment has already been graded');
      }

      // Step 4: Validate score
      if (request.score < 0 || request.score > request.maxScore) {
        throw new DomainError(`Score must be between 0 and ${request.maxScore}`);
      }

      // Step 5: Grade the assignment
      const gradedSubmission = await this.sessionRepository.gradeAssignmentSubmission(
        request.submissionId,
        {
          gradedBy: request.staffId,
          score: request.score,
          maxScore: request.maxScore,
          feedback: request.feedback,
          rubricScores: request.rubricScores
        }
      );

      // Step 6: Auto-complete content block if student passed
      if (gradedSubmission.isPassed) {
        await this.updateProgressOnPass(
          submissionData.content_block_id,
          submissionData.user_id
        );
      }

      // Step 7: Return success response
      return {
        submission: {
          id: gradedSubmission.id,
          contentBlockId: gradedSubmission.contentBlockId,
          userId: gradedSubmission.userId,
          score: gradedSubmission.score!,
          maxScore: gradedSubmission.maxScore!,
          percentage: gradedSubmission.percentage!,
          isPassed: gradedSubmission.isPassed,
          feedback: gradedSubmission.feedback,
          gradedAt: gradedSubmission.gradedAt!,
          status: gradedSubmission.status
        },
        message: `Assignment graded successfully. Student ${gradedSubmission.isPassed ? 'passed' : 'did not pass'}.`
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to grade assignment: ${error.message}`);
    }
  }

  /**
   * Update progress when assignment is passed
   * Marks the content block as completed
   */
  private async updateProgressOnPass(contentBlockId: string, userId: string): Promise<void> {
    try {
      await this.sessionRepository.createOrUpdateProgress({
        contentBlockId,
        userId,
        isCompleted: true,
        timeSpent: 0,
        completionData: { assignmentPassed: true },
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to update progress on assignment pass:', error);
      // Don't throw error - grading should still succeed even if progress update fails
    }
  }
}

