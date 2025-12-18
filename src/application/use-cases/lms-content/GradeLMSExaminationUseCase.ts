import { Pool } from 'pg';

export interface GradeLMSExaminationRequest {
  attemptId: string;
  staffId: string;
  subjectiveGrades: Array<{
    questionId: string;
    score: number;
    feedback?: string;
  }>;
}

export interface GradeLMSExaminationResponse {
  success: boolean;
  message: string;
  data: {
    attemptId: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
  };
}

export class GradeLMSExaminationUseCase {
  constructor(private pool: Pool) { }

  async execute(request: GradeLMSExaminationRequest): Promise<GradeLMSExaminationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Get attempt details from session_examination_attempts
      const attemptQuery = `
        SELECT
          sea.id,
          sea.examination_id,
          sea.user_id,
          sea.auto_graded_score,
          sea.manual_graded_max_score,
          sea.max_score,
          sea.status,
          e.passing_percentage,
          e.passing_score,
          e.content_map_sub_details_id
        FROM lmsact.session_examination_attempts sea
        INNER JOIN lmsact.examinations e ON sea.examination_id = e.id
        WHERE sea.id = $1
      `;
      const attemptResult = await client.query(attemptQuery, [request.attemptId]);

      if (attemptResult.rows.length === 0) {
        throw new Error('Examination attempt not found');
      }

      const attempt = attemptResult.rows[0];
      const passingThreshold = attempt.passing_percentage || attempt.passing_score || 50;

      // Step 2: Validate staff has permission to grade
      const staffPermissionQuery = `
        SELECT COUNT(*) as count
        FROM lmsact.subject_staff_assignments
        WHERE staff_id = $1
          AND content_map_sub_details_id = $2
          AND is_active = true
      `;
      const permissionResult = await client.query(staffPermissionQuery, [request.staffId, attempt.content_map_sub_details_id]);

      if (parseInt(permissionResult.rows[0].count) === 0) {
        throw new Error('You do not have permission to grade this examination');
      }

      // Step 3: Update each subjective answer with the grade
      let manualGradedScore = 0;

      for (const grade of request.subjectiveGrades) {
        const updateAnswerQuery = `
          UPDATE lmsact.examination_attempt_answers
          SET 
            points_awarded = $1,
            feedback = $2,
            graded_at = CURRENT_TIMESTAMP,
            graded_by = $3
          WHERE attempt_id = $4 AND question_id = $5
        `;
        await client.query(updateAnswerQuery, [
          grade.score,
          grade.feedback || null,
          request.staffId,
          request.attemptId,
          grade.questionId
        ]);

        manualGradedScore += grade.score;
      }

      // Step 4: Calculate total score
      const autoScore = attempt.auto_graded_score || 0;
      const totalScore = autoScore + manualGradedScore;
      const maxScore = attempt.max_score || 100;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const isPassed = percentage >= passingThreshold;

      // Step 5: Update attempt with final scores
      const updateAttemptQuery = `
        UPDATE lmsact.session_examination_attempts
        SET
          manual_graded_score = $1,
          total_score = $2,
          percentage = $3,
          is_passed = $4,
          status = 'completed',
          graded_by = $5,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `;
      await client.query(updateAttemptQuery, [
        manualGradedScore,
        totalScore,
        percentage,
        isPassed,
        request.staffId,
        request.attemptId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Examination graded successfully',
        data: {
          attemptId: request.attemptId,
          totalScore,
          maxScore,
          percentage,
          isPassed
        }
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error grading LMS examination:', error);
      throw new Error(error.message || 'Failed to grade examination');
    } finally {
      client.release();
    }
  }
}

