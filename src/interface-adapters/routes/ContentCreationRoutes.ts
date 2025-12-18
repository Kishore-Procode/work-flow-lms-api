import { Router } from 'express';
import { Pool } from 'pg';
import { ContentCreationController } from '../controllers/ContentCreationController';
import { WorkflowSessionRepository } from '../../infrastructure/repositories/WorkflowSessionRepository';
import { authenticate } from '../../middleware/auth.middleware';

/**
 * Content Creation Routes
 *
 * Routes for creating and managing course content (quizzes, assignments, examinations, etc.)
 * Accessible by HOD and Staff roles.
 */
export function createContentCreationRoutes(pool: Pool): Router {
  const router = Router();
  const sessionRepository = new WorkflowSessionRepository(pool);
  const controller = new ContentCreationController(sessionRepository);

  // All routes require authentication
  router.use(authenticate);

  // ============================================================================
  // SESSION ROUTES
  // ============================================================================

  /**
   * GET /api/v1/content-creation/subject/:subjectId/session
   * Get workflow session for a subject (for HOD/Staff - no enrollment check)
   * Accessible by: HOD, Staff
   */
  router.get('/subject/:subjectId/session', controller.getSessionBySubject);

  // ============================================================================
  // CONTENT BLOCK ROUTES
  // ============================================================================

  /**
   * POST /api/v1/content-creation/content-blocks
   * Create a new content block (quiz, assignment, examination, video, text, etc.)
   * Accessible by: HOD, Staff
   */
  router.post('/content-blocks', controller.createContentBlock);

  /**
   * GET /api/v1/content-creation/sessions/:sessionId/content-blocks
   * Get all content blocks for a session
   * Accessible by: HOD, Staff
   */
  router.get('/sessions/:sessionId/content-blocks', controller.getContentBlocks);

  /**
   * PUT /api/v1/content-creation/content-blocks/:blockId
   * Update an existing content block
   * Accessible by: HOD, Staff (creator only)
   */
  router.put('/content-blocks/:blockId', controller.updateContentBlock);

  /**
   * DELETE /api/v1/content-creation/content-blocks/:blockId
   * Delete a content block
   * Accessible by: HOD, Staff (creator only)
   */
  router.delete('/content-blocks/:blockId', controller.deleteContentBlock);

  // ============================================================================
  // QUIZ/EXAMINATION QUESTION ROUTES
  // ============================================================================

  /**
   * POST /api/v1/content-creation/quiz-questions
   * Create questions for a quiz or examination
   * Accessible by: HOD, Staff
   */
  router.post('/quiz-questions', controller.createQuizQuestions);

  /**
   * GET /api/v1/content-creation/content-blocks/:blockId/questions
   * Get all questions for a quiz/examination content block
   * Accessible by: HOD, Staff
   */
  router.get('/content-blocks/:blockId/questions', controller.getQuizQuestions);

  /**
   * PUT /api/v1/content-creation/quiz-questions/:questionId
   * Update a quiz question
   * Accessible by: HOD, Staff (creator only)
   */
  router.put('/quiz-questions/:questionId', controller.updateQuizQuestion);

  /**
   * DELETE /api/v1/content-creation/quiz-questions/:questionId
   * Delete a quiz question
   * Accessible by: HOD, Staff (creator only)
   */
  router.delete('/quiz-questions/:questionId', controller.deleteQuizQuestion);

  return router;
}

