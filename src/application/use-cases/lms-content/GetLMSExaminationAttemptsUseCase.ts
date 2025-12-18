import { Pool } from 'pg';

export interface GetLMSExaminationAttemptsRequest {
  staffId: string;
}

export interface GetLMSExaminationAttemptsResponse {
  success: boolean;
  data: Array<{
    id: string;
    examination_id: string;
    examination_title: string;
    subject_name: string;
    subject_code: string;
    student_name: string;
    student_email: string;
    started_at: Date;
    completed_at: Date;
    time_spent: number;
    status: string;
    total_score: number;
    max_score: number;
    percentage: number;
    is_passed: boolean;
    answers: Array<{
      id: string;
      question_id: string;
      question_text: string;
      question_type: string;
      answer_text: string;
      correct_answer: string;
      is_correct: boolean | null;
      points_awarded: number | null;
      points: number;
    }>;
  }>;
}

export class GetLMSExaminationAttemptsUseCase {
  constructor(private pool: Pool) { }

  async execute(request: GetLMSExaminationAttemptsRequest): Promise<GetLMSExaminationAttemptsResponse> {
    try {
      // Get all examination attempts for examinations in subjects assigned to this staff member
      // Uses session_examination_attempts table (which has FK from examination_attempt_answers)
      const query = `
        SELECT
          sea.id,
          sea.examination_id,
          e.title as examination_title,
          csub.act_subject_name as subject_name,
          csub.act_subject_code as subject_code,
          u.name as student_name,
          u.email as student_email,
          sea.started_at,
          sea.submitted_at as completed_at,
          sea.time_taken as time_spent,
          sea.status,
          sea.total_score,
          sea.max_score,
          sea.percentage,
          sea.is_passed
        FROM lmsact.session_examination_attempts sea
        INNER JOIN lmsact.examinations e ON sea.examination_id = e.id
        INNER JOIN lmsact.content_map_sub_details csub ON e.content_map_sub_details_id = csub.id
        INNER JOIN lmsact.subject_staff_assignments ssa ON csub.id = ssa.content_map_sub_details_id
        INNER JOIN lmsact.users u ON sea.user_id = u.id
        WHERE ssa.staff_id = $1
          AND ssa.is_active = true
          AND e.is_active = true
          AND sea.examination_id IS NOT NULL
        ORDER BY sea.submitted_at DESC NULLS LAST
      `;

      const result = await this.pool.query(query, [request.staffId]);
      const attempts = result.rows;

      // For each attempt, get the answers from examination_attempt_answers table
      const attemptsWithAnswers = [];

      for (const attempt of attempts) {
        const answersQuery = `
          SELECT
            eaa.id,
            eaa.question_id,
            eq.question_text,
            eq.question_type,
            eaa.answer_text,
            eq.correct_answer,
            eaa.is_correct,
            eaa.points_awarded,
            eq.points
          FROM lmsact.examination_attempt_answers eaa
          INNER JOIN lmsact.examination_questions eq ON eaa.question_id = eq.id
          WHERE eaa.attempt_id = $1
          ORDER BY eq.order_index
        `;

        const answersResult = await this.pool.query(answersQuery, [attempt.id]);

        attemptsWithAnswers.push({
          ...attempt,
          answers: answersResult.rows
        });
      }

      return {
        success: true,
        data: attemptsWithAnswers
      };
    } catch (error: any) {
      console.error('❌ Error getting LMS examination attempts:', error);
      throw new Error(error.message || 'Failed to get examination attempts');
    }
  }
}

