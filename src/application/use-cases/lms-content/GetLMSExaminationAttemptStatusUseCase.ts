import { Pool } from 'pg';

interface GetLMSExaminationAttemptStatusRequest {
    examinationId: string;
    userId: string;
}

interface GetLMSExaminationAttemptStatusResponse {
    success: boolean;
    hasAttempt: boolean;
    attempt?: {
        id: string;
        examinationId: string;
        studentId: string;
        totalScore: number;
        percentage: number;
        isPassed: boolean;
        completedAt: string;
        status: string;
    };
}

/**
 * Use case: Get LMS examination attempt status for a student
 */
export class GetLMSExaminationAttemptStatusUseCase {
    constructor(private pool: Pool) { }

    async execute(request: GetLMSExaminationAttemptStatusRequest): Promise<GetLMSExaminationAttemptStatusResponse> {
        try {
            // Query to get examination attempt for the student from session_examination_attempts
            const query = `
                SELECT 
                    sea.id,
                    sea.examination_id,
                    sea.user_id,
                    sea.total_score,
                    sea.percentage,
                    sea.is_passed,
                    sea.submitted_at as completed_at,
                    sea.status
                FROM lmsact.session_examination_attempts sea
                WHERE sea.examination_id = $1 AND sea.user_id = $2
                ORDER BY sea.submitted_at DESC
                LIMIT 1
            `;

            const result = await this.pool.query(query, [request.examinationId, request.userId]);

            if (result.rows.length === 0) {
                return {
                    success: true,
                    hasAttempt: false
                };
            }

            const attempt = result.rows[0];

            return {
                success: true,
                hasAttempt: true,
                attempt: {
                    id: attempt.id,
                    examinationId: attempt.examination_id,
                    studentId: attempt.user_id,
                    totalScore: attempt.total_score,
                    percentage: attempt.percentage,
                    isPassed: attempt.is_passed,
                    completedAt: attempt.completed_at,
                    status: attempt.status
                }
            };
        } catch (error: any) {
            console.error('Error in GetLMSExaminationAttemptStatusUseCase:', error);
            throw new Error(`Failed to get examination attempt status: ${error.message}`);
        }
    }
}
