import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { GetSubjectLearningContentRequest, GetSubjectLearningContentResponse, LearningResourceDTO } from '../../dtos/student-enrollment/StudentEnrollmentDTOs';

/**
 * GetSubjectLearningContentUseCase
 *
 * Provides access to course content and syllabus for enrolled subjects.
 *
 * Process:
 * 1. Validate student is enrolled in the subject
 * 2. Retrieve act_subject_id from content_map_sub_details
 * 3. Fetch course details from workflowmgmt.courses
 * 4. Fetch syllabus content from workflowmgmt.syllabi (if available)
 * 5. Return comprehensive course content
 */
export class GetSubjectLearningContentUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: GetSubjectLearningContentRequest): Promise<GetSubjectLearningContentResponse> {
    // Validate input
    if (!request.studentId) {
      throw new DomainError('Student ID is required');
    }
    if (!request.enrollmentId) {
      throw new DomainError('Enrollment ID is required');
    }

    try {
      // Step 1: Validate enrollment exists and belongs to student
      const enrollment = await this.enrollmentRepository.findById(request.enrollmentId);

      if (!enrollment) {
        throw new DomainError('Enrollment not found');
      }

      if (enrollment.getStudentId() !== request.studentId) {
        throw new DomainError('Unauthorized: This enrollment does not belong to you');
      }

      // Step 2: Get subject details and ACT subject ID
      const subjectQuery = `
        SELECT
          csub.id,
          csub.act_subject_id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits
        FROM lmsact.content_map_sub_details csub
        WHERE csub.id = $1
      `;

      const subjectResult = await this.pool.query(subjectQuery, [enrollment.getContentMapSubDetailsId()]);

      if (subjectResult.rows.length === 0) {
        throw new DomainError('Subject not found');
      }

      const subject = subjectResult.rows[0];

      if (!subject.act_subject_id) {
        throw new DomainError('No ACT subject has been mapped to this enrollment. Please contact your instructor.');
      }

      // Step 3: Fetch course details from workflowmgmt.courses
      const courseQuery = `
        SELECT
          c.id,
          c.name,
          c.code,
          c.description,
          c.credits,
          c.course_type,
          c.duration_weeks,
          c.prerequisites,
          c.learning_objectives,
          c.learning_outcomes,
          c.status
        FROM workflowmgmt.courses c
        WHERE c.id = $1::integer
      `;

      const courseResult = await this.pool.query(courseQuery, [subject.act_subject_id]);

      if (courseResult.rows.length === 0) {
        throw new DomainError('Course details not found in ACT system');
      }

      const course = courseResult.rows[0];

      // Step 4: Try to fetch syllabus content (optional)
      const syllabusQuery = `
        SELECT
          s.id,
          s.title,
          s.detailed_content,
          s.course_description,
          s.learning_objectives,
          s.learning_outcomes,
          s.course_topics,
          s.assessment_methods,
          s.reference_materials,
          s.status
        FROM workflowmgmt.syllabi s
        WHERE s.course_id = $1::integer
          AND (s.status = 'Approved' OR s.status = 'approved')
          AND s.is_active = true
        ORDER BY s.created_date DESC
        LIMIT 1
      `;

      let syllabusResult;
      let syllabus = null;

      try {
        syllabusResult = await this.pool.query(syllabusQuery, [subject.act_subject_id]);
        syllabus = syllabusResult.rows.length > 0 ? syllabusResult.rows[0] : null;
      } catch (syllabusError) {
        // Syllabus is optional, so we just log the error and continue
        console.warn(`⚠️ Could not fetch syllabus for course ${subject.act_subject_id}:`, syllabusError);
      }

      return {
        enrollmentId: enrollment.getId(),
        subjectCode: subject.act_subject_code,
        subjectName: subject.act_subject_name,
        actSubjectId: subject.act_subject_id,
        // Course details (prefer syllabus data if available, fallback to course table)
        credits: course.credits || subject.act_subject_credits || 0,
        courseType: course.course_type || 'N/A',
        durationWeeks: course.duration_weeks || 0,
        description: (syllabus?.course_description) || course.description || null,
        prerequisites: course.prerequisites || null,
        learningObjectives: (syllabus?.learning_objectives) || course.learning_objectives || null,
        learningOutcomes: (syllabus?.learning_outcomes) || course.learning_outcomes || null,
        // Syllabus content
        syllabusContent: syllabus ? syllabus.detailed_content : null,
        // Enrollment progress
        progressPercentage: enrollment.getProgressPercentage(),
        status: enrollment.getStatus(),
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get learning content: ${error.message}`);
    }
  }
}

