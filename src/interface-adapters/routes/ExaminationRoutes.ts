import { Router } from 'express';
import { Pool } from 'pg';
import { ExaminationController } from '../controllers/ExaminationController';
import { WorkflowSessionRepository } from '../../infrastructure/repositories/WorkflowSessionRepository';
import { authenticate } from '../../middleware/auth.middleware';

/**
 * Examination Routes
 *
 * Routes for examination submission and grading.
 */
export function createExaminationRoutes(pool: Pool): Router {
  const router = Router();
  const sessionRepository = new WorkflowSessionRepository(pool);
  const controller = new ExaminationController(sessionRepository, pool);

  // All routes require authentication
  router.use(authenticate);

  // ============================================================================
  // STUDENT ROUTES
  // ============================================================================

  /**
   * POST /api/v1/examinations/submit
   * Submit examination answers
   * Accessible by: Student
   */
  router.post('/submit', controller.submitExamination);

  /**
   * GET /api/v1/examinations/student/:userId
   * Get all examinations for a student
   * Accessible by: Student (own), Staff, HOD, Admin
   */
  router.get('/student/:userId', controller.getStudentExaminations);

  // ============================================================================
  // STAFF/HOD ROUTES
  // ============================================================================

  /**
   * GET /api/v1/examinations/pending-grading
   * Get examinations pending manual grading
   * Accessible by: Staff, HOD
   */
  router.get('/pending-grading', controller.getPendingGrading);

  /**
   * GET /api/v1/examinations/attempts/:attemptId
   * Get examination attempt details
   * Accessible by: Staff, HOD, Student (own)
   */
  router.get('/attempts/:attemptId', controller.getExaminationAttempt);

  /**
   * POST /api/v1/examinations/:attemptId/grade
   * Grade examination manually
   * Accessible by: Staff, HOD
   */
  router.post('/:attemptId/grade', controller.gradeExamination);

  return router;
}

