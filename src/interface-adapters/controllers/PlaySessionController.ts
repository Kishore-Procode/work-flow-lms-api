/**
 * PlaySessionController
 * 
 * Handles HTTP requests for Play Session functionality.
 * Provides endpoints for:
 * - Getting session by subject
 * - Getting session content blocks
 * - Getting/updating user progress
 * - Managing comments
 * - Quiz questions and attempts
 * - Subject-to-session mapping (admin/staff)
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { GetSessionBySubjectUseCase } from '../../application/use-cases/play-session/GetSessionBySubjectUseCase';
import { GetSessionContentBlocksUseCase } from '../../application/use-cases/play-session/GetSessionContentBlocksUseCase';
import { GetUserProgressUseCase } from '../../application/use-cases/play-session/GetUserProgressUseCase';
import { GetBulkUserProgressUseCase } from '../../application/use-cases/play-session/GetBulkUserProgressUseCase';
import { UpdateSessionProgressUseCase } from '../../application/use-cases/play-session/UpdateSessionProgressUseCase';
import { GetSessionCommentsUseCase } from '../../application/use-cases/play-session/GetSessionCommentsUseCase';
import { CreateSessionCommentUseCase } from '../../application/use-cases/play-session/CreateSessionCommentUseCase';
import { GetQuizQuestionsUseCase } from '../../application/use-cases/play-session/GetQuizQuestionsUseCase';
import { SubmitQuizAttemptUseCase } from '../../application/use-cases/play-session/SubmitQuizAttemptUseCase';
import { MapSubjectToSessionUseCase } from '../../application/use-cases/play-session/MapSubjectToSessionUseCase';
import { GetCourseStructureUseCase } from '../../application/use-cases/play-session/GetCourseStructureUseCase';
import { SubmitAssignmentUseCase } from '../../application/use-cases/play-session/SubmitAssignmentUseCase';
import { GradeAssignmentUseCase } from '../../application/use-cases/play-session/GradeAssignmentUseCase';
import { GetAssignmentSubmissionStatusUseCase } from '../../application/use-cases/play-session/GetAssignmentSubmissionStatusUseCase';
import { GetStaffAssignmentSubmissionsUseCase } from '../../application/use-cases/play-session/GetStaffAssignmentSubmissionsUseCase';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';
import { DomainError } from '../../domain/errors/DomainError';

export class PlaySessionController {
  constructor(
    private readonly getSessionBySubjectUseCase: GetSessionBySubjectUseCase,
    private readonly getSessionContentBlocksUseCase: GetSessionContentBlocksUseCase,
    private readonly getUserProgressUseCase: GetUserProgressUseCase,
    private readonly getBulkUserProgressUseCase: GetBulkUserProgressUseCase,
    private readonly updateSessionProgressUseCase: UpdateSessionProgressUseCase,
    private readonly getSessionCommentsUseCase: GetSessionCommentsUseCase,
    private readonly createSessionCommentUseCase: CreateSessionCommentUseCase,
    private readonly getQuizQuestionsUseCase: GetQuizQuestionsUseCase,
    private readonly submitQuizAttemptUseCase: SubmitQuizAttemptUseCase,
    private readonly mapSubjectToSessionUseCase: MapSubjectToSessionUseCase,
    private readonly getCourseStructureUseCase: GetCourseStructureUseCase,
    private readonly submitAssignmentUseCase: SubmitAssignmentUseCase,
    private readonly gradeAssignmentUseCase: GradeAssignmentUseCase,
    private readonly getAssignmentSubmissionStatusUseCase: GetAssignmentSubmissionStatusUseCase,
    private readonly getStaffAssignmentSubmissionsUseCase: GetStaffAssignmentSubmissionsUseCase
  ) {}

  /**
   * GET /api/v1/play-session/subject/:subjectId/session
   * Get workflow session mapped to an LMS subject
   */
  public getSessionBySubject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { subjectId } = req.params;

      if (!subjectId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Subject ID is required')
        );
        return;
      }

      const request = {
        subjectId,
        userId: req.user.id,
        enrollmentId: req.query.enrollmentId as string,
      };

      const response = await this.getSessionBySubjectUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Session retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/subject/:subjectId/course-structure
   * Get complete course structure (Syllabus → Lessons → Sessions → Content Blocks)
   */
  public getCourseStructure = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { subjectId } = req.params;

      if (!subjectId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Subject ID is required')
        );
        return;
      }

      const request = {
        subjectId,
        userId: req.user.id,
      };

      const response = await this.getCourseStructureUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Course structure retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/session/:sessionId/content-blocks
   * Get all content blocks for a session
   */
  public getSessionContentBlocks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Session ID is required')
        );
        return;
      }

      const request = {
        sessionId,
        userId: req.user.id,
      };

      const response = await this.getSessionContentBlocksUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Content blocks retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/progress/:sessionId
   * Get user's progress for a session
   */
  public getUserProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Session ID is required')
        );
        return;
      }

      const request = {
        sessionId,
        userId: req.user.id,
        enrollmentId: req.query.enrollmentId as string,
      };

      const response = await this.getUserProgressUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Progress retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/progress/bulk/:subjectId
   * Get user's progress for ALL sessions in a subject/course
   * Optimized for Course Player - loads all progress in one call
   */
  public getBulkUserProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { subjectId } = req.params;

      if (!subjectId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Subject ID is required')
        );
        return;
      }

      const request = {
        subjectId,
        userId: req.user.id,
      };

      const response = await this.getBulkUserProgressUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Bulk progress retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/progress
   * Update user's progress for a content block
   */
  public updateProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📡 updateProgress called with body:', req.body);
      console.log('📡 updateProgress user:', req.user);

      if (!req.user) {
        console.log('❌ No user in request');
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { contentBlockId, isCompleted, timeSpent, completionData, enrollmentId } = req.body;

      console.log('📡 Extracted values:', {
        contentBlockId,
        isCompleted,
        isCompletedType: typeof isCompleted,
        timeSpent,
        timeSpentType: typeof timeSpent,
        completionData,
        completionDataType: typeof completionData,
        enrollmentId
      });

      if (!contentBlockId) {
        console.log('❌ Validation failed: contentBlockId missing');
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content block ID is required')
        );
        return;
      }

      if (typeof isCompleted !== 'boolean') {
        console.log('❌ Validation failed: isCompleted not boolean, got:', typeof isCompleted, isCompleted);
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('isCompleted must be a boolean')
        );
        return;
      }

      if (typeof timeSpent !== 'number' || timeSpent < 0) {
        console.log('❌ Validation failed: timeSpent invalid, got:', typeof timeSpent, timeSpent);
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('timeSpent must be a non-negative number')
        );
        return;
      }

      console.log('✅ All validations passed');

      const request = {
        contentBlockId,
        userId: req.user.id,
        enrollmentId,
        isCompleted,
        timeSpent,
        completionData,
      };

      console.log('📡 Calling use case with request:', request);

      const response = await this.updateSessionProgressUseCase.execute(request);

      console.log('✅ Use case executed successfully:', response);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Progress updated successfully', response)
      );
    } catch (error) {
      console.error('❌ Error in updateProgress controller:', error);
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/comments/:blockId
   * Get comments for a content block
   */
  public getComments = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { blockId } = req.params;

      if (!blockId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Block ID is required')
        );
        return;
      }

      const request = {
        contentBlockId: blockId,
        userId: req.user.id,
      };

      const response = await this.getSessionCommentsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Comments retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/comments
   * Create a new comment
   */
  public createComment = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { contentBlockId, commentText, parentCommentId, isAnonymous } = req.body;

      if (!contentBlockId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content block ID is required')
        );
        return;
      }

      if (!commentText || commentText.trim().length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Comment text is required')
        );
        return;
      }

      const request = {
        contentBlockId,
        userId: req.user.id,
        commentText,
        parentCommentId,
        isAnonymous: isAnonymous || false,
      };

      const response = await this.createSessionCommentUseCase.execute(request);

      res.status(HttpStatusCode.CREATED).json(
        ApiResponse.success('Comment created successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/quiz/:blockId/questions
   * Get quiz questions for a content block
   */
  public getQuizQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { blockId } = req.params;

      if (!blockId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Block ID is required')
        );
        return;
      }

      const request = {
        contentBlockId: blockId,
        userId: req.user.id,
      };

      const response = await this.getQuizQuestionsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Quiz questions retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/quiz/attempt
   * Submit a quiz attempt
   */
  public submitQuizAttempt = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📝 submitQuizAttempt called with body:', JSON.stringify(req.body, null, 2));
      console.log('📝 submitQuizAttempt user:', req.user?.id);

      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { contentBlockId, answers, timeSpentSeconds, enrollmentId } = req.body;

      console.log('📝 Extracted values:', {
        contentBlockId,
        answersType: typeof answers,
        answersKeys: answers ? Object.keys(answers) : [],
        timeSpentSeconds,
        timeSpentType: typeof timeSpentSeconds,
        enrollmentId
      });

      if (!contentBlockId) {
        console.log('❌ Validation failed: Content block ID is required');
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content block ID is required')
        );
        return;
      }

      if (!answers || typeof answers !== 'object') {
        console.log('❌ Validation failed: Answers are required or invalid type');
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Answers are required')
        );
        return;
      }

      if (typeof timeSpentSeconds !== 'number' || timeSpentSeconds < 0) {
        console.log('❌ Validation failed: Time spent must be a non-negative number');
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Time spent must be a non-negative number')
        );
        return;
      }

      const request = {
        contentBlockId,
        userId: req.user.id,
        enrollmentId,
        answers,
        timeSpentSeconds,
      };

      console.log('✅ All controller validations passed, calling use case');
      const response = await this.submitQuizAttemptUseCase.execute(request);

      res.status(HttpStatusCode.CREATED).json(
        ApiResponse.success('Quiz attempt submitted successfully', response)
      );
    } catch (error) {
      console.error('❌ Error in submitQuizAttempt controller:', error);
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/map-subject-to-session
   * Map an LMS subject to a workflow session (Admin/Staff only)
   */
  public mapSubjectToSession = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only admin and staff can create mappings
      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Admin or staff role required.')
        );
        return;
      }

      const { contentMapSubDetailsId, workflowSessionId, notes } = req.body;

      if (!contentMapSubDetailsId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Subject ID is required')
        );
        return;
      }

      if (!workflowSessionId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Session ID is required')
        );
        return;
      }

      const request = {
        contentMapSubDetailsId,
        workflowSessionId,
        createdBy: req.user.id,
        notes,
      };

      const response = await this.mapSubjectToSessionUseCase.execute(request);

      res.status(HttpStatusCode.CREATED).json(
        ApiResponse.success('Subject mapped to session successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/assignment/submit
   * Submit an assignment
   */
  public submitAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { contentBlockId, submissionText, submissionFiles } = req.body;

      if (!contentBlockId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content block ID is required')
        );
        return;
      }

      const request = {
        contentBlockId,
        userId: req.user.id,
        submissionText,
        submissionFiles,
      };

      const response = await this.submitAssignmentUseCase.execute(request);

      res.status(HttpStatusCode.CREATED).json(
        ApiResponse.success(response.message, response.submission)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/assignment/:blockId/status
   * Get assignment submission status for a student
   */
  public getAssignmentSubmissionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { blockId } = req.params;

      if (!blockId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content block ID is required')
        );
        return;
      }

      const request = {
        contentBlockId: blockId,
        userId: req.user.id,
      };

      const response = await this.getAssignmentSubmissionStatusUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Assignment submission status retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/play-session/assignment/grade
   * Grade an assignment submission (Staff only)
   */
  public gradeAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check if user is staff or HOD
      if (req.user.role !== 'staff' && req.user.role !== 'hod') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Only staff members can grade assignments')
        );
        return;
      }

      const { submissionId, score, maxScore, feedback, rubricScores } = req.body;

      if (!submissionId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Submission ID is required')
        );
        return;
      }

      if (typeof score !== 'number' || typeof maxScore !== 'number') {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Score and max score are required and must be numbers')
        );
        return;
      }

      const request = {
        submissionId,
        staffId: req.user.id,
        score,
        maxScore,
        feedback,
        rubricScores,
      };

      const response = await this.gradeAssignmentUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success(response.message, response.submission)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/play-session/staff/assignments
   * Get all assignment submissions for staff to grade
   */
  public getStaffAssignmentSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check if user is staff or HOD
      if (req.user.role !== 'staff' && req.user.role !== 'hod') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Only staff members can access this resource')
        );
        return;
      }

      const request = {
        staffId: req.user.id,
      };

      const response = await this.getStaffAssignmentSubmissionsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Staff assignment submissions retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Error handler
   */
  private handleError(error: unknown, res: Response): void {
    if (error instanceof DomainError) {
      res.status(HttpStatusCode.BAD_REQUEST).json(
        ApiResponse.error(error.message)
      );
    } else if (error instanceof Error) {
      console.error('Unexpected error:', error);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('An unexpected error occurred')
      );
    } else {
      console.error('Unknown error:', error);
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('An unknown error occurred')
      );
    }
  }
}


