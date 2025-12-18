/**
 * Workflow Session Repository Implementation
 *
 * Infrastructure layer implementation for querying Workflow Management System data
 * from the workflowmgmt schema. Provides access to sessions, content blocks, progress,
 * comments, and quizzes for the Play Session feature.
 *
 * This repository queries the existing workflow database tables without duplicating data.
 * It uses the subject_session_mapping table to link LMS subjects to workflow sessions.
 *
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { DomainError } from '../../domain/errors/DomainError';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WorkflowSession {
  id: string;
  title: string;
  instructor: string | null;
  durationMinutes: number | null;
  sessionDescription: string | null;
  sessionObjectives: string | null;
  detailedContent: string | null;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionContentBlock {
  id: string;
  sessionId: string;
  type: string; // video, text, pdf, image, audio, code, quiz, assignment, examination
  title: string;
  contentData: any; // JSONB data
  orderIndex: number;
  isRequired: boolean;
  estimatedTime: string | null;
  isActive: boolean;
}

export interface SessionContentProgress {
  id: string;
  contentBlockId: string;
  userId: string;
  isCompleted: boolean;
  timeSpent: number; // seconds
  completionData: any | null; // JSONB
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionComment {
  id: string;
  contentBlockId: string;
  userId: string;
  userName: string | null;
  commentText: string;
  parentCommentId: string | null;
  status: string; // approved, pending, rejected
  isAnonymous: boolean;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface QuizQuestion {
  id: string;
  contentBlockId: string;
  questionText: string;
  questionType: string;
  options: any; // JSONB
  correctAnswer: any; // JSONB
  explanation: string | null;
  points: number;
  difficulty: string;
  orderIndex: number;
  isActive: boolean;
}

export interface QuizAttempt {
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
  completedAt: Date | null;
  answers: any; // JSONB
}

export interface AssignmentSubmission {
  id: string;
  contentBlockId: string;
  userId: string;
  submissionText: string | null;
  submissionFiles: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
  }> | null;
  submittedAt: Date;
  gradedBy: string | null;
  gradedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  isPassed: boolean;
  feedback: string | null;
  rubricScores: Array<{
    criteria: string;
    score: number;
    maxScore: number;
    comments?: string;
  }> | null;
  status: 'submitted' | 'graded' | 'returned' | 'resubmitted';
}

export interface SubjectSessionMapping {
  id: string;
  contentMapSubDetailsId: string;
  workflowSessionId: string;
  createdAt: Date;
  createdBy: string | null;
  isActive: boolean;
  notes: string | null;
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface IWorkflowSessionRepository {
  // Session Mapping
  getSessionBySubjectId(subjectId: string): Promise<WorkflowSession | null>;
  createSubjectSessionMapping(mapping: Omit<SubjectSessionMapping, 'id' | 'createdAt'>): Promise<SubjectSessionMapping>;
  getMappingsBySubjectId(subjectId: string): Promise<SubjectSessionMapping[]>;
  deleteMappingById(mappingId: string): Promise<boolean>;

  // Session Content
  getSessionById(sessionId: string): Promise<WorkflowSession | null>;
  getContentBlocksBySessionId(sessionId: string): Promise<SessionContentBlock[]>;
  getContentBlockById(blockId: string): Promise<SessionContentBlock | null>;

  // Progress Tracking
  getUserProgressBySession(userId: string, sessionId: string): Promise<SessionContentProgress[]>;
  getUserProgressByBlock(userId: string, blockId: string): Promise<SessionContentProgress | null>;
  createOrUpdateProgress(progress: Omit<SessionContentProgress, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionContentProgress>;

  // Comments
  getCommentsByBlockId(blockId: string): Promise<SessionComment[]>;
  createComment(comment: Omit<SessionComment, 'id' | 'createdAt' | 'updatedAt' | 'likesCount'>): Promise<SessionComment>;
  updateComment(commentId: string, commentText: string): Promise<SessionComment | null>;
  deleteComment(commentId: string): Promise<boolean>;

  // Quiz
  getQuizQuestionsByBlockId(blockId: string): Promise<QuizQuestion[]>;
  createQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): Promise<QuizAttempt>;
  getQuizAttemptsByUser(userId: string, blockId: string): Promise<QuizAttempt[]>;

  // Assignment Submissions
  createAssignmentSubmission(submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>): Promise<AssignmentSubmission>;
  getAssignmentSubmissionByUser(userId: string, blockId: string): Promise<AssignmentSubmission | null>;
  getAssignmentSubmissionsByBlock(blockId: string): Promise<AssignmentSubmission[]>;
  gradeAssignmentSubmission(submissionId: string, grading: {
    gradedBy: string;
    score: number;
    maxScore: number;
    feedback?: string;
    rubricScores?: Array<{criteria: string; score: number; maxScore: number; comments?: string}>;
  }): Promise<AssignmentSubmission>;
  getAssignmentSubmissionsByStaff(staffId: string): Promise<Array<AssignmentSubmission & {
    contentBlockTitle: string;
    sessionTitle: string;
    studentName: string;
    studentEmail: string;
  }>>;

  // Content Creation
  createContentBlock(block: Omit<SessionContentBlock, 'id'>): Promise<SessionContentBlock>;
  updateContentBlock(blockId: string, updates: Partial<Omit<SessionContentBlock, 'id' | 'sessionId'>>): Promise<SessionContentBlock | null>;
  deleteContentBlock(blockId: string): Promise<boolean>;
  createQuizQuestion(question: Omit<QuizQuestion, 'id' | 'isActive'>): Promise<QuizQuestion>;
  updateQuizQuestion(questionId: string, updates: Partial<Omit<QuizQuestion, 'id' | 'contentBlockId'>>): Promise<QuizQuestion | null>;
  deleteQuizQuestion(questionId: string): Promise<boolean>;
  getSessionContentBlocks(sessionId: string): Promise<SessionContentBlock[]>;

  // Convenience method for marking content as complete
  markContentAsComplete(contentBlockId: string, userId: string, completionData?: any): Promise<SessionContentProgress>;
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

export class WorkflowSessionRepository implements IWorkflowSessionRepository {
  constructor(private readonly pool: Pool) {}

  // ========================================================================
  // SESSION MAPPING METHODS
  // ========================================================================

  /**
   * Get workflow session by LMS subject ID via mapping table
   */
  public async getSessionBySubjectId(subjectId: string): Promise<WorkflowSession | null> {
    const query = `
      SELECT
        s.id::text as id,
        s.title,
        s.instructor,
        s.duration_minutes as "durationMinutes",
        s.session_description as "sessionDescription",
        s.session_objectives as "sessionObjectives",
        s.detailed_content as "detailedContent",
        s.status,
        s.is_active as "isActive",
        ssm.created_at as "createdAt",
        NULL as "updatedAt"
      FROM lmsact.subject_session_mapping ssm
      INNER JOIN workflowmgmt.sessions s ON ssm.workflow_session_id = s.id
      WHERE ssm.content_map_sub_details_id = $1::uuid
        AND ssm.is_active = true
        AND s.is_active = true
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [subjectId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to get session by subject ID: ${error}`);
    }
  }

  /**
   * Create a new subject-to-session mapping
   */
  public async createSubjectSessionMapping(
    mapping: Omit<SubjectSessionMapping, 'id' | 'createdAt'>
  ): Promise<SubjectSessionMapping> {
    const query = `
      INSERT INTO lmsact.subject_session_mapping (
        content_map_sub_details_id,
        workflow_session_id,
        created_by,
        is_active,
        notes
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
      RETURNING
        id::text,
        content_map_sub_details_id::text as "contentMapSubDetailsId",
        workflow_session_id::text as "workflowSessionId",
        created_at as "createdAt",
        created_by::text as "createdBy",
        is_active as "isActive",
        notes
    `;

    try {
      const result = await this.pool.query(query, [
        mapping.contentMapSubDetailsId,
        mapping.workflowSessionId,
        mapping.createdBy,
        mapping.isActive,
        mapping.notes
      ]);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('This subject is already mapped to this session');
      }
      throw new DomainError(`Failed to create subject-session mapping: ${error}`);
    }
  }

  /**
   * Get all mappings for a subject
   */
  public async getMappingsBySubjectId(subjectId: string): Promise<SubjectSessionMapping[]> {
    const query = `
      SELECT
        id::text,
        content_map_sub_details_id::text as "contentMapSubDetailsId",
        workflow_session_id::text as "workflowSessionId",
        created_at as "createdAt",
        created_by::text as "createdBy",
        is_active as "isActive",
        notes
      FROM lmsact.subject_session_mapping
      WHERE content_map_sub_details_id = $1::uuid
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [subjectId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get mappings by subject ID: ${error}`);
    }
  }

  /**
   * Delete a mapping by ID (soft delete by setting is_active = false)
   */
  public async deleteMappingById(mappingId: string): Promise<boolean> {
    const query = `
      UPDATE lmsact.subject_session_mapping
      SET is_active = false
      WHERE id = $1::uuid
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [mappingId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new DomainError(`Failed to delete mapping: ${error}`);
    }
  }

  // ========================================================================
  // SESSION CONTENT METHODS
  // ========================================================================

  /**
   * Get session by ID from workflowmgmt schema
   */
  public async getSessionById(sessionId: string): Promise<WorkflowSession | null> {
    const query = `
      SELECT
        id::text,
        title,
        instructor,
        duration_minutes as "durationMinutes",
        session_description as "sessionDescription",
        session_objectives as "sessionObjectives",
        detailed_content as "detailedContent",
        status,
        is_active as "isActive",
        NULL as "createdAt",
        NULL as "updatedAt"
      FROM workflowmgmt.sessions
      WHERE id = $1::uuid AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [sessionId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to get session by ID: ${error}`);
    }
  }

  /**
   * Get all content blocks for a session
   */
  public async getContentBlocksBySessionId(sessionId: string): Promise<SessionContentBlock[]> {
    const query = `
      SELECT
        id::text,
        session_id::text as "sessionId",
        type,
        title,
        content_data as "contentData",
        order_index as "orderIndex",
        is_required as "isRequired",
        estimated_time as "estimatedTime",
        is_active as "isActive"
      FROM workflowmgmt.session_content_blocks
      WHERE session_id = $1::uuid
        AND is_active = true
      ORDER BY order_index ASC
    `;

    try {
      const result = await this.pool.query(query, [sessionId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get content blocks by session ID: ${error}`);
    }
  }

  /**
   * Get a single content block by ID
   */
  public async getContentBlockById(blockId: string): Promise<SessionContentBlock | null> {
    const query = `
      SELECT
        id::text,
        session_id::text as "sessionId",
        type,
        title,
        content_data as "contentData",
        order_index as "orderIndex",
        is_required as "isRequired",
        estimated_time as "estimatedTime",
        is_active as "isActive"
      FROM workflowmgmt.session_content_blocks
      WHERE id = $1::uuid AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [blockId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to get content block by ID: ${error}`);
    }
  }

  // ========================================================================
  // PROGRESS TRACKING METHODS
  // ========================================================================

  /**
   * Get user's progress for all content blocks in a session
   */
  public async getUserProgressBySession(userId: string, sessionId: string): Promise<SessionContentProgress[]> {
    const query = `
      SELECT
        scp.id::text,
        scp.content_block_id::text as "contentBlockId",
        scp.user_id::text as "userId",
        scp.is_completed as "isCompleted",
        scp.time_spent as "timeSpent",
        scp.completion_data as "completionData",
        scp.completed_at as "completedAt",
        scp.created_at as "createdAt",
        scp.updated_at as "updatedAt"
      FROM workflowmgmt.session_content_progress scp
      INNER JOIN workflowmgmt.session_content_blocks scb ON scp.content_block_id = scb.id
      WHERE scp.user_id = $1::uuid
        AND scb.session_id = $2::uuid
      ORDER BY scb.order_index ASC
    `;

    try {
      const result = await this.pool.query(query, [userId, sessionId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get user progress by session: ${error}`);
    }
  }

  /**
   * Get user's progress for a specific content block
   */
  public async getUserProgressByBlock(userId: string, blockId: string): Promise<SessionContentProgress | null> {
    const query = `
      SELECT
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        is_completed as "isCompleted",
        time_spent as "timeSpent",
        completion_data as "completionData",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM workflowmgmt.session_content_progress
      WHERE user_id = $1::uuid AND content_block_id = $2::uuid
    `;

    try {
      const result = await this.pool.query(query, [userId, blockId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to get user progress by block: ${error}`);
    }
  }

  /**
   * Create or update user progress for a content block
   */
  public async createOrUpdateProgress(
    progress: Omit<SessionContentProgress, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SessionContentProgress> {
    const query = `
      INSERT INTO workflowmgmt.session_content_progress (
        content_block_id,
        user_id,
        is_completed,
        time_spent,
        completion_data,
        completed_at
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
      ON CONFLICT (content_block_id, user_id)
      DO UPDATE SET
        is_completed = EXCLUDED.is_completed,
        time_spent = EXCLUDED.time_spent,
        completion_data = EXCLUDED.completion_data,
        completed_at = EXCLUDED.completed_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        is_completed as "isCompleted",
        time_spent as "timeSpent",
        completion_data as "completionData",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    try {
      const result = await this.pool.query(query, [
        progress.contentBlockId,
        progress.userId,
        progress.isCompleted,
        progress.timeSpent,
        progress.completionData ? JSON.stringify(progress.completionData) : null,
        progress.completedAt
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create or update progress: ${error}`);
    }
  }


  // ========================================================================
  // COMMENTS METHODS
  // ========================================================================

  /**
   * Get all comments for a content block
   */
  public async getCommentsByBlockId(blockId: string): Promise<SessionComment[]> {
    const query = `
      SELECT
        c.id::text,
        c.content_block_id::text as "contentBlockId",
        c.user_id::text as "userId",
        u.name as "userName",
        c.comment_text as "commentText",
        c.parent_comment_id::text as "parentCommentId",
        c.status,
        c.is_anonymous as "isAnonymous",
        c.likes_count as "likesCount",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        c.is_active as "isActive"
      FROM workflowmgmt.session_content_comments c
      LEFT JOIN workflowmgmt.users u ON c.user_id = u.id
      WHERE c.content_block_id = $1::uuid
        AND c.is_active = true
        AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [blockId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get comments by block ID: ${error}`);
    }
  }

  /**
   * Create a new comment
   */
  public async createComment(
    comment: Omit<SessionComment, 'id' | 'createdAt' | 'updatedAt' | 'likesCount'>
  ): Promise<SessionComment> {
    const query = `
      INSERT INTO workflowmgmt.session_content_comments (
        content_block_id,
        user_id,
        comment_text,
        parent_comment_id,
        status,
        is_anonymous,
        is_active
      ) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7)
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        NULL as "userName",
        comment_text as "commentText",
        parent_comment_id::text as "parentCommentId",
        status,
        is_anonymous as "isAnonymous",
        likes_count as "likesCount",
        created_at as "createdAt",
        updated_at as "updatedAt",
        is_active as "isActive"
    `;

    try {
      const result = await this.pool.query(query, [
        comment.contentBlockId,
        comment.userId,
        comment.commentText,
        comment.parentCommentId,
        comment.status,
        comment.isAnonymous,
        comment.isActive
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create comment: ${error}`);
    }
  }

  /**
   * Update a comment
   */
  public async updateComment(commentId: string, commentText: string): Promise<SessionComment | null> {
    const query = `
      UPDATE workflowmgmt.session_content_comments
      SET comment_text = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        NULL as "userName",
        comment_text as "commentText",
        parent_comment_id::text as "parentCommentId",
        status,
        is_anonymous as "isAnonymous",
        likes_count as "likesCount",
        created_at as "createdAt",
        updated_at as "updatedAt",
        is_active as "isActive"
    `;

    try {
      const result = await this.pool.query(query, [commentId, commentText]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to update comment: ${error}`);
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  public async deleteComment(commentId: string): Promise<boolean> {
    const query = `
      UPDATE workflowmgmt.session_content_comments
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [commentId]);
      return result.rowCount > 0;
    } catch (error) {
      throw new DomainError(`Failed to delete comment: ${error}`);
    }
  }

  // ========================================================================
  // QUIZ METHODS
  // ========================================================================

  /**
   * Get all quiz questions for a content block
   */
  public async getQuizQuestionsByBlockId(blockId: string): Promise<QuizQuestion[]> {
    const query = `
      SELECT
        id::text,
        content_block_id::text as "contentBlockId",
        question_text as "questionText",
        question_type as "questionType",
        options,
        correct_answer as "correctAnswer",
        explanation,
        points,
        difficulty,
        order_index as "orderIndex",
        is_active as "isActive"
      FROM workflowmgmt.session_quiz_questions
      WHERE content_block_id = $1::uuid
        AND is_active = true
      ORDER BY order_index ASC
    `;

    try {
      const result = await this.pool.query(query, [blockId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get quiz questions by block ID: ${error}`);
    }
  }

  /**
   * Create a new quiz attempt
   */
  public async createQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): Promise<QuizAttempt> {
    const query = `
      INSERT INTO workflowmgmt.session_quiz_attempts (
        content_block_id,
        user_id,
        attempt_number,
        score,
        max_score,
        percentage,
        is_passed,
        time_spent,
        started_at,
        completed_at,
        answers
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        attempt_number as "attemptNumber",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        time_spent as "timeSpentSeconds",
        started_at as "startedAt",
        completed_at as "completedAt",
        answers
    `;

    try {
      const result = await this.pool.query(query, [
        attempt.contentBlockId,
        attempt.userId,
        attempt.attemptNumber,
        attempt.score,
        attempt.maxScore,
        attempt.percentage,
        attempt.isPassed,
        attempt.timeSpentSeconds,
        attempt.startedAt,
        attempt.completedAt,
        JSON.stringify(attempt.answers)
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create quiz attempt: ${error}`);
    }
  }

  /**
   * Get all quiz attempts for a user and content block
   */
  public async getQuizAttemptsByUser(userId: string, blockId: string): Promise<QuizAttempt[]> {
    const query = `
      SELECT
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        attempt_number as "attemptNumber",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        time_spent as "timeSpentSeconds",
        started_at as "startedAt",
        completed_at as "completedAt",
        answers
      FROM workflowmgmt.session_quiz_attempts
      WHERE user_id = $1::uuid AND content_block_id = $2::uuid
      ORDER BY attempt_number DESC
    `;

    try {
      const result = await this.pool.query(query, [userId, blockId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get quiz attempts by user: ${error}`);
    }
  }

  // ========================================================================
  // ASSIGNMENT SUBMISSION METHODS
  // ========================================================================

  /**
   * Create a new assignment submission
   */
  public async createAssignmentSubmission(
    submission: Omit<AssignmentSubmission, 'id' | 'submittedAt'>
  ): Promise<AssignmentSubmission> {
    const query = `
      INSERT INTO lmsact.session_assignment_submissions (
        content_block_id,
        user_id,
        submission_text,
        submission_files,
        graded_by,
        graded_at,
        score,
        max_score,
        percentage,
        is_passed,
        feedback,
        rubric_scores,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        submission_text as "submissionText",
        submission_files as "submissionFiles",
        submitted_at as "submittedAt",
        graded_by::text as "gradedBy",
        graded_at as "gradedAt",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        feedback,
        rubric_scores as "rubricScores",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        submission.contentBlockId,
        submission.userId,
        submission.submissionText,
        submission.submissionFiles ? JSON.stringify(submission.submissionFiles) : null,
        submission.gradedBy,
        submission.gradedAt,
        submission.score,
        submission.maxScore,
        submission.percentage,
        submission.isPassed,
        submission.feedback,
        submission.rubricScores ? JSON.stringify(submission.rubricScores) : null,
        submission.status
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create assignment submission: ${error}`);
    }
  }

  /**
   * Get assignment submission by user and content block
   */
  public async getAssignmentSubmissionByUser(
    userId: string,
    blockId: string
  ): Promise<AssignmentSubmission | null> {
    const query = `
      SELECT
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        submission_text as "submissionText",
        submission_files as "submissionFiles",
        submitted_at as "submittedAt",
        graded_by::text as "gradedBy",
        graded_at as "gradedAt",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        feedback,
        rubric_scores as "rubricScores",
        status
      FROM lmsact.session_assignment_submissions
      WHERE user_id = $1 AND content_block_id = $2
    `;

    try {
      const result = await this.pool.query(query, [userId, blockId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to get assignment submission by user: ${error}`);
    }
  }

  /**
   * Get all assignment submissions for a content block
   */
  public async getAssignmentSubmissionsByBlock(blockId: string): Promise<AssignmentSubmission[]> {
    const query = `
      SELECT
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        submission_text as "submissionText",
        submission_files as "submissionFiles",
        submitted_at as "submittedAt",
        graded_by::text as "gradedBy",
        graded_at as "gradedAt",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        feedback,
        rubric_scores as "rubricScores",
        status
      FROM lmsact.session_assignment_submissions
      WHERE content_block_id = $1
      ORDER BY submitted_at DESC
    `;

    try {
      const result = await this.pool.query(query, [blockId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get assignment submissions by block: ${error}`);
    }
  }

  /**
   * Grade an assignment submission
   */
  public async gradeAssignmentSubmission(
    submissionId: string,
    grading: {
      gradedBy: string;
      score: number;
      maxScore: number;
      feedback?: string;
      rubricScores?: Array<{criteria: string; score: number; maxScore: number; comments?: string}>;
    }
  ): Promise<AssignmentSubmission> {
    const percentage = grading.maxScore > 0 ? (grading.score / grading.maxScore) * 100 : 0;
    // Passing percentage is 50%
    const isPassed = percentage >= 50;

    const query = `
      UPDATE lmsact.session_assignment_submissions
      SET
        graded_by = $1,
        graded_at = CURRENT_TIMESTAMP,
        score = $2,
        max_score = $3,
        percentage = $4,
        is_passed = $5,
        feedback = $6,
        rubric_scores = $7,
        status = 'graded'
      WHERE id = $8
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        user_id::text as "userId",
        submission_text as "submissionText",
        submission_files as "submissionFiles",
        submitted_at as "submittedAt",
        graded_by::text as "gradedBy",
        graded_at as "gradedAt",
        score,
        max_score as "maxScore",
        percentage,
        is_passed as "isPassed",
        feedback,
        rubric_scores as "rubricScores",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        grading.gradedBy,
        grading.score,
        grading.maxScore,
        percentage,
        isPassed,
        grading.feedback || null,
        grading.rubricScores ? JSON.stringify(grading.rubricScores) : null,
        submissionId
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Assignment submission not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to grade assignment submission: ${error}`);
    }
  }

  /**
   * Get all assignment submissions for a staff member (for grading interface)
   */
  public async getAssignmentSubmissionsByStaff(staffId: string): Promise<Array<AssignmentSubmission & {
    contentBlockTitle: string;
    sessionTitle: string;
    studentName: string;
    studentEmail: string;
  }>> {
    const query = `
      SELECT
        sub.id::text,
        sub.content_block_id::text as "contentBlockId",
        sub.user_id::text as "userId",
        sub.submission_text as "submissionText",
        sub.submission_files as "submissionFiles",
        sub.submitted_at as "submittedAt",
        sub.graded_by::text as "gradedBy",
        sub.graded_at as "gradedAt",
        sub.score,
        sub.max_score as "maxScore",
        sub.percentage,
        sub.is_passed as "isPassed",
        sub.feedback,
        sub.rubric_scores as "rubricScores",
        sub.status,
        cb.title as "contentBlockTitle",
        s.title as "sessionTitle",
        u.name as "studentName",
        u.email as "studentEmail"
      FROM lmsact.session_assignment_submissions sub
      INNER JOIN workflowmgmt.session_content_blocks cb ON sub.content_block_id = cb.id
      INNER JOIN workflowmgmt.sessions s ON cb.session_id = s.id
      INNER JOIN lmsact.users u ON sub.user_id = u.id
      WHERE cb.id IN (
        SELECT DISTINCT scb.id
        FROM lmsact.subject_staff_assignments ssa
        INNER JOIN lmsact.subject_session_mapping ssm ON ssa.content_map_sub_details_id = ssm.content_map_sub_details_id
        INNER JOIN workflowmgmt.session_content_blocks scb ON ssm.workflow_session_id = scb.session_id
        WHERE ssa.staff_id = $1 AND ssa.is_active = true AND ssm.is_active = true
      )
      ORDER BY sub.submitted_at DESC
    `;

    try {
      const result = await this.pool.query(query, [staffId]);
      return result.rows;
    } catch (error) {
      throw new DomainError(`Failed to get assignment submissions by staff: ${error}`);
    }
  }

  // ========================================================================
  // CONTENT CREATION METHODS
  // ========================================================================

  /**
   * Create a new content block
   */
  public async createContentBlock(block: Omit<SessionContentBlock, 'id'>): Promise<SessionContentBlock> {
    const query = `
      INSERT INTO workflowmgmt.session_content_blocks (
        session_id,
        type,
        title,
        content_data,
        order_index,
        is_required,
        estimated_time,
        is_active
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id::text,
        session_id::text as "sessionId",
        type,
        title,
        content_data as "contentData",
        order_index as "orderIndex",
        is_required as "isRequired",
        estimated_time as "estimatedTime",
        is_active as "isActive",
        created_at as "createdAt"
    `;

    try {
      const result = await this.pool.query(query, [
        block.sessionId,
        block.type,
        block.title,
        JSON.stringify(block.contentData),
        block.orderIndex,
        block.isRequired,
        block.estimatedTime,
        block.isActive,
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create content block: ${error}`);
    }
  }

  /**
   * Update an existing content block
   */
  public async updateContentBlock(
    blockId: string,
    updates: Partial<Omit<SessionContentBlock, 'id' | 'sessionId'>>
  ): Promise<SessionContentBlock | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.contentData !== undefined) {
      setClauses.push(`content_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.contentData));
    }
    if (updates.orderIndex !== undefined) {
      setClauses.push(`order_index = $${paramIndex++}`);
      values.push(updates.orderIndex);
    }
    if (updates.isRequired !== undefined) {
      setClauses.push(`is_required = $${paramIndex++}`);
      values.push(updates.isRequired);
    }
    if (updates.estimatedTime !== undefined) {
      setClauses.push(`estimated_time = $${paramIndex++}`);
      values.push(updates.estimatedTime);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      return this.getContentBlockById(blockId);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(blockId);

    const query = `
      UPDATE workflowmgmt.session_content_blocks
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING
        id::text,
        session_id::text as "sessionId",
        type,
        title,
        content_data as "contentData",
        order_index as "orderIndex",
        is_required as "isRequired",
        estimated_time as "estimatedTime",
        is_active as "isActive"
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to update content block: ${error}`);
    }
  }

  /**
   * Delete a content block
   */
  public async deleteContentBlock(blockId: string): Promise<boolean> {
    const query = `DELETE FROM workflowmgmt.session_content_blocks WHERE id = $1::uuid`;

    try {
      const result = await this.pool.query(query, [blockId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      throw new DomainError(`Failed to delete content block: ${error}`);
    }
  }

  /**
   * Create a quiz question
   */
  public async createQuizQuestion(question: Omit<QuizQuestion, 'id' | 'isActive'>): Promise<QuizQuestion> {
    const query = `
      INSERT INTO workflowmgmt.session_quiz_questions (
        content_block_id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        points,
        difficulty,
        order_index
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        question_text as "questionText",
        question_type as "questionType",
        options,
        correct_answer as "correctAnswer",
        explanation,
        points,
        difficulty,
        order_index as "orderIndex",
        is_active as "isActive"
    `;

    try {
      const result = await this.pool.query(query, [
        question.contentBlockId,
        question.questionText,
        question.questionType,
        question.options ? JSON.stringify(question.options) : null,
        question.correctAnswer ? JSON.stringify(question.correctAnswer) : null,
        question.explanation,
        question.points,
        question.difficulty || 'medium',
        question.orderIndex,
      ]);
      return result.rows[0];
    } catch (error) {
      throw new DomainError(`Failed to create quiz question: ${error}`);
    }
  }

  /**
   * Update a quiz question
   */
  public async updateQuizQuestion(
    questionId: string,
    updates: Partial<Omit<QuizQuestion, 'id' | 'contentBlockId'>>
  ): Promise<QuizQuestion | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.questionText !== undefined) {
      setClauses.push(`question_text = $${paramIndex++}`);
      values.push(updates.questionText);
    }
    if (updates.questionType !== undefined) {
      setClauses.push(`question_type = $${paramIndex++}`);
      values.push(updates.questionType);
    }
    if (updates.options !== undefined) {
      setClauses.push(`options = $${paramIndex++}`);
      values.push(JSON.stringify(updates.options));
    }
    if (updates.correctAnswer !== undefined) {
      setClauses.push(`correct_answer = $${paramIndex++}`);
      values.push(JSON.stringify(updates.correctAnswer));
    }
    if (updates.explanation !== undefined) {
      setClauses.push(`explanation = $${paramIndex++}`);
      values.push(updates.explanation);
    }
    if (updates.points !== undefined) {
      setClauses.push(`points = $${paramIndex++}`);
      values.push(updates.points);
    }
    if (updates.difficulty !== undefined) {
      setClauses.push(`difficulty = $${paramIndex++}`);
      values.push(updates.difficulty);
    }
    if (updates.orderIndex !== undefined) {
      setClauses.push(`order_index = $${paramIndex++}`);
      values.push(updates.orderIndex);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(questionId);

    const query = `
      UPDATE workflowmgmt.session_quiz_questions
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING
        id::text,
        content_block_id::text as "contentBlockId",
        question_text as "questionText",
        question_type as "questionType",
        options,
        correct_answer as "correctAnswer",
        explanation,
        points,
        difficulty,
        order_index as "orderIndex",
        is_active as "isActive"
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new DomainError(`Failed to update quiz question: ${error}`);
    }
  }

  /**
   * Delete a quiz question
   */
  public async deleteQuizQuestion(questionId: string): Promise<boolean> {
    const query = `DELETE FROM workflowmgmt.session_quiz_questions WHERE id = $1::uuid`;

    try {
      const result = await this.pool.query(query, [questionId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      throw new DomainError(`Failed to delete quiz question: ${error}`);
    }
  }

  /**
   * Get all content blocks for a session (alias for getContentBlocksBySessionId)
   */
  public async getSessionContentBlocks(sessionId: string): Promise<SessionContentBlock[]> {
    return this.getContentBlocksBySessionId(sessionId);
  }

  /**
   * Mark content as complete (convenience method)
   */
  public async markContentAsComplete(
    contentBlockId: string,
    userId: string,
    completionData?: any
  ): Promise<SessionContentProgress> {
    return this.createOrUpdateProgress({
      contentBlockId,
      userId,
      isCompleted: true,
      timeSpent: 0,
      completionData: completionData || null,
      completedAt: new Date(),
    });
  }
}
