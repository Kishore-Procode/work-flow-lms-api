import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitLMSExaminationRequest {
  examinationId: string;
  userId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
  timeSpent: number; // in seconds
}

export interface SubmitLMSExaminationResponse {
  success: boolean;
  message: string;
  data: {
    attemptId: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    autoGradedQuestions: number;
    manualGradingRequired: number;
  };
}

export class SubmitLMSExaminationUseCase {
  constructor(private pool: Pool) { }

  async execute(request: SubmitLMSExaminationRequest): Promise<SubmitLMSExaminationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Get examination details (with fallbacks for column name changes)
      const examinationQuery = `
        SELECT 
          id,
          content_map_sub_details_id,
          title,
          COALESCE(total_points, 100) as total_points,
          COALESCE(passing_percentage, passing_score, 50) as passing_percentage,
          COALESCE(duration, time_limit, 60) as duration
        FROM lmsact.examinations
        WHERE id = $1 AND is_active = true
      `;
      const examinationResult = await client.query(examinationQuery, [request.examinationId]);

      if (examinationResult.rows.length === 0) {
        throw new Error('Examination not found');
      }

      const examination = examinationResult.rows[0];

      // Step 2: Check if student already attempted this examination
      // Check both tables for existing attempts
      const existingAttemptQuery = `
        SELECT id FROM lmsact.session_examination_attempts 
        WHERE examination_id = $1 AND user_id = $2
      `;
      const existingAttempt = await client.query(existingAttemptQuery, [request.examinationId, request.userId]);

      if (existingAttempt.rows.length > 0) {
        throw new Error('You have already attempted this examination');
      }

      // Step 3: Get all questions for this examination
      const questionsQuery = `
        SELECT 
          id,
          question_text,
          question_type,
          correct_answer,
          points
        FROM lmsact.examination_questions
        WHERE examination_id = $1
        ORDER BY order_index
      `;
      const questionsResult = await client.query(questionsQuery, [request.examinationId]);
      const questions = questionsResult.rows;

      // Step 4: Pre-calculate scores for attempt record
      const attemptId = uuidv4();
      let autoGradedScore = 0;
      let autoGradedMaxScore = 0;
      let manualGradedMaxScore = 0;
      let autoGradedCount = 0;
      let manualGradingCount = 0;

      // Prepare answer records (grade them first, insert later)
      const answerRecords: Array<{
        questionId: string;
        answer: string;
        isCorrect: boolean | null;
        pointsAwarded: number | null;
      }> = [];

      for (const answer of request.answers) {
        const question = questions.find(q => q.id === answer.questionId);
        if (!question) continue;

        let isCorrect: boolean | null = null;
        let pointsAwarded: number | null = null;

        // Auto-grade objective questions
        if (question.question_type === 'multiple_choice' ||
          question.question_type === 'true_false' ||
          question.question_type === 'single_choice') {

          // Parse the correct answer from database (may be stored as JSON)
          let correctAnswer = question.correct_answer;

          // Handle JSON-stringified correct answer
          if (correctAnswer && typeof correctAnswer === 'string') {
            try {
              correctAnswer = JSON.parse(correctAnswer);
            } catch {
              // Not JSON, use as-is
            }
          }

          // Normalize student answer - handle comma-separated values for multi-select
          const studentAnswerRaw = answer.answer?.trim() || '';
          const studentAnswers = studentAnswerRaw.split(',').map(a => a.trim().toLowerCase()).filter(a => a);

          // Parse options if available
          let options = question.options;
          if (typeof options === 'string') {
            try { options = JSON.parse(options); } catch { options = []; }
          }

          // Determine correct answers based on different storage formats
          let correctAnswers: string[] = [];

          if (Array.isArray(correctAnswer)) {
            // Correct answer is already an array
            correctAnswers = correctAnswer.map(a => String(a).trim().toLowerCase());
          } else if (typeof correctAnswer === 'string') {
            // Single string answer
            correctAnswers = [correctAnswer.trim().toLowerCase()];
          } else if (typeof correctAnswer === 'boolean') {
            // Boolean for true/false questions
            correctAnswers = [correctAnswer ? 'true' : 'false'];
          } else if (Array.isArray(options)) {
            // Get correct answers from options array (isCorrect: true)
            correctAnswers = options
              .filter((opt: any) => opt.isCorrect === true)
              .map((opt: any) => (opt.text || opt.value || '').toString().trim().toLowerCase());
          }

          console.log(`📝 Grading Q: "${question.question_text?.substring(0, 30)}..." | Type: ${question.question_type}`);
          console.log(`   Student answers: [${studentAnswers.join(', ')}] | Correct: [${correctAnswers.join(', ')}]`);

          // Compare answers
          if (question.question_type === 'multiple_choice' && studentAnswers.length > 0 && correctAnswers.length > 1) {
            // Multi-select: all correct answers must be selected and no incorrect ones
            const sortedStudent = [...studentAnswers].sort();
            const sortedCorrect = [...correctAnswers].sort();
            isCorrect = sortedStudent.length === sortedCorrect.length &&
              sortedStudent.every((ans, idx) => ans === sortedCorrect[idx]);
          } else {
            // Single choice or true/false: simple comparison
            const studentAnswer = studentAnswers[0] || '';
            const correctAnswerStr = correctAnswers[0] || '';
            isCorrect = studentAnswer === correctAnswerStr;
          }

          pointsAwarded = isCorrect ? question.points : 0;
          autoGradedScore += pointsAwarded;
          autoGradedMaxScore += question.points;
          autoGradedCount++;

          console.log(`   Result: ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'} - Points: ${pointsAwarded}/${question.points}`);
        } else {
          // Subjective questions require manual grading
          manualGradedMaxScore += question.points;
          manualGradingCount++;
        }

        answerRecords.push({
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect,
          pointsAwarded
        });
      }

      // Step 5: Calculate totals
      const totalScore = autoGradedScore; // Manual grading adds to this later
      const maxScore = examination.total_points;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const isPassed = percentage >= examination.passing_percentage;
      const status = manualGradingCount > 0 ? 'auto_graded' : 'completed';

      // Step 6: INSERT ATTEMPT into session_examination_attempts (to satisfy FK constraint)
      // The examination_attempt_answers table has FK to session_examination_attempts
      const insertAttemptQuery = `
        INSERT INTO lmsact.session_examination_attempts (
          id,
          examination_id,
          user_id,
          started_at,
          submitted_at,
          time_taken,
          auto_graded_score,
          auto_graded_max_score,
          manual_graded_score,
          manual_graded_max_score,
          total_score,
          max_score,
          percentage,
          is_passed,
          status,
          answers,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, NOW() - INTERVAL '1 second' * $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      await client.query(insertAttemptQuery, [
        attemptId,
        request.examinationId,
        request.userId,
        request.timeSpent,
        request.timeSpent,
        autoGradedScore,
        autoGradedMaxScore,
        0, // manual_graded_score starts at 0
        manualGradedMaxScore,
        totalScore,
        maxScore,
        percentage,
        isPassed,
        status,
        JSON.stringify(answerRecords) // Store answers as JSONB too for reference
      ]);

      // Step 7: INSERT ANSWERS into examination_attempt_answers (after attempt exists)
      for (const record of answerRecords) {
        const insertAnswerQuery = `
          INSERT INTO lmsact.examination_attempt_answers (
            id,
            attempt_id,
            question_id,
            answer_text,
            is_correct,
            points_awarded,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `;
        await client.query(insertAnswerQuery, [
          uuidv4(),
          attemptId,
          record.questionId,
          record.answer,
          record.isCorrect,
          record.pointsAwarded
        ]);
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: manualGradingCount > 0
          ? 'Examination submitted successfully. Some questions require manual grading.'
          : 'Examination submitted and graded successfully!',
        data: {
          attemptId,
          totalScore,
          maxScore,
          percentage,
          isPassed,
          autoGradedQuestions: autoGradedCount,
          manualGradingRequired: manualGradingCount
        }
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error submitting LMS examination:', error);
      throw new Error(error.message || 'Failed to submit examination');
    } finally {
      client.release();
    }
  }
}

