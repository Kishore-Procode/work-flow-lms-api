import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { CertificateGenerationService } from '../../services/CertificateGenerationService';
import { Pool } from 'pg';

/**
 * GradeExaminationManuallyUseCase
 *
 * Handles manual grading of subjective examination questions by staff.
 * Process:
 * 1. Validate examination attempt exists and is in 'auto_graded' status
 * 2. Validate grader has permission (staff assigned to the subject)
 * 3. Update manual grading scores for subjective questions
 * 4. Calculate total score (auto + manual)
 * 5. Determine pass/fail based on passing percentage
 * 6. Mark content block as complete
 * 7. Generate certificate if passed
 */

export interface ManualGradeInput {
  questionId: string;
  pointsAwarded: number;
  feedback?: string;
}

export interface GradeExaminationManuallyRequest {
  attemptId: string;
  gradedBy: string; // Staff user ID
  manualGrades: ManualGradeInput[];
}

export interface GradeExaminationManuallyResponse {
  success: boolean;
  message: string;
  data: {
    attemptId: string;
    autoGradedScore: number;
    manualGradedScore: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    certificateGenerated: boolean;
  };
}

export class GradeExaminationManuallyUseCase {
  private certificateService: CertificateGenerationService;

  constructor(
    private sessionRepository: IWorkflowSessionRepository,
    private pool: Pool
  ) {
    this.certificateService = new CertificateGenerationService(pool);
  }

  async execute(request: GradeExaminationManuallyRequest): Promise<GradeExaminationManuallyResponse> {
    try {
      // Step 1: Get examination attempt
      const attemptQuery = `
        SELECT 
          sea.*,
          scb.content_data,
          scb.session_id::text
        FROM lmsact.session_examination_attempts sea
        JOIN workflowmgmt.session_content_blocks scb ON sea.content_block_id = scb.id
        WHERE sea.id = $1::uuid
      `;
      const attemptResult = await this.pool.query(attemptQuery, [request.attemptId]);

      if (attemptResult.rows.length === 0) {
        throw DomainError.notFound('Examination attempt');
      }

      const attempt = attemptResult.rows[0];

      if (attempt.status !== 'auto_graded') {
        throw DomainError.businessRule('This examination has already been graded or is not ready for manual grading');
      }

      // Step 2: Validate grader has permission (staff assigned to subject)
      // TODO: Add authorization check based on staff_subject_assignments

      // Step 3: Get examination questions
      const questions = await this.sessionRepository.getQuizQuestionsByBlockId(attempt.content_block_id);
      const manualGradingQuestions = questions.filter(q =>
        ['short_answer', 'long_answer'].includes(q.questionType)
      );

      // Step 4: Validate manual grades
      const manualGradedMaxScore = manualGradingQuestions.reduce((sum, q) => sum + q.points, 0);
      let manualGradedScore = 0;

      const updatedAnswers = JSON.parse(attempt.answers);

      for (const grade of request.manualGrades) {
        const question = manualGradingQuestions.find(q => q.id === grade.questionId);
        if (!question) {
          throw DomainError.validation(`Question ${grade.questionId} not found or not a manual grading question`);
        }

        if (grade.pointsAwarded < 0 || grade.pointsAwarded > question.points) {
          throw DomainError.validation(
            `Points awarded for question ${grade.questionId} must be between 0 and ${question.points}`
          );
        }

        manualGradedScore += grade.pointsAwarded;

        // Update answer details
        const answerIndex = updatedAnswers.findIndex((a: any) => a.questionId === grade.questionId);
        if (answerIndex !== -1) {
          updatedAnswers[answerIndex].pointsAwarded = grade.pointsAwarded;
          updatedAnswers[answerIndex].feedback = grade.feedback || null;
          updatedAnswers[answerIndex].gradedBy = request.gradedBy;
          updatedAnswers[answerIndex].gradedAt = new Date().toISOString();
        }
      }

      // Step 5: Calculate total score
      const autoGradedScore = parseFloat(attempt.auto_graded_score);
      const autoGradedMaxScore = parseFloat(attempt.auto_graded_max_score);
      const totalScore = autoGradedScore + manualGradedScore;
      const maxScore = autoGradedMaxScore + manualGradedMaxScore;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passingScore = attempt.content_data?.passingScore || 50;
      const isPassed = percentage >= passingScore;

      // Step 6: Update examination attempt
      const updateAttemptQuery = `
        UPDATE lmsact.session_examination_attempts
        SET 
          answers = $1,
          manual_graded_score = $2,
          total_score = $3,
          percentage = $4,
          is_passed = $5,
          graded_by = $6::uuid,
          graded_at = CURRENT_TIMESTAMP,
          completed_at = CURRENT_TIMESTAMP,
          status = 'completed'
        WHERE id = $7::uuid
      `;

      await this.pool.query(updateAttemptQuery, [
        JSON.stringify(updatedAnswers),
        manualGradedScore,
        totalScore,
        percentage,
        isPassed,
        request.gradedBy,
        request.attemptId,
      ]);

      // Step 7: Mark content block as complete
      await this.sessionRepository.markContentAsComplete(
        attempt.content_block_id,
        attempt.user_id,
        { examinationPassed: isPassed, score: totalScore, percentage }
      );

      // Step 8: Generate certificate if passed
      let certificateGenerated = false;
      if (isPassed) {
        try {
          // Get subject information
          const subjectQuery = `
            SELECT
              cms.subject_id::text,
              sub.name as subject_name,
              sub.code as subject_code
            FROM workflowmgmt.sessions s
            JOIN lmsact.content_map_sub_details cms ON s.id = cms.session_id
            JOIN lmsact.subjects sub ON cms.subject_id = sub.id
            WHERE s.id = $1::uuid
            LIMIT 1
          `;
          const subjectResult = await this.pool.query(subjectQuery, [attempt.session_id]);

          if (subjectResult.rows.length > 0) {
            const subject = subjectResult.rows[0];

            // Fetch user details
            const userResult = await this.pool.query(
              'SELECT name FROM lmsact.users WHERE id = $1::uuid',
              [attempt.user_id]
            );

            if (userResult.rows.length > 0) {
              const userName = userResult.rows[0].name;

              // Generate certificate using CertificateGenerationService
              await this.certificateService.generateCertificate({
                userId: attempt.user_id,
                userName,
                subjectId: subject.subject_id,
                subjectName: subject.subject_name,
                subjectCode: subject.subject_code,
                sessionId: attempt.session_id,
                examinationAttemptId: request.attemptId,
                finalScore: totalScore,
                percentage,
                completedAt: new Date()
              });

              certificateGenerated = true;
            }
          }
        } catch (certError) {
          console.error('Failed to generate certificate:', certError);
          // Don't fail the grading if certificate generation fails
        }
      }

      return {
        success: true,
        message: isPassed
          ? 'Examination graded successfully. Student has passed!'
          : 'Examination graded successfully. Student did not pass.',
        data: {
          attemptId: request.attemptId,
          autoGradedScore,
          manualGradedScore,
          totalScore,
          maxScore,
          percentage: Math.round(percentage * 100) / 100,
          isPassed,
          certificateGenerated,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('GradeExaminationManuallyUseCase error:', error);
      throw new DomainError('Failed to grade examination');
    }
  }

  private calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  }
}

