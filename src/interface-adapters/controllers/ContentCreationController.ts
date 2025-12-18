import { Request, Response } from 'express';
import { CreateContentBlockUseCase } from '../../application/use-cases/content-creation/CreateContentBlockUseCase';
import { CreateQuizQuestionsUseCase } from '../../application/use-cases/content-creation/CreateQuizQuestionsUseCase';
import { IWorkflowSessionRepository } from '../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * ContentCreationController
 *
 * Handles HTTP requests for content creation (quizzes, assignments, examinations, etc.)
 * Used by HOD and Staff to create course content.
 */
export class ContentCreationController {
  constructor(private sessionRepository: IWorkflowSessionRepository) {}

  /**
   * GET /api/v1/content-creation/subject/:subjectId/session
   * Get workflow session for a subject (for HOD/Staff - no enrollment check)
   */
  public getSessionBySubject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subjectId } = req.params;

      if (!subjectId) {
        res.status(400).json({
          success: false,
          message: 'Subject ID is required',
        });
        return;
      }

      // Get session via mapping (no enrollment check - for HOD/Staff)
      const session = await this.sessionRepository.getSessionBySubjectId(subjectId);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'No session found for this subject. Please map the subject to a workflow session first.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Session retrieved successfully',
        data: {
          session,
          subjectId,
        },
      });
    } catch (error: any) {
      console.error('ContentCreationController.getSessionBySubject error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get session',
      });
    }
  };

  /**
   * POST /api/v1/content-creation/content-blocks
   * Create a new content block (quiz, assignment, examination, video, text, etc.)
   */
  public createContentBlock = async (req: Request, res: Response): Promise<void> => {
    try {
      const useCase = new CreateContentBlockUseCase(this.sessionRepository);
      const result = await useCase.execute({
        ...req.body,
        createdBy: req.user?.id,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('ContentCreationController.createContentBlock error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create content block',
      });
    }
  };

  /**
   * PUT /api/v1/content-creation/content-blocks/:blockId
   * Update an existing content block
   */
  public updateContentBlock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { blockId } = req.params;
      const updates = req.body;

      const updatedBlock = await this.sessionRepository.updateContentBlock(blockId, updates);

      if (!updatedBlock) {
        res.status(404).json({
          success: false,
          message: 'Content block not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Content block updated successfully',
        data: updatedBlock,
      });
    } catch (error: any) {
      console.error('ContentCreationController.updateContentBlock error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update content block',
      });
    }
  };

  /**
   * DELETE /api/v1/content-creation/content-blocks/:blockId
   * Delete a content block
   */
  public deleteContentBlock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { blockId } = req.params;

      const deleted = await this.sessionRepository.deleteContentBlock(blockId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Content block not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Content block deleted successfully',
      });
    } catch (error: any) {
      console.error('ContentCreationController.deleteContentBlock error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to delete content block',
      });
    }
  };

  /**
   * GET /api/v1/content-creation/sessions/:sessionId/content-blocks
   * Get all content blocks for a session (optionally filtered by type)
   */
  public getContentBlocks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { type } = req.query;

      let contentBlocks = await this.sessionRepository.getSessionContentBlocks(sessionId);

      // Filter by type if provided
      if (type && typeof type === 'string') {
        contentBlocks = contentBlocks.filter(block => block.type === type);
      }

      res.status(200).json({
        success: true,
        message: 'Content blocks retrieved successfully',
        data: {
          sessionId,
          contentBlocks,
          totalBlocks: contentBlocks.length,
        },
      });
    } catch (error: any) {
      console.error('ContentCreationController.getContentBlocks error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get content blocks',
      });
    }
  };

  /**
   * POST /api/v1/content-creation/quiz-questions
   * Create questions for a quiz or examination
   */
  public createQuizQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const useCase = new CreateQuizQuestionsUseCase(this.sessionRepository);
      const result = await useCase.execute({
        ...req.body,
        createdBy: req.user?.id,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('ContentCreationController.createQuizQuestions error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to create quiz questions',
      });
    }
  };

  /**
   * PUT /api/v1/content-creation/quiz-questions/:questionId
   * Update a quiz question
   */
  public updateQuizQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionId } = req.params;
      const updates = req.body;

      const updatedQuestion = await this.sessionRepository.updateQuizQuestion(questionId, updates);

      if (!updatedQuestion) {
        res.status(404).json({
          success: false,
          message: 'Quiz question not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Quiz question updated successfully',
        data: updatedQuestion,
      });
    } catch (error: any) {
      console.error('ContentCreationController.updateQuizQuestion error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update quiz question',
      });
    }
  };

  /**
   * DELETE /api/v1/content-creation/quiz-questions/:questionId
   * Delete a quiz question
   */
  public deleteQuizQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionId } = req.params;

      const deleted = await this.sessionRepository.deleteQuizQuestion(questionId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Quiz question not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Quiz question deleted successfully',
      });
    } catch (error: any) {
      console.error('ContentCreationController.deleteQuizQuestion error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to delete quiz question',
      });
    }
  };

  /**
   * GET /api/v1/content-creation/content-blocks/:blockId/questions
   * Get all questions for a quiz/examination content block
   */
  public getQuizQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { blockId } = req.params;

      const questions = await this.sessionRepository.getQuizQuestionsByBlockId(blockId);

      res.status(200).json({
        success: true,
        message: 'Quiz questions retrieved successfully',
        data: {
          contentBlockId: blockId,
          questions,
          totalQuestions: questions.length,
        },
      });
    } catch (error: any) {
      console.error('ContentCreationController.getQuizQuestions error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get quiz questions',
      });
    }
  };
}

