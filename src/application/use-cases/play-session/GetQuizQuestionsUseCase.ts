import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, QuizQuestion } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * GetQuizQuestionsUseCase
 *
 * Retrieves quiz questions for a content block.
 * Note: Correct answers are NOT included in the response for security.
 *
 * Process:
 * 1. Validate content block exists and is a quiz
 * 2. Fetch quiz questions from contentData (new format) or session_quiz_questions table (old format)
 * 3. Remove correct answers from response
 * 4. Return questions with options
 */

export interface GetQuizQuestionsRequest {
  contentBlockId: string;
  userId: string;
}

export interface GetQuizQuestionsResponse {
  contentBlockId: string;
  contentBlockType: string; // 'quiz' or 'examination'
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    options: any;
    explanation: string | null; // Only shown after submission
    points: number;
    difficulty: string;
    orderIndex: number;
  }>;
  totalQuestions: number;
  totalPoints: number;
  previousAttempts: number; // Number of previous attempts
  canAttempt: boolean; // Whether user can attempt (false for examination if already attempted)
}

export class GetQuizQuestionsUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: GetQuizQuestionsRequest): Promise<GetQuizQuestionsResponse> {
    // Validate input
    if (!request.contentBlockId) {
      throw new DomainError('Content block ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }

    try {
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
      let questions: any[] = [];
      let totalPoints = 0;

      if (contentBlock.contentData && contentBlock.contentData.questions) {
        // Questions are stored in contentData (new format)
        const contentDataQuestions = contentBlock.contentData.questions;

        questions = contentDataQuestions.map((q: any, index: number) => ({
          id: q.id,
          questionText: q.question,
          questionType: q.type.replace(/-/g, '_'), // Convert hyphen to underscore (multiple-choice → multiple_choice)
          options: q.options || null,
          explanation: null, // Hide explanation until after submission
          points: q.points || 1,
          difficulty: q.difficulty || 'medium',
          orderIndex: index,
        }));

        totalPoints = contentDataQuestions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
      } else {
        // Fallback: Try to get questions from session_quiz_questions table (old format)
        const dbQuestions = await this.sessionRepository.getQuizQuestionsByBlockId(request.contentBlockId);

        questions = dbQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          explanation: null, // Hide explanation until after submission
          points: q.points,
          difficulty: q.difficulty,
          orderIndex: q.orderIndex,
        }));

        totalPoints = dbQuestions.reduce((sum, q) => sum + q.points, 0);
      }

      // Step 3: Check previous attempts
      const previousAttempts = await this.sessionRepository.getQuizAttemptsByUser(
        request.userId,
        request.contentBlockId
      );

      // For examinations, user cannot attempt if they already have an attempt
      const canAttempt = contentBlock.type === 'examination'
        ? previousAttempts.length === 0
        : true; // Quizzes allow multiple attempts

      // Return response even if no questions (let frontend handle empty state)
      return {
        contentBlockId: request.contentBlockId,
        contentBlockType: contentBlock.type,
        questions,
        totalQuestions: questions.length,
        totalPoints,
        previousAttempts: previousAttempts.length,
        canAttempt,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get quiz questions: ${error.message}`);
    }
  }
}

