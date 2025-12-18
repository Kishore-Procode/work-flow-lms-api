import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { Pool } from 'pg';

/**
 * GetBulkUserProgressUseCase
 *
 * Retrieves user's progress for ALL content blocks across ALL sessions in a subject/course.
 * This is optimized for the Course Player to load all progress data in a single API call.
 *
 * Process:
 * 1. Validate user is enrolled in the subject
 * 2. Get all sessions for the subject (from course structure)
 * 3. Fetch progress for all content blocks across all sessions in one query
 * 4. Calculate overall course completion statistics
 * 5. Return comprehensive progress data
 */

export interface GetBulkUserProgressRequest {
  subjectId: string;
  userId: string;
}

export interface ContentBlockProgress {
  contentBlockId: string;
  sessionId: string;
  contentBlockTitle: string;
  contentBlockType: string;
  isCompleted: boolean;
  timeSpent: number; // seconds
  completionData: any | null;
  completedAt: Date | null;
}

export interface SessionProgress {
  sessionId: string;
  sessionTitle: string;
  totalBlocks: number;
  completedBlocks: number;
  completionPercentage: number;
  totalTimeSpent: number;
}

export interface GetBulkUserProgressResponse {
  subjectId: string;
  userId: string;
  progress: ContentBlockProgress[];
  sessionProgress: SessionProgress[];
  overallStatistics: {
    totalSessions: number;
    totalBlocks: number;
    completedBlocks: number;
    requiredBlocks: number;
    completedRequiredBlocks: number;
    completionPercentage: number;
    totalTimeSpent: number; // seconds
  };
}

export class GetBulkUserProgressUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: GetBulkUserProgressRequest): Promise<GetBulkUserProgressResponse> {
    // Validate input
    if (!request.subjectId) {
      throw new DomainError('Subject ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }

    try {
      // Step 1: Validate user has access to this subject
      const hasAccess = await this.validateUserAccess(request.subjectId, request.userId);

      if (!hasAccess) {
        throw new DomainError('Unauthorized: You are not enrolled in this subject');
      }

      // Step 2: Get all sessions and content blocks for this subject
      const contentQuery = `
        SELECT 
          s.id as session_id,
          s.title as session_title,
          scb.id as content_block_id,
          scb.title as content_block_title,
          scb.type as content_block_type,
          scb.is_required as is_required
        FROM lmsact.content_map_sub_details csub
        LEFT JOIN workflowmgmt.syllabi syl 
          ON csub.act_subject_id::integer = syl.course_id 
          AND syl.is_active = true
        LEFT JOIN workflowmgmt.lesson_plans lp 
          ON syl.id = lp.syllabus_id 
          AND lp.is_active = true
        LEFT JOIN workflowmgmt.sessions s 
          ON lp.id = s.lesson_plan_id 
          AND s.is_active = true
        LEFT JOIN workflowmgmt.session_content_blocks scb 
          ON s.id = scb.session_id 
          AND scb.is_active = true
        WHERE csub.id = $1
          AND scb.id IS NOT NULL
        ORDER BY s.title, scb.order_index
      `;

      const contentResult = await this.pool.query(contentQuery, [request.subjectId]);

      if (contentResult.rows.length === 0) {
        // No content blocks found - return empty progress
        return {
          subjectId: request.subjectId,
          userId: request.userId,
          progress: [],
          sessionProgress: [],
          overallStatistics: {
            totalSessions: 0,
            totalBlocks: 0,
            completedBlocks: 0,
            requiredBlocks: 0,
            completedRequiredBlocks: 0,
            completionPercentage: 0,
            totalTimeSpent: 0,
          },
        };
      }

      // Step 3: Get all content block IDs
      const contentBlockIds = contentResult.rows.map(row => row.content_block_id);

      // Step 4: Fetch progress for all content blocks in one query
      const progressQuery = `
        SELECT
          scp.content_block_id::text as "contentBlockId",
          scp.is_completed as "isCompleted",
          scp.time_spent as "timeSpent",
          scp.completion_data as "completionData",
          scp.completed_at as "completedAt"
        FROM workflowmgmt.session_content_progress scp
        WHERE scp.user_id = $1::uuid
          AND scp.content_block_id = ANY($2::uuid[])
      `;

      const progressResult = await this.pool.query(progressQuery, [
        request.userId,
        contentBlockIds,
      ]);

      // Create progress map for quick lookup
      const progressMap = new Map(
        progressResult.rows.map(p => [p.contentBlockId, p])
      );

      // Step 5: Build progress array with content block details
      const progressArray: ContentBlockProgress[] = contentResult.rows.map(row => {
        const progress = progressMap.get(row.content_block_id);
        return {
          contentBlockId: row.content_block_id,
          sessionId: row.session_id,
          contentBlockTitle: row.content_block_title,
          contentBlockType: row.content_block_type,
          isCompleted: progress?.isCompleted || false,
          timeSpent: progress?.timeSpent || 0,
          completionData: progress?.completionData || null,
          completedAt: progress?.completedAt || null,
        };
      });

      // Step 6: Calculate session-level progress
      const sessionMap = new Map<string, SessionProgress>();
      
      for (const row of contentResult.rows) {
        if (!sessionMap.has(row.session_id)) {
          sessionMap.set(row.session_id, {
            sessionId: row.session_id,
            sessionTitle: row.session_title,
            totalBlocks: 0,
            completedBlocks: 0,
            completionPercentage: 0,
            totalTimeSpent: 0,
          });
        }

        const sessionProgress = sessionMap.get(row.session_id)!;
        sessionProgress.totalBlocks++;

        const progress = progressMap.get(row.content_block_id);
        if (progress?.isCompleted) {
          sessionProgress.completedBlocks++;
        }
        if (progress?.timeSpent) {
          sessionProgress.totalTimeSpent += progress.timeSpent;
        }
      }

      // Calculate completion percentages for each session
      sessionMap.forEach(session => {
        session.completionPercentage = session.totalBlocks > 0
          ? Math.round((session.completedBlocks / session.totalBlocks) * 100)
          : 0;
      });

      // Step 7: Calculate overall statistics
      const totalBlocks = contentResult.rows.length;
      const completedBlocks = progressArray.filter(p => p.isCompleted).length;
      const requiredBlocks = contentResult.rows.filter(r => r.is_required).length;
      const completedRequiredBlocks = contentResult.rows
        .filter(r => r.is_required && progressMap.get(r.content_block_id)?.isCompleted)
        .length;
      
      const completionPercentage = requiredBlocks > 0
        ? Math.round((completedRequiredBlocks / requiredBlocks) * 100)
        : 0;

      const totalTimeSpent = progressArray.reduce((sum, p) => sum + p.timeSpent, 0);
      const totalSessions = new Set(contentResult.rows.map(r => r.session_id)).size;

      return {
        subjectId: request.subjectId,
        userId: request.userId,
        progress: progressArray,
        sessionProgress: Array.from(sessionMap.values()),
        overallStatistics: {
          totalSessions,
          totalBlocks,
          completedBlocks,
          requiredBlocks,
          completedRequiredBlocks,
          completionPercentage,
          totalTimeSpent,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get bulk user progress: ${error.message}`);
    }
  }

  /**
   * Validate that the user is enrolled in the subject
   */
  private async validateUserAccess(subjectId: string, userId: string): Promise<boolean> {
    try {
      const enrollments = await this.enrollmentRepository.findByStudentId(userId);

      const hasEnrollment = enrollments.some(
        enrollment =>
          enrollment.getContentMapSubDetailsId() === subjectId &&
          (enrollment.getStatus() === 'active' ||
            enrollment.getStatus() === 'completed')
      );

      return hasEnrollment;
    } catch (error) {
      console.error('❌ Error validating user access:', error);
      return false;
    }
  }
}

