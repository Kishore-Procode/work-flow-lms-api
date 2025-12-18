/**
 * PlaySessionRoutes
 *
 * Defines HTTP routes for Play Session functionality.
 * Provides interactive content delivery with progress tracking, comments, and quizzes.
 *
 * Base path: /api/v1/play-session
 *
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { PlaySessionController } from '../controllers/PlaySessionController';
import { authenticate } from '../../middleware/auth.middleware';
import { DIContainer } from '../../infrastructure/container/DIContainer';

export class PlaySessionRoutes {
  private router: Router;
  private playSessionController: PlaySessionController;

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
    this.playSessionController = container.playSessionController;
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

    this.setupSessionRoutes();
    this.setupContentRoutes();
    this.setupProgressRoutes();
    this.setupCommentRoutes();
    this.setupQuizRoutes();
    this.setupAssignmentRoutes();
    this.setupMappingRoutes();
  }

  /**
   * Setup session routes
   */
  private setupSessionRoutes(): void {
    // GET /api/v1/play-session/subject/:subjectId/session
    // Get workflow session mapped to an LMS subject
    this.router.get(
      '/subject/:subjectId/session',
      this.playSessionController.getSessionBySubject
    );

    // GET /api/v1/play-session/subject/:subjectId/course-structure
    // Get complete course structure (Syllabus → Lessons → Sessions → Content Blocks)
    this.router.get(
      '/subject/:subjectId/course-structure',
      this.playSessionController.getCourseStructure
    );
  }

  /**
   * Setup content routes
   */
  private setupContentRoutes(): void {
    // GET /api/v1/play-session/session/:sessionId/content-blocks
    // Get all content blocks for a session
    this.router.get(
      '/session/:sessionId/content-blocks',
      this.playSessionController.getSessionContentBlocks
    );
  }

  /**
   * Setup progress routes
   */
  private setupProgressRoutes(): void {
    // GET /api/v1/play-session/progress/bulk/:subjectId
    // Get user's progress for ALL sessions in a subject (Course Player optimization)
    // IMPORTANT: This route must come BEFORE /progress/:sessionId to avoid route conflicts
    this.router.get(
      '/progress/bulk/:subjectId',
      this.playSessionController.getBulkUserProgress
    );

    // GET /api/v1/play-session/progress/:sessionId
    // Get user's progress for a session
    this.router.get(
      '/progress/:sessionId',
      this.playSessionController.getUserProgress
    );

    // POST /api/v1/play-session/progress
    // Update user's progress for a content block
    this.router.post(
      '/progress',
      this.playSessionController.updateProgress
    );
  }

  /**
   * Setup comment routes
   */
  private setupCommentRoutes(): void {
    // GET /api/v1/play-session/comments/:blockId
    // Get comments for a content block
    this.router.get(
      '/comments/:blockId',
      this.playSessionController.getComments
    );

    // POST /api/v1/play-session/comments
    // Create a new comment
    this.router.post(
      '/comments',
      this.playSessionController.createComment
    );
  }

  /**
   * Setup quiz routes
   */
  private setupQuizRoutes(): void {
    // GET /api/v1/play-session/quiz/:blockId/questions
    // Get quiz questions for a content block
    this.router.get(
      '/quiz/:blockId/questions',
      this.playSessionController.getQuizQuestions
    );

    // POST /api/v1/play-session/quiz/attempt
    // Submit a quiz attempt
    this.router.post(
      '/quiz/attempt',
      this.playSessionController.submitQuizAttempt
    );
  }

  /**
   * Setup assignment routes
   */
  private setupAssignmentRoutes(): void {
    // POST /api/v1/play-session/assignment/submit
    // Submit an assignment (Student)
    this.router.post(
      '/assignment/submit',
      this.playSessionController.submitAssignment
    );

    // GET /api/v1/play-session/assignment/:blockId/status
    // Get assignment submission status (Student)
    this.router.get(
      '/assignment/:blockId/status',
      this.playSessionController.getAssignmentSubmissionStatus
    );

    // POST /api/v1/play-session/assignment/grade
    // Grade an assignment submission (Staff only)
    this.router.post(
      '/assignment/grade',
      this.playSessionController.gradeAssignment
    );

    // GET /api/v1/play-session/staff/assignments
    // Get all assignment submissions for staff to grade (Staff only)
    this.router.get(
      '/staff/assignments',
      this.playSessionController.getStaffAssignmentSubmissions
    );
  }

  /**
   * Setup mapping routes (Admin/Staff only)
   */
  private setupMappingRoutes(): void {
    // POST /api/v1/play-session/map-subject-to-session
    // Map an LMS subject to a workflow session
    // Requires admin or staff role (checked in controller)
    this.router.post(
      '/map-subject-to-session',
      this.playSessionController.mapSubjectToSession
    );
  }
}

/**
 * Factory function to create play session routes
 */
export function createPlaySessionRoutes(): Router {
  const playSessionRoutes = new PlaySessionRoutes();
  return playSessionRoutes.getRouter();
}

/**
 * Default export for convenience
 */
export default createPlaySessionRoutes;

