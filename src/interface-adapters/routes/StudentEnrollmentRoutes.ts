/**
 * StudentEnrollmentRoutes
 *
 * Defines HTTP routes for student subject enrollment functionality.
 * All routes require authentication and student role.
 *
 * Base path: /api/v1/student-enrollment
 *
 * @author Student-ACT LMS Team
 * @version 1.0.0
 * @updated 2025-10-17
 */

import { Router } from 'express';
import { StudentEnrollmentController } from '../controllers/StudentEnrollmentController';
import { authenticate } from '../../middleware/auth.middleware';
import { DIContainer } from '../../infrastructure/container/DIContainer';

export class StudentEnrollmentRoutes {
  private router: Router;
  private studentEnrollmentController: StudentEnrollmentController;

  constructor() {
    this.router = Router();
    this.initializeController();
    this.setupRoutes();
  }

  /**
   * Initialize controller with dependencies
   */
  private initializeController(): void {
    const container = DIContainer.getInstance();
    this.studentEnrollmentController = container.studentEnrollmentController;
  }

  /**
   * Get the configured router
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Setup all routes
   */
  private setupRoutes(): void {
    // All routes require authentication
    this.router.use(authenticate);

    this.setupCurrentSemesterRoutes();
    this.setupAvailableSubjectsRoutes();
    this.setupEnrollmentRoutes();
    this.setupEnrolledSubjectsRoutes();
    this.setupLearningContentRoutes();
  }

  /**
   * Setup current semester routes
   */
  private setupCurrentSemesterRoutes(): void {
    // GET /api/v1/student-enrollment/current-semester
    // Get the current semester for the authenticated student
    this.router.get(
      '/current-semester',
      this.studentEnrollmentController.getCurrentSemester
    );
  }

  /**
   * Setup available subjects routes
   */
  private setupAvailableSubjectsRoutes(): void {
    // GET /api/v1/student-enrollment/available-subjects?semesterNumber=1
    // Get available subjects for a specific semester
    this.router.get(
      '/available-subjects',
      this.studentEnrollmentController.getAvailableSubjects
    );
  }

  /**
   * Setup enrollment routes
   */
  private setupEnrollmentRoutes(): void {
    // POST /api/v1/student-enrollment/enroll
    // Enroll in subjects for a semester
    this.router.post(
      '/enroll',
      this.studentEnrollmentController.enrollSubjects
    );
  }

  /**
   * Setup enrolled subjects routes
   */
  private setupEnrolledSubjectsRoutes(): void {
    // GET /api/v1/student-enrollment/enrolled-subjects
    // Get all enrolled subjects for the authenticated student
    // Optional query params: semesterNumber, academicYearId
    this.router.get(
      '/enrolled-subjects',
      this.studentEnrollmentController.getEnrolledSubjects
    );
  }

  /**
   * Setup learning content routes
   */
  private setupLearningContentRoutes(): void {
    // GET /api/v1/student-enrollment/learning-content/:enrollmentId
    // Get learning content for an enrolled subject
    this.router.get(
      '/learning-content/:enrollmentId',
      this.studentEnrollmentController.getSubjectLearningContent
    );
  }
}

/**
 * Factory function to create student enrollment routes
 */
export function createStudentEnrollmentRoutes(): Router {
  const studentEnrollmentRoutes = new StudentEnrollmentRoutes();
  return studentEnrollmentRoutes.getRouter();
}

/**
 * Default export for convenience
 */
export default createStudentEnrollmentRoutes;

