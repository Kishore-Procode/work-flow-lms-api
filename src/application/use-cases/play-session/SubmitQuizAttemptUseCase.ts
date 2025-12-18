import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, QuizAttempt, QuizQuestion } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * SubmitQuizAttemptUseCase
 *
 * Submits a quiz attempt, calculates score, and saves results.
 * Automatically marks content block as completed if quiz is passed.
 *
 * Process:
 * 1. Validate content block is a quiz
 * 2. Fetch quiz questions
 * 3. Calculate score based on answers
 * 4. Determine if passed (e.g., >= 70%)
 * 5. Save quiz attempt
 * 6. Update progress if passed
 */

export interface SubmitQuizAttemptRequest {
  contentBlockId: string;
  userId: string;
  enrollmentId?: string;
  answers: Record<string, any>; // questionId -> answer
  timeSpentSeconds: number;
}

export interface SubmitQuizAttemptResponse {
  attempt: {
    id: string;
    contentBlockId: string;
    userId: string;
    attemptNumber: number;
    score: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    timeSpentSeconds: number;
    startedAt: Date;
    completedAt: Date;
  };
  feedback: {
    correctAnswers: number;
    totalQuestions: number;
    passingPercentage: number;
    message: string;
  };
}

export class SubmitQuizAttemptUseCase {
  private readonly PASSING_PERCENTAGE = 70; // 70% to pass

  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: SubmitQuizAttemptRequest): Promise<SubmitQuizAttemptResponse> {
    // Validate input
    if (!request.contentBlockId) {
      throw new DomainError('Content block ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }
    if (!request.answers || Object.keys(request.answers).length === 0) {
      throw new DomainError('Answers are required');
    }
    if (typeof request.timeSpentSeconds !== 'number' || request.timeSpentSeconds < 0) {
      throw new DomainError('Time spent must be a non-negative number');
    }

    try {
      console.log('📝 Submit Quiz Attempt Request:', {
        contentBlockId: request.contentBlockId,
        userId: request.userId,
        answersCount: Object.keys(request.answers).length,
        answers: request.answers,
        timeSpentSeconds: request.timeSpentSeconds
      });

      // Step 1: Validate content block is a quiz
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Content block not found');
      }

      if (contentBlock.type !== 'quiz' && contentBlock.type !== 'examination') {
        throw new DomainError('This content block is not a quiz or examination');
      }

      // Step 2: Fetch quiz questions
      // First, try to get questions from contentData (new format)
      let questions: QuizQuestion[] = [];

      console.log('🔍 Content Block Data:', {
        hasContentData: !!contentBlock.contentData,
        contentDataType: typeof contentBlock.contentData,
        hasQuestions: contentBlock.contentData && contentBlock.contentData.questions,
        questionsLength: contentBlock.contentData?.questions?.length,
        contentDataKeys: contentBlock.contentData ? Object.keys(contentBlock.contentData) : []
      });

      if (contentBlock.contentData && contentBlock.contentData.questions) {
        // Questions are stored in contentData (new format)
        const contentDataQuestions = contentBlock.contentData.questions;

        console.log('✅ Found questions in contentData:', contentDataQuestions.length);

        questions = contentDataQuestions.map((q: any, index: number) => ({
          id: q.id,
          contentBlockId: request.contentBlockId,
          questionText: q.question,
          questionType: q.type.replace(/-/g, '_'), // Convert hyphen to underscore
          options: q.options || null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
          points: q.points || 1,
          difficulty: q.difficulty || 'medium',
          orderIndex: index,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      } else {
        // Fallback: Try to get questions from session_quiz_questions table (old format)
        console.log('⚠️ No questions in contentData, trying session_quiz_questions table');
        questions = await this.sessionRepository.getQuizQuestionsByBlockId(request.contentBlockId);
      }

      if (questions.length === 0) {
        throw new DomainError('No questions found for this quiz');
      }

      console.log('📋 Quiz Questions:', {
        totalQuestions: questions.length,
        questionIds: questions.map(q => q.id),
        questionTypes: questions.map(q => ({ id: q.id, type: q.questionType }))
      });

      // Step 3: Calculate score
      const { score, maxScore, correctAnswers } = this.calculateScore(questions, request.answers);
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const isPassed = percentage >= this.PASSING_PERCENTAGE;

      // Step 4: Get attempt number and check examination restrictions
      const previousAttempts = await this.sessionRepository.getQuizAttemptsByUser(
        request.userId,
        request.contentBlockId
      );

      // For examinations, only allow one attempt
      if (contentBlock.type === 'examination' && previousAttempts.length > 0) {
        throw new DomainError('Examination can only be attempted once. You have already submitted this examination.');
      }

      const attemptNumber = previousAttempts.length + 1;

      // Step 5: Save quiz attempt
      const now = new Date();
      const attemptData: Omit<QuizAttempt, 'id'> = {
        contentBlockId: request.contentBlockId,
        userId: request.userId,
        attemptNumber,
        score,
        maxScore,
        percentage,
        isPassed,
        timeSpentSeconds: request.timeSpentSeconds,
        startedAt: new Date(now.getTime() - request.timeSpentSeconds * 1000), // Approximate start time
        completedAt: now,
        answers: request.answers,
      };

      const savedAttempt = await this.sessionRepository.createQuizAttempt(attemptData);

      // Step 6: Update progress if passed
      if (isPassed) {
        await this.updateProgressOnPass(request.contentBlockId, request.userId, request.timeSpentSeconds);
      }

      // Step 7: Generate feedback message
      const message = this.generateFeedbackMessage(isPassed, percentage, attemptNumber);

      return {
        attempt: {
          id: savedAttempt.id,
          contentBlockId: savedAttempt.contentBlockId,
          userId: savedAttempt.userId,
          attemptNumber: savedAttempt.attemptNumber,
          score: savedAttempt.score,
          maxScore: savedAttempt.maxScore,
          percentage: savedAttempt.percentage,
          isPassed: savedAttempt.isPassed,
          timeSpentSeconds: savedAttempt.timeSpentSeconds,
          startedAt: savedAttempt.startedAt,
          completedAt: savedAttempt.completedAt,
        },
        feedback: {
          correctAnswers,
          totalQuestions: questions.length,
          passingPercentage: this.PASSING_PERCENTAGE,
          message,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to submit quiz attempt: ${error.message}`);
    }
  }

  /**
   * Calculate quiz score based on answers
   */
  private calculateScore(
    questions: QuizQuestion[],
    userAnswers: Record<string, any>
  ): { score: number; maxScore: number; correctAnswers: number } {
    let score = 0;
    let maxScore = 0;
    let correctAnswers = 0;

    for (const question of questions) {
      maxScore += question.points;
      const userAnswer = userAnswers[question.id];

      if (userAnswer !== undefined && this.isAnswerCorrect(question, userAnswer)) {
        score += question.points;
        correctAnswers++;
      }
    }

    return { score, maxScore, correctAnswers };
  }

  /**
   * Check if user's answer is correct
   */
  private isAnswerCorrect(question: QuizQuestion, userAnswer: any): boolean {
    const correctAnswer = question.correctAnswer;

    // Handle different question types
    switch (question.questionType) {
      case 'multiple_choice':
      case 'single_choice':
        // If correctAnswer is an index and userAnswer is a string (option text)
        if (typeof correctAnswer === 'number' && typeof userAnswer === 'string' && question.options) {
          return question.options[correctAnswer] === userAnswer;
        }
        // If both are the same type, compare directly
        return userAnswer === correctAnswer;

      case 'multiple_select':
        // If correctAnswer is array of indices and userAnswer is array of option texts
        if (Array.isArray(correctAnswer) && Array.isArray(userAnswer) && question.options) {
          const correctOptions = correctAnswer.map((idx: number) => question.options![idx]);
          const sortedUser = [...userAnswer].sort();
          const sortedCorrect = [...correctOptions].sort();
          return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
        }
        // If both are arrays of the same type, compare directly
        if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
          return false;
        }
        const sortedUser = [...userAnswer].sort();
        const sortedCorrect = [...correctAnswer].sort();
        return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);

      case 'true_false':
        // Handle both boolean and string "True"/"False"
        if (typeof correctAnswer === 'number') {
          // correctAnswer is 0 (False) or 1 (True)
          const correctBool = correctAnswer === 1;
          return userAnswer === correctBool;
        }
        return userAnswer === correctAnswer;

      case 'fill_in_blank':
      case 'short_answer':
        // Case-insensitive comparison
        return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

      case 'essay':
        // For essay questions, we can't auto-grade, so return false
        // These should be manually graded by instructors
        return false;

      default:
        return false;
    }
  }

  /**
   * Update progress when quiz is passed
   */
  private async updateProgressOnPass(
    contentBlockId: string,
    userId: string,
    timeSpent: number
  ): Promise<void> {
    try {
      await this.sessionRepository.createOrUpdateProgress({
        contentBlockId,
        userId,
        isCompleted: true,
        timeSpent,
        completionData: { quizPassed: true },
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating progress on quiz pass:', error);
      // Don't throw - quiz attempt was saved successfully
    }
  }

  /**
   * Generate feedback message
   */
  private generateFeedbackMessage(isPassed: boolean, percentage: number, attemptNumber: number): string {
    if (isPassed) {
      if (percentage === 100) {
        return `Perfect score! You got 100% on attempt ${attemptNumber}. Excellent work! 🎉`;
      } else if (percentage >= 90) {
        return `Great job! You scored ${percentage}% on attempt ${attemptNumber}. Well done! 👏`;
      } else {
        return `Good work! You passed with ${percentage}% on attempt ${attemptNumber}. Keep it up! ✅`;
      }
    } else {
      return `You scored ${percentage}% on attempt ${attemptNumber}. You need ${this.PASSING_PERCENTAGE}% to pass. Review the material and try again! 📚`;
    }
  }
}

