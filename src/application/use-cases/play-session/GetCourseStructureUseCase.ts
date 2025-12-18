import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';

/**
 * GetCourseStructureUseCase
 *
 * Retrieves the complete hierarchical course structure for an enrolled subject.
 * This provides the full Syllabus → Lesson Plans → Sessions → Content Blocks hierarchy.
 *
 * Process:
 * 1. Validate user is enrolled in the subject
 * 2. Query the complete course hierarchy from workflowmgmt schema
 * 3. Return structured data for the Course Player UI
 *
 * Hierarchy:
 * - Syllabus (Course-level document with PDF)
 *   - Lesson Plans (Modules/Chapters)
 *     - Sessions (Topics/Lessons)
 *       - Content Blocks (Videos, PDFs, Quizzes, etc.)
 */

export interface GetCourseStructureRequest {
  subjectId: string;
  userId: string;
}

export interface ContentBlock {
  id: string;
  type: string;
  title: string;
  order: number;
  estimatedTime: string | null;
  isRequired: boolean;
}

export interface Session {
  id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  duration: number | null;
  contentBlocks: ContentBlock[];
}

export interface LessonPlan {
  id: string;
  moduleName: string;
  title: string;
  duration: number | null;
  numberOfSessions: number;
  pdfUrl: string | null;
  sessions: Session[];
}

export interface CourseStructure {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  syllabus: {
    id: string | null;
    title: string | null;
    pdfUrl: string | null;
  };
  lessons: LessonPlan[];
  totalSessions: number;
  totalContentBlocks: number;
}

export class GetCourseStructureUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: GetCourseStructureRequest): Promise<CourseStructure> {
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

      // Step 2: Get subject details
      const subjectQuery = `
        SELECT 
          csub.id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_id
        FROM lmsact.content_map_sub_details csub
        WHERE csub.id = $1
      `;

      const subjectResult = await this.pool.query(subjectQuery, [request.subjectId]);

      if (subjectResult.rows.length === 0) {
        throw new DomainError('Subject not found');
      }

      const subject = subjectResult.rows[0];

      // Step 3: Get complete course structure
      const structureQuery = `
        SELECT
          syl.id as syllabus_id,
          syl.title as syllabus_title,
          syl.document_url as syllabus_pdf_url,
          lp.id as lesson_id,
          lp.module_name as lesson_module_name,
          lp.title as lesson_title,
          lp.duration_minutes as lesson_duration,
          lp.number_of_sessions as lesson_session_count,
          lp.document_url as lesson_pdf_url,
          s.id as session_id,
          s.title as session_title,
          s.session_description as session_description,
          s.session_objectives as session_objectives,
          s.duration_minutes as session_duration,
          scb.id as content_block_id,
          scb.type as content_type,
          scb.title as content_title,
          scb.order_index as content_order,
          scb.estimated_time as content_duration,
          scb.is_required as content_required
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
        ORDER BY lp.module_name, s.title, scb.order_index
      `;

      const structureResult = await this.pool.query(structureQuery, [request.subjectId]);

      // Step 4: Transform flat data into hierarchical structure
      const courseStructure = this.transformToHierarchy(
        subject,
        structureResult.rows
      );

      return courseStructure;
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get course structure: ${error.message}`);
    }
  }

  /**
   * Transform flat database rows into hierarchical structure
   */
  private transformToHierarchy(subject: any, rows: any[]): CourseStructure {
    // Initialize structure
    const structure: CourseStructure = {
      subjectId: subject.id,
      subjectCode: subject.act_subject_code,
      subjectName: subject.act_subject_name,
      syllabus: {
        id: null,
        title: null,
        pdfUrl: null,
      },
      lessons: [],
      totalSessions: 0,
      totalContentBlocks: 0,
    };

    if (rows.length === 0) {
      return structure;
    }

    // Set syllabus info (same for all rows)
    const firstRow = rows[0];
    structure.syllabus = {
      id: firstRow.syllabus_id,
      title: firstRow.syllabus_title,
      pdfUrl: firstRow.syllabus_pdf_url,
    };

    // Group by lesson → session → content blocks
    const lessonMap = new Map<string, LessonPlan>();
    const sessionMap = new Map<string, Session>();

    for (const row of rows) {
      // Skip rows without lesson data
      if (!row.lesson_id) continue;

      // Get or create lesson
      if (!lessonMap.has(row.lesson_id)) {
        lessonMap.set(row.lesson_id, {
          id: row.lesson_id,
          moduleName: row.lesson_module_name,
          title: row.lesson_title,
          duration: row.lesson_duration,
          numberOfSessions: row.lesson_session_count,
          pdfUrl: row.lesson_pdf_url,
          sessions: [],
        });
      }

      const lesson = lessonMap.get(row.lesson_id)!;

      // Skip rows without session data
      if (!row.session_id) continue;

      // Get or create session
      const sessionKey = `${row.lesson_id}-${row.session_id}`;
      if (!sessionMap.has(sessionKey)) {
        const session: Session = {
          id: row.session_id,
          title: row.session_title,
          description: row.session_description,
          objectives: row.session_objectives,
          duration: row.session_duration,
          contentBlocks: [],
        };
        sessionMap.set(sessionKey, session);
        lesson.sessions.push(session);
        structure.totalSessions++;
      }

      const session = sessionMap.get(sessionKey)!;

      // Add content block if exists
      if (row.content_block_id) {
        session.contentBlocks.push({
          id: row.content_block_id,
          type: row.content_type,
          title: row.content_title,
          order: row.content_order,
          estimatedTime: row.content_duration,
          isRequired: row.content_required,
        });
        structure.totalContentBlocks++;
      }
    }

    // Convert map to array
    structure.lessons = Array.from(lessonMap.values());

    return structure;
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

