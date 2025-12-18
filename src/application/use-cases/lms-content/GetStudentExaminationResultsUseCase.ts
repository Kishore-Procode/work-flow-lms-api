import { Pool } from 'pg';

interface GetStudentExaminationResultsRequest {
    examinationId: string;
    userId: string;
}

interface GetStudentExaminationResultsResponse {
    success: boolean;
    data: {
        attemptId: string;
        examinationId: string;
        examinationTitle: string;
        totalScore: number;
        maxScore: number;
        percentage: number;
        isPassed: boolean;
        status: string;
        submittedAt: Date;
        answers: Array<{
            questionId: string;
            questionText: string;
            questionType: string;
            studentAnswer: string;
            correctAnswer: string;
            isCorrect: boolean | null;
            pointsAwarded: number | null;
            maxPoints: number;
            feedback?: string;
        }>;
    } | null;
}

/**
 * Use case: Get examination results for a student to review
 */
export class GetStudentExaminationResultsUseCase {
    constructor(private pool: Pool) { }

    async execute(request: GetStudentExaminationResultsRequest): Promise<GetStudentExaminationResultsResponse> {
        try {
            // Get examination attempt
            const attemptQuery = `
        SELECT 
          sea.id,
          sea.examination_id,
          sea.total_score,
          sea.max_score,
          sea.percentage,
          sea.is_passed,
          sea.status,
          sea.submitted_at,
          e.title as examination_title,
          COALESCE(e.show_results, true) as show_results,
          COALESCE(e.allow_review, true) as allow_review
        FROM lmsact.session_examination_attempts sea
        INNER JOIN lmsact.examinations e ON sea.examination_id = e.id
        WHERE sea.examination_id = $1 AND sea.user_id = $2
        ORDER BY sea.submitted_at DESC
        LIMIT 1
      `;

            const attemptResult = await this.pool.query(attemptQuery, [request.examinationId, request.userId]);

            if (attemptResult.rows.length === 0) {
                return {
                    success: true,
                    data: null
                };
            }

            const attempt = attemptResult.rows[0];

            // Check if results viewing is allowed
            if (!attempt.show_results && !attempt.allow_review) {
                return {
                    success: true,
                    data: {
                        attemptId: attempt.id,
                        examinationId: attempt.examination_id,
                        examinationTitle: attempt.examination_title,
                        totalScore: attempt.total_score,
                        maxScore: attempt.max_score,
                        percentage: attempt.percentage,
                        isPassed: attempt.is_passed,
                        status: attempt.status,
                        submittedAt: attempt.submitted_at,
                        answers: [] // Don't show answers if review is not allowed
                    }
                };
            }

            // Get answers with question details
            const answersQuery = `
        SELECT
          eaa.question_id,
          eq.question_text,
          eq.question_type,
          eaa.answer_text as student_answer,
          eq.correct_answer,
          eaa.is_correct,
          eaa.points_awarded,
          eq.points as max_points,
          eaa.feedback
        FROM lmsact.examination_attempt_answers eaa
        INNER JOIN lmsact.examination_questions eq ON eaa.question_id = eq.id
        WHERE eaa.attempt_id = $1
        ORDER BY eq.order_index
      `;

            const answersResult = await this.pool.query(answersQuery, [attempt.id]);

            // Parse correct answers for display
            const answers = answersResult.rows.map(answer => {
                let correctAnswer = answer.correct_answer;

                // Parse JSON if needed
                if (correctAnswer && typeof correctAnswer === 'string') {
                    try {
                        correctAnswer = JSON.parse(correctAnswer);
                    } catch {
                        // Not JSON, use as-is
                    }
                }

                // Format correct answer for display
                let displayCorrectAnswer = '';
                if (typeof correctAnswer === 'string') {
                    displayCorrectAnswer = correctAnswer;
                } else if (typeof correctAnswer === 'boolean') {
                    displayCorrectAnswer = correctAnswer ? 'True' : 'False';
                } else if (Array.isArray(correctAnswer)) {
                    displayCorrectAnswer = correctAnswer.join(', ');
                } else if (correctAnswer !== null && correctAnswer !== undefined) {
                    displayCorrectAnswer = String(correctAnswer);
                }

                return {
                    questionId: answer.question_id,
                    questionText: answer.question_text,
                    questionType: answer.question_type,
                    studentAnswer: answer.student_answer || '',
                    correctAnswer: displayCorrectAnswer,
                    isCorrect: answer.is_correct,
                    pointsAwarded: answer.points_awarded,
                    maxPoints: answer.max_points,
                    feedback: answer.feedback
                };
            });

            return {
                success: true,
                data: {
                    attemptId: attempt.id,
                    examinationId: attempt.examination_id,
                    examinationTitle: attempt.examination_title,
                    totalScore: attempt.total_score,
                    maxScore: attempt.max_score,
                    percentage: attempt.percentage,
                    isPassed: attempt.is_passed,
                    status: attempt.status,
                    submittedAt: attempt.submitted_at,
                    answers
                }
            };
        } catch (error: any) {
            console.error('Error getting student examination results:', error);
            throw new Error(`Failed to get examination results: ${error.message}`);
        }
    }
}
