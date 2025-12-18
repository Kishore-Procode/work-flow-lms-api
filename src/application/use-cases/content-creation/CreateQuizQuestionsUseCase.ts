import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * CreateQuizQuestionsUseCase
 *
 * Creates questions for a quiz or examination content block.
 * Supports multiple question types: single_choice, multiple_choice, true_false, short_answer, long_answer.
 *
 * Process:
 * 1. Validate content block exists and is of type quiz or examination
 * 2. Validate question data
 * 3. Create questions in workflowmgmt.session_quiz_questions
 * 4. Return created questions
 */

export interface QuestionRequest {
  questionText: string;
  questionType: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer';
  options?: string[]; // For single_choice, multiple_choice, true_false
  correctAnswer?: string | string[]; // For auto-graded questions
  points: number;
  explanation?: string; // Optional explanation shown after answering
  orderIndex?: number;
}

export interface CreateQuizQuestionsRequest {
  contentBlockId: string;
  questions: QuestionRequest[];
  createdBy: string; // User ID of creator (HOD or Staff)
}

export interface CreateQuizQuestionsResponse {
  success: boolean;
  message: string;
  data: {
    contentBlockId: string;
    questionsCreated: number;
    questions: Array<{
      id: string;
      questionText: string;
      questionType: string;
      options?: string[];
      correctAnswer?: string | string[];
      points: number;
      explanation?: string;
      orderIndex: number;
    }>;
  };
}

export class CreateQuizQuestionsUseCase {
  constructor(private sessionRepository: IWorkflowSessionRepository) {}

  async execute(request: CreateQuizQuestionsRequest): Promise<CreateQuizQuestionsResponse> {
    try {
      // Step 1: Validate content block exists and is quiz/examination
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);
      if (!contentBlock) {
        throw DomainError.notFound('Content block');
      }

      if (!['quiz', 'examination'].includes(contentBlock.type)) {
        throw DomainError.validation('Content block must be of type quiz or examination');
      }

      // Step 2: Validate questions
      if (!request.questions || request.questions.length === 0) {
        throw DomainError.validation('At least one question is required');
      }

      for (const question of request.questions) {
        this.validateQuestion(question);
      }

      // Step 3: Create questions
      const createdQuestions = [];
      for (let i = 0; i < request.questions.length; i++) {
        const question = request.questions[i];
        const orderIndex = question.orderIndex !== undefined ? question.orderIndex : i;

        const createdQuestion = await this.sessionRepository.createQuizQuestion({
          contentBlockId: request.contentBlockId,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options || null,
          correctAnswer: question.correctAnswer || null,
          points: question.points,
          difficulty: 'medium', // Default difficulty
          explanation: question.explanation || null,
          orderIndex,
        });

        createdQuestions.push({
          id: createdQuestion.id,
          questionText: createdQuestion.questionText,
          questionType: createdQuestion.questionType,
          options: createdQuestion.options,
          correctAnswer: createdQuestion.correctAnswer,
          points: createdQuestion.points,
          explanation: createdQuestion.explanation,
          orderIndex: createdQuestion.orderIndex,
        });
      }

      return {
        success: true,
        message: `${createdQuestions.length} question(s) created successfully`,
        data: {
          contentBlockId: request.contentBlockId,
          questionsCreated: createdQuestions.length,
          questions: createdQuestions,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('CreateQuizQuestionsUseCase error:', error);
      throw new DomainError('Failed to create quiz questions');
    }
  }

  /**
   * Validate individual question data
   */
  private validateQuestion(question: QuestionRequest): void {
    // Validate question text
    if (!question.questionText || question.questionText.trim().length === 0) {
      throw DomainError.validation('Question text is required');
    }

    // Validate question type
    const validTypes = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'long_answer'];
    if (!validTypes.includes(question.questionType)) {
      throw DomainError.validation(`Invalid question type: ${question.questionType}`);
    }

    // Validate points
    if (!question.points || question.points <= 0) {
      throw DomainError.validation('Question points must be greater than 0');
    }

    // Type-specific validation
    switch (question.questionType) {
      case 'single_choice':
        this.validateSingleChoiceQuestion(question);
        break;
      case 'multiple_choice':
        this.validateMultipleChoiceQuestion(question);
        break;
      case 'true_false':
        this.validateTrueFalseQuestion(question);
        break;
      case 'short_answer':
      case 'long_answer':
        // No additional validation needed for manual grading questions
        break;
    }
  }

  private validateSingleChoiceQuestion(question: QuestionRequest): void {
    if (!question.options || question.options.length < 2) {
      throw DomainError.validation('Single choice question must have at least 2 options');
    }
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
      throw DomainError.validation('Single choice question must have a correct answer (string)');
    }
    if (!question.options.includes(question.correctAnswer as string)) {
      throw DomainError.validation('Correct answer must be one of the options');
    }
  }

  private validateMultipleChoiceQuestion(question: QuestionRequest): void {
    if (!question.options || question.options.length < 2) {
      throw DomainError.validation('Multiple choice question must have at least 2 options');
    }
    if (!question.correctAnswer || !Array.isArray(question.correctAnswer) || question.correctAnswer.length === 0) {
      throw DomainError.validation('Multiple choice question must have at least one correct answer (array)');
    }
    for (const answer of question.correctAnswer as string[]) {
      if (!question.options.includes(answer)) {
        throw DomainError.validation('All correct answers must be in the options list');
      }
    }
  }

  private validateTrueFalseQuestion(question: QuestionRequest): void {
    if (!question.options || question.options.length !== 2) {
      question.options = ['True', 'False']; // Auto-set if not provided
    }
    if (!question.correctAnswer || !['True', 'False'].includes(question.correctAnswer as string)) {
      throw DomainError.validation('True/False question must have correct answer as "True" or "False"');
    }
  }
}

