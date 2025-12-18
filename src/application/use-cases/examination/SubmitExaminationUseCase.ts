import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * SubmitExaminationUseCase
 *
 * Handles examination submission by students.
 * Process:
 * 1. Validate examination exists and is active
 * 2. Check if student has already attempted (one attempt only)
 * 3. Check if course is 100% complete (prerequisite for examination)
 * 4. Create examination attempt record
 * 5. Auto-grade objective questions (single_choice, multiple_choice, true_false)
 * 6. Mark subjective questions for manual grading (short_answer, long_answer)
 * 7. Calculate auto-graded score
 * 8. Return submission result
 */

export interface ExaminationAnswer {
  questionId: string;
  answer: string | string[]; // String for single choice, array for multiple choice
}

export interface SubmitExaminationRequest {
  contentBlockId: string; // Examination content block ID
  userId: string; // Student ID
  answers: ExaminationAnswer[];
  timeSpent: number; // Time spent in seconds
}

export interface SubmitExaminationResponse {
  success: boolean;
  message: string;
  data: {
    attemptId: string;
    autoGradedScore: number;
    autoGradedMaxScore: number;
    manualGradingPending: boolean;
    totalQuestions: number;
    autoGradedQuestions: number;
    manualGradingQuestions: number;
  };
}

export class SubmitExaminationUseCase {
  constructor(
    private sessionRepository: IWorkflowSessionRepository,
    private pool: Pool
  ) {}

  async execute(request: SubmitExaminationRequest): Promise<SubmitExaminationResponse> {
    try {
      // Step 1: Validate examination exists
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);
      if (!contentBlock || contentBlock.type !== 'examination') {
        throw DomainError.notFound('Examination');
      }

      // Step 2: Check if student has already attempted
      const existingAttemptQuery = `
        SELECT id FROM lmsact.session_examination_attempts
        WHERE content_block_id = $1::uuid AND user_id = $2::uuid
      `;
      const existingAttempt = await this.pool.query(existingAttemptQuery, [
        request.contentBlockId,
        request.userId,
      ]);

      if (existingAttempt.rows.length > 0) {
        throw DomainError.businessRule('You have already attempted this examination. Only one attempt is allowed.');
      }

      // Step 3: Check if course is 100% complete
      const courseCompletionQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE scb.is_required = true) as required_blocks,
          COUNT(*) FILTER (WHERE scb.is_required = true AND scp.is_completed = true) as completed_blocks
        FROM workflowmgmt.session_content_blocks scb
        LEFT JOIN workflowmgmt.session_content_progress scp 
          ON scb.id = scp.content_block_id AND scp.user_id = $1::uuid
        WHERE scb.session_id = $2::uuid
          AND scb.type != 'examination'
          AND scb.is_active = true
      `;
      const completionResult = await this.pool.query(courseCompletionQuery, [
        request.userId,
        contentBlock.sessionId,
      ]);

      const { required_blocks, completed_blocks } = completionResult.rows[0];
      if (parseInt(required_blocks) > parseInt(completed_blocks)) {
        throw DomainError.businessRule('You must complete all required course content before taking the examination.');
      }

      // Step 4: Get examination questions
      const questions = await this.sessionRepository.getQuizQuestionsByBlockId(request.contentBlockId);
      if (questions.length === 0) {
        throw DomainError.validation('Examination has no questions');
      }

      // Step 5: Auto-grade objective questions
      let autoGradedScore = 0;
      let autoGradedMaxScore = 0;
      let manualGradingQuestions = 0;
      const answerDetails: any[] = [];

      for (const question of questions) {
        const studentAnswer = request.answers.find(a => a.questionId === question.id);
        const answerData: any = {
          questionId: question.id,
          questionType: question.questionType,
          points: question.points,
          studentAnswer: studentAnswer?.answer || null,
        };

        if (['single_choice', 'multiple_choice', 'true_false'].includes(question.questionType)) {
          // Auto-gradable question
          autoGradedMaxScore += question.points;
          
          if (studentAnswer) {
            const isCorrect = this.checkAnswer(
              question.questionType,
              studentAnswer.answer,
              question.correctAnswer
            );
            
            if (isCorrect) {
              autoGradedScore += question.points;
              answerData.isCorrect = true;
              answerData.pointsAwarded = question.points;
            } else {
              answerData.isCorrect = false;
              answerData.pointsAwarded = 0;
            }
          } else {
            answerData.isCorrect = false;
            answerData.pointsAwarded = 0;
          }
        } else {
          // Manual grading required
          manualGradingQuestions++;
          answerData.requiresManualGrading = true;
        }

        answerDetails.push(answerData);
      }

      // Step 6: Create examination attempt record
      const manualGradedMaxScore = questions
        .filter(q => ['short_answer', 'long_answer'].includes(q.questionType))
        .reduce((sum, q) => sum + q.points, 0);

      const maxScore = autoGradedMaxScore + manualGradedMaxScore;
      const status = manualGradingQuestions > 0 ? 'auto_graded' : 'completed';

      const insertAttemptQuery = `
        INSERT INTO lmsact.session_examination_attempts (
          content_block_id,
          user_id,
          answers,
          auto_graded_score,
          auto_graded_max_score,
          manual_graded_score,
          manual_graded_max_score,
          max_score,
          time_taken,
          status
        ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id::text
      `;

      const attemptResult = await this.pool.query(insertAttemptQuery, [
        request.contentBlockId,
        request.userId,
        JSON.stringify(answerDetails),
        autoGradedScore,
        autoGradedMaxScore,
        0, // manual_graded_score (to be filled by staff)
        manualGradedMaxScore,
        maxScore,
        request.timeSpent,
        status,
      ]);

      const attemptId = attemptResult.rows[0].id;

      // Step 7: If no manual grading needed, calculate final score and mark as complete
      if (manualGradingQuestions === 0) {
        const totalScore = autoGradedScore;
        const maxScore = autoGradedMaxScore;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const passingScore = contentBlock.contentData?.passingScore || 50;
        const isPassed = percentage >= passingScore;

        await this.pool.query(
          `UPDATE lmsact.session_examination_attempts
           SET total_score = $1, percentage = $2, is_passed = $3, submitted_at = CURRENT_TIMESTAMP, status = 'completed'
           WHERE id = $4::uuid`,
          [totalScore, percentage, isPassed, attemptId]
        );

        // Mark content block as complete
        await this.sessionRepository.markContentAsComplete(
          request.contentBlockId,
          request.userId,
          { examinationPassed: isPassed, score: totalScore, percentage }
        );
      }

      return {
        success: true,
        message: manualGradingQuestions > 0
          ? 'Examination submitted successfully. Your answers are being reviewed.'
          : 'Examination completed successfully.',
        data: {
          attemptId,
          autoGradedScore,
          autoGradedMaxScore,
          manualGradingPending: manualGradingQuestions > 0,
          totalQuestions: questions.length,
          autoGradedQuestions: questions.length - manualGradingQuestions,
          manualGradingQuestions,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('SubmitExaminationUseCase error:', error);
      throw new DomainError('Failed to submit examination');
    }
  }

  private checkAnswer(
    questionType: string,
    studentAnswer: string | string[],
    correctAnswer: any
  ): boolean {
    if (questionType === 'single_choice' || questionType === 'true_false') {
      return studentAnswer === correctAnswer;
    } else if (questionType === 'multiple_choice') {
      if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswer)) {
        return false;
      }
      if (studentAnswer.length !== correctAnswer.length) {
        return false;
      }
      const sortedStudent = [...studentAnswer].sort();
      const sortedCorrect = [...correctAnswer].sort();
      return sortedStudent.every((ans, idx) => ans === sortedCorrect[idx]);
    }
    return false;
  }
}

