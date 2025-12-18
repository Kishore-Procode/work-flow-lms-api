import { Pool } from 'pg';

export interface GetLMSAssignmentSubmissionStatusRequest {
  assignmentId: string;
  userId: string;
}

export interface GetLMSAssignmentSubmissionStatusResponse {
  success: boolean;
  data: {
    hasSubmitted: boolean;
    submission?: {
      id: string;
      submissionText: string | null;
      submissionFiles: any;
      submittedAt: Date;
      status: string;
      score: number | null;
      maxScore: number;
      feedback: string | null;
      gradedAt: Date | null;
      isLate: boolean;
    };
  };
}

export class GetLMSAssignmentSubmissionStatusUseCase {
  constructor(private pool: Pool) {}

  async execute(request: GetLMSAssignmentSubmissionStatusRequest): Promise<GetLMSAssignmentSubmissionStatusResponse> {
    console.log('🔍 GetLMSAssignmentSubmissionStatusUseCase - Request:', request);

    const query = `
      SELECT
        id,
        submission_text,
        submission_files,
        submitted_at,
        status,
        score,
        max_score,
        feedback,
        graded_at,
        is_late
      FROM lmsact.session_assignment_submissions
      WHERE assignment_id = $1 AND user_id = $2
    `;

    const result = await this.pool.query(query, [request.assignmentId, request.userId]);
    console.log(`📊 Found ${result.rows.length} submissions for assignment ${request.assignmentId}`);

    if (result.rows.length === 0) {
      console.log('⚠️ No submission found, returning hasSubmitted: false');
      return {
        success: true,
        data: {
          hasSubmitted: false
        }
      };
    }

    console.log('✅ Submission found:', result.rows[0]);

    const submission = result.rows[0];

    return {
      success: true,
      data: {
        hasSubmitted: true,
        submission: {
          id: submission.id,
          submissionText: submission.submission_text,
          submissionFiles: submission.submission_files,
          submittedAt: submission.submitted_at,
          status: submission.status,
          score: submission.score,
          maxScore: submission.max_score,
          feedback: submission.feedback,
          gradedAt: submission.graded_at,
          isLate: submission.is_late
        }
      }
    };
  }
}

