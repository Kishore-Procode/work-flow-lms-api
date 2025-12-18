import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';

export interface SubmitLMSAssignmentRequest {
  assignmentId: string;
  userId: string;
  submissionText?: string;
  submissionFiles?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
}

export interface SubmitLMSAssignmentResponse {
  success: boolean;
  message: string;
  submission: {
    id: string;
    assignmentId: string;
    userId: string;
    submissionText: string | null;
    submissionFiles: any;
    submittedAt: Date;
    status: string;
  };
}

export class SubmitLMSAssignmentUseCase {
  constructor(private pool: Pool) {}

  async execute(request: SubmitLMSAssignmentRequest): Promise<SubmitLMSAssignmentResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Validate assignment exists
      const assignmentQuery = `
        SELECT id, title, max_points, due_date, allow_late_submission
        FROM lmsact.assignments
        WHERE id = $1 AND is_active = true
      `;
      const assignmentResult = await client.query(assignmentQuery, [request.assignmentId]);

      if (assignmentResult.rows.length === 0) {
        throw new DomainError('Assignment not found');
      }

      const assignment = assignmentResult.rows[0];

      // Step 2: Check if student has already submitted
      const existingSubmissionQuery = `
        SELECT id FROM lmsact.session_assignment_submissions
        WHERE assignment_id = $1 AND user_id = $2
      `;
      const existingResult = await client.query(existingSubmissionQuery, [
        request.assignmentId,
        request.userId
      ]);

      if (existingResult.rows.length > 0) {
        throw new DomainError('You have already submitted this assignment. Resubmission is not allowed.');
      }

      // Step 3: Check if submission is late
      const now = new Date();
      const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
      const isLate = dueDate && now > dueDate;

      if (isLate && !assignment.allow_late_submission) {
        throw new DomainError('This assignment is past due and late submissions are not allowed.');
      }

      // Step 4: Prepare submission files with upload timestamp
      const submissionFiles = request.submissionFiles?.map(file => ({
        ...file,
        uploadedAt: new Date()
      })) || null;

      // Step 5: Create submission
      const insertQuery = `
        INSERT INTO lmsact.session_assignment_submissions (
          assignment_id,
          user_id,
          submission_text,
          submission_files,
          status,
          is_late,
          max_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, assignment_id, user_id, submission_text, submission_files, submitted_at, status
      `;

      const insertResult = await client.query(insertQuery, [
        request.assignmentId,
        request.userId,
        request.submissionText || null,
        submissionFiles ? JSON.stringify(submissionFiles) : null,
        'submitted',
        isLate,
        assignment.max_points
      ]);

      await client.query('COMMIT');

      const submission = insertResult.rows[0];

      return {
        success: true,
        message: 'Assignment submitted successfully',
        submission: {
          id: submission.id,
          assignmentId: submission.assignment_id,
          userId: submission.user_id,
          submissionText: submission.submission_text,
          submissionFiles: submission.submission_files,
          submittedAt: submission.submitted_at,
          status: submission.status
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

