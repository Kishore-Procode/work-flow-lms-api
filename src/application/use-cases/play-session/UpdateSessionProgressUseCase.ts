import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SessionContentProgress } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { Pool } from 'pg';

/**
 * UpdateSessionProgressUseCase
 *
 * Updates user's progress for a content block and synchronizes with LMS enrollment.
 * Handles both creation and updates (UPSERT pattern).
 *
 * Process:
 * 1. Validate content block exists
 * 2. Create or update progress in workflowmgmt.session_content_progress
 * 3. Calculate overall session completion
 * 4. Update LMS enrollment progress_percentage
 * 5. Update enrollment status if completed
 */

export interface UpdateSessionProgressRequest {
  contentBlockId: string;
  userId: string;
  enrollmentId?: string; // Optional: for syncing with LMS enrollment
  isCompleted: boolean;
  timeSpent: number; // seconds
  completionData?: any; // Optional: quiz scores, video watch time, etc.
}

export interface UpdateSessionProgressResponse {
  progress: {
    id: string;
    contentBlockId: string;
    userId: string;
    isCompleted: boolean;
    timeSpent: number;
    completionData: any | null;
    completedAt: Date | null;
  };
  sessionProgress: {
    completionPercentage: number;
    completedBlocks: number;
    totalRequiredBlocks: number;
  };
  enrollmentUpdated: boolean;
}

export class UpdateSessionProgressUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: UpdateSessionProgressRequest): Promise<UpdateSessionProgressResponse> {
    // Validate input
    if (!request.contentBlockId) {
      throw new DomainError('Content block ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }
    if (typeof request.isCompleted !== 'boolean') {
      throw new DomainError('isCompleted must be a boolean');
    }
    if (typeof request.timeSpent !== 'number' || request.timeSpent < 0) {
      throw new DomainError('timeSpent must be a non-negative number');
    }

    try {
      // Step 1: Validate content block exists
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Content block not found');
      }

      // Step 2: Create or update progress
      const progressData: Omit<SessionContentProgress, 'id' | 'createdAt' | 'updatedAt'> = {
        contentBlockId: request.contentBlockId,
        userId: request.userId,
        isCompleted: request.isCompleted,
        timeSpent: request.timeSpent,
        completionData: request.completionData || null,
        completedAt: request.isCompleted ? new Date() : null,
      };

      const updatedProgress = await this.sessionRepository.createOrUpdateProgress(progressData);

      // Step 3: Calculate overall session progress
      const sessionProgress = await this.calculateSessionProgress(
        contentBlock.sessionId,
        request.userId
      );

      // Step 4: Sync with LMS enrollment if enrollmentId provided
      let enrollmentUpdated = false;
      let overallCourseProgress = sessionProgress.completionPercentage;

      if (request.enrollmentId) {
        // Calculate progress across ALL sessions in the subject/course
        overallCourseProgress = await this.calculateCourseProgress(
          request.enrollmentId,
          request.userId
        );

        enrollmentUpdated = await this.syncEnrollmentProgress(
          request.enrollmentId,
          overallCourseProgress
        );
      }

      return {
        progress: {
          id: updatedProgress.id,
          contentBlockId: updatedProgress.contentBlockId,
          userId: updatedProgress.userId,
          isCompleted: updatedProgress.isCompleted,
          timeSpent: updatedProgress.timeSpent,
          completionData: updatedProgress.completionData,
          completedAt: updatedProgress.completedAt,
        },
        sessionProgress,
        enrollmentUpdated,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to update session progress: ${error.message}`);
    }
  }

  /**
   * Calculate overall session completion percentage
   */
  private async calculateSessionProgress(
    sessionId: string,
    userId: string
  ): Promise<{ completionPercentage: number; completedBlocks: number; totalRequiredBlocks: number }> {
    try {
      // Get all content blocks for the session
      const contentBlocks = await this.sessionRepository.getContentBlocksBySessionId(sessionId);

      // Get user's progress
      const userProgress = await this.sessionRepository.getUserProgressBySession(userId, sessionId);

      // Create progress map
      const progressMap = new Map(userProgress.map(p => [p.contentBlockId, p]));

      // Calculate completion
      const requiredBlocks = contentBlocks.filter(b => b.isRequired);
      const completedRequiredBlocks = requiredBlocks.filter(
        b => progressMap.get(b.id)?.isCompleted
      ).length;

      const completionPercentage = requiredBlocks.length > 0
        ? Math.round((completedRequiredBlocks / requiredBlocks.length) * 100)
        : 0;

      return {
        completionPercentage,
        completedBlocks: completedRequiredBlocks,
        totalRequiredBlocks: requiredBlocks.length,
      };
    } catch (error) {
      console.error('Error calculating session progress:', error);
      return {
        completionPercentage: 0,
        completedBlocks: 0,
        totalRequiredBlocks: 0,
      };
    }
  }

  /**
   * Calculate overall course/subject completion percentage across ALL sessions
   */
  private async calculateCourseProgress(
    enrollmentId: string,
    userId: string
  ): Promise<number> {
    try {
      // Get the enrollment to find the subject ID
      const enrollment = await this.enrollmentRepository.findById(enrollmentId);
      if (!enrollment) {
        console.warn(`Enrollment ${enrollmentId} not found`);
        return 0;
      }

      const subjectId = enrollment.getContentMapSubDetailsId();

      // Get all sessions and content blocks for this subject
      const contentQuery = `
        SELECT s.id as session_id, scb.id as content_block_id, scb.is_required
        FROM lmsact.content_map_sub_details csub
        LEFT JOIN workflowmgmt.syllabi syl ON csub.act_subject_id::integer = syl.course_id
        LEFT JOIN workflowmgmt.lesson_plans lp ON syl.id = lp.syllabus_id
        LEFT JOIN workflowmgmt.sessions s ON lp.id = s.lesson_plan_id
        LEFT JOIN workflowmgmt.session_content_blocks scb ON s.id = scb.session_id
        WHERE csub.id = $1 AND scb.id IS NOT NULL
      `;

      const contentResult = await this.pool.query(contentQuery, [subjectId]);

      if (contentResult.rows.length === 0) {
        return 0;
      }

      // Get all content block IDs
      const contentBlockIds = contentResult.rows.map(row => row.content_block_id);

      // Fetch progress for all content blocks
      const progressQuery = `
        SELECT content_block_id, is_completed
        FROM workflowmgmt.session_content_progress
        WHERE user_id = $1::uuid AND content_block_id = ANY($2::uuid[])
      `;

      const progressResult = await this.pool.query(progressQuery, [userId, contentBlockIds]);

      // Create progress map
      const progressMap = new Map(
        progressResult.rows.map(row => [row.content_block_id, row.is_completed])
      );

      // Calculate completion based on required blocks only
      const requiredBlocks = contentResult.rows.filter(row => row.is_required);
      const completedRequiredBlocks = requiredBlocks.filter(
        row => progressMap.get(row.content_block_id) === true
      ).length;

      const completionPercentage = requiredBlocks.length > 0
        ? Math.round((completedRequiredBlocks / requiredBlocks.length) * 100)
        : 0;

      console.log('📊 Course Progress Calculation:', {
        subjectId,
        enrollmentId,
        totalRequiredBlocks: requiredBlocks.length,
        completedRequiredBlocks,
        completionPercentage,
      });

      return completionPercentage;
    } catch (error) {
      console.error('❌ Error calculating course progress:', error);
      return 0;
    }
  }

  /**
   * Sync progress with LMS enrollment
   */
  private async syncEnrollmentProgress(
    enrollmentId: string,
    completionPercentage: number
  ): Promise<boolean> {
    try {
      const enrollment = await this.enrollmentRepository.findById(enrollmentId);

      if (!enrollment) {
        console.warn(`Enrollment ${enrollmentId} not found for progress sync`);
        return false;
      }

      // Update progress percentage
      enrollment.updateProgress(completionPercentage);

      // Update status if completed
      if (completionPercentage === 100 && enrollment.getStatus() !== 'completed') {
        // Note: You may need to add a method to update status
        // For now, we just update the progress
      }

      await this.enrollmentRepository.update(enrollment);

      return true;
    } catch (error) {
      console.error('Error syncing enrollment progress:', error);
      return false;
    }
  }
}

