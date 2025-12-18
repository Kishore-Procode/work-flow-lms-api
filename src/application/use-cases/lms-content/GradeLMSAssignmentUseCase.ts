import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';

export interface GradeLMSAssignmentRequest {
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

export interface GradeLMSAssignmentResponse {
  success: boolean;
  message: string;
  submission: any;
}

export class GradeLMSAssignmentUseCase {
  constructor(private pool: Pool) {}

  async execute(request: GradeLMSAssignmentRequest): Promise<GradeLMSAssignmentResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Get submission details
      const submissionQuery = `
        SELECT
          sub.id,
          sub.assignment_id,
          sub.user_id,
          sub.status,
          a.content_map_sub_details_id
        FROM lmsact.session_assignment_submissions sub
        INNER JOIN lmsact.assignments a ON sub.assignment_id = a.id
        WHERE sub.id = $1
      `;

      const submissionResult = await client.query(submissionQuery, [request.submissionId]);

      if (submissionResult.rows.length === 0) {
        throw new DomainError('Assignment submission not found');
      }

      const submissionData = submissionResult.rows[0];

      // Step 2: Validate staff has permission to grade
      // Check if staff is assigned to the subject
      const permissionQuery = `
        SELECT COUNT(*) as count
        FROM lmsact.subject_staff_assignments ssa
        WHERE ssa.staff_id = $1
          AND ssa.content_map_sub_details_id = $2
          AND ssa.is_active = true
      `;

      const permissionResult = await client.query(permissionQuery, [
        request.staffId,
        submissionData.content_map_sub_details_id
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

      // Step 5: Calculate percentage and pass status
      const percentage = (request.score / request.maxScore) * 100;
      const isPassed = percentage >= 50; // 50% passing threshold

      // Step 6: Update submission with grading
      const updateQuery = `
        UPDATE lmsact.session_assignment_submissions
        SET
          graded_by = $1,
          graded_at = NOW(),
          score = $2,
          max_score = $3,
          percentage = $4,
          is_passed = $5,
          feedback = $6,
          rubric_scores = $7,
          status = 'graded'
        WHERE id = $8
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        request.staffId,
        request.score,
        request.maxScore,
        percentage,
        isPassed,
        request.feedback || null,
        request.rubricScores ? JSON.stringify(request.rubricScores) : null,
        request.submissionId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Assignment graded successfully',
        submission: updateResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

