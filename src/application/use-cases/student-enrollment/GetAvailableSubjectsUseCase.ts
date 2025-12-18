import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { GetAvailableSubjectsRequest, GetAvailableSubjectsResponse, AvailableSubjectDTO } from '../../dtos/student-enrollment/StudentEnrollmentDTOs';

/**
 * GetAvailableSubjectsUseCase
 * 
 * Shows students which subjects are available for their current semester based on institutional content mapping.
 * 
 * Process:
 * 1. Get student's course and department
 * 2. Query content_map_master to find the content mapping for their course/department
 * 3. Query content_map_sem_details to get the semester details
 * 4. Query content_map_sub_details to get subjects assigned to that semester
 * 5. Check which subjects the student is already enrolled in
 * 6. Return available subjects with enrollment status
 */
export class GetAvailableSubjectsUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: GetAvailableSubjectsRequest): Promise<GetAvailableSubjectsResponse> {
    // Validate input
    if (!request.studentId) {
      throw new DomainError('Student ID is required');
    }
    if (!request.semesterNumber || request.semesterNumber < 1 || request.semesterNumber > 10) {
      throw new DomainError('Semester number must be between 1 and 10');
    }

    try {
      // Step 1: Get student's course, department, and academic year
      const studentQuery = `
        SELECT
          u.id,
          u.course_id,
          u.department_id,
          u.academic_year_id,
          c.course_type::text as course_type
        FROM lmsact.users u
        LEFT JOIN lmsact.courses c ON u.course_id = c.id
        WHERE u.id = $1 AND u.role = 'student'
      `;

      const studentResult = await this.pool.query(studentQuery, [request.studentId]);

      if (studentResult.rows.length === 0) {
        throw new DomainError('Student not found');
      }

      const student = studentResult.rows[0];

      if (!student.course_id || !student.department_id) {
        throw new DomainError('Student is not assigned to a course or department');
      }

      if (!student.academic_year_id) {
        throw new DomainError('Student is not assigned to an academic year');
      }

      // Step 2-4: Get content mapping and subjects for the semester
      // This query ensures subjects are filtered by:
      // 1. LMS course, department, and academic year (from content_map_master)
      // 2. ACT department and regulation (from content_map_master)
      // 3. Semester number (from content_map_sem_details)
      // 4. Subject must exist in workflowmgmt.courses and be active
      const subjectsQuery = `
        SELECT
          csub.id as content_map_sub_details_id,
          csub.act_subject_id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits,
          csub.lms_learning_resource_id,
          csem.id as content_map_sem_details_id,
          cmaster.id as content_map_master_id,
          cmaster.act_department_id,
          cmaster.act_regulation_id
        FROM lmsact.content_map_master cmaster
        INNER JOIN lmsact.content_map_sem_details csem ON csem.content_map_master_id = cmaster.id
        INNER JOIN lmsact.content_map_sub_details csub ON csub.content_map_sem_details_id = csem.id
        WHERE cmaster.lms_course_id = $1
          AND cmaster.lms_department_id = $2
          AND cmaster.lms_academic_year_id = $3
          AND csem.semester_number = $4
          AND cmaster.status != 'inactive'
          AND csub.act_subject_id IS NOT NULL
          AND csub.act_subject_id != ''
          AND EXISTS (
            -- Verify subject exists in ACT system and is active
            -- Simplified check: only verify course exists and is active
            -- Trust the content mapping for department/regulation assignment
            SELECT 1
            FROM workflowmgmt.courses c
            WHERE c.id = csub.act_subject_id::integer
              AND c.is_active = true
          )
        ORDER BY csub.act_subject_code ASC
      `;

      const subjectsResult = await this.pool.query(subjectsQuery, [
        student.course_id,
        student.department_id,
        student.academic_year_id,
        request.semesterNumber,
      ]);

      if (subjectsResult.rows.length === 0) {
        throw new DomainError(`No subjects found for semester ${request.semesterNumber}. Content mapping may not be configured yet.`);
      }

      // Step 5: Check which subjects the student is already enrolled in
      const enrollments = await this.enrollmentRepository.findByStudentIdAndSemester(
        request.studentId,
        request.semesterNumber
      );

      const enrolledSubjectIds = new Set(enrollments.map(e => e.getContentMapSubDetailsId()));
      const enrollmentMap = new Map(enrollments.map(e => [e.getContentMapSubDetailsId(), e.getId()]));

      // Step 6: Build response with enrollment status
      const subjects: AvailableSubjectDTO[] = subjectsResult.rows.map(row => ({
        id: row.content_map_sub_details_id,
        actSubjectId: row.act_subject_id,
        actSubjectCode: row.act_subject_code,
        actSubjectName: row.act_subject_name,
        actSubjectCredits: row.act_subject_credits,
        lmsLearningResourceId: row.lms_learning_resource_id,
        isEnrolled: enrolledSubjectIds.has(row.content_map_sub_details_id),
        enrollmentId: enrollmentMap.get(row.content_map_sub_details_id),
      }));

      const enrolledCount = subjects.filter(s => s.isEnrolled).length;

      // Get IDs from first row (all rows have same master and sem details IDs)
      const firstRow = subjectsResult.rows[0];

      return {
        semesterNumber: request.semesterNumber,
        subjects,
        totalSubjects: subjects.length,
        enrolledSubjects: enrolledCount,
        contentMapMasterId: firstRow.content_map_master_id,
        contentMapSemDetailsId: firstRow.content_map_sem_details_id,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get available subjects: ${error.message}`);
    }
  }
}

