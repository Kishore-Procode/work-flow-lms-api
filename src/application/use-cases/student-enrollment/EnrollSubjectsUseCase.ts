import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { StudentSubjectEnrollment } from '../../../domain/entities/StudentSubjectEnrollment';
import { EnrollSubjectsRequest, EnrollSubjectsResponse, EnrolledSubjectDTO } from '../../dtos/student-enrollment/StudentEnrollmentDTOs';

/**
 * EnrollSubjectsUseCase
 * 
 * Allows students to select and enroll in subjects for their current semester.
 * 
 * Features:
 * - Validate enrollment (check prerequisites, prevent duplicate enrollment)
 * - Save enrollment to database
 * - Return confirmation with enrolled subjects
 */
export class EnrollSubjectsUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: EnrollSubjectsRequest): Promise<EnrollSubjectsResponse> {
    // Validate input
    if (!request.studentId) {
      throw new DomainError('Student ID is required');
    }
    if (!request.semesterNumber || request.semesterNumber < 1 || request.semesterNumber > 10) {
      throw new DomainError('Semester number must be between 1 and 10');
    }
    if (!request.academicYearId) {
      throw new DomainError('Academic year ID is required');
    }
    if (!request.subjectIds || request.subjectIds.length === 0) {
      throw new DomainError('At least one subject must be selected for enrollment');
    }

    try {
      // Step 1: Validate student exists and is active
      const studentQuery = `
        SELECT id, name, status, course_id, department_id
        FROM lmsact.users
        WHERE id = $1 AND role = 'student'
      `;

      const studentResult = await this.pool.query(studentQuery, [request.studentId]);

      if (studentResult.rows.length === 0) {
        throw new DomainError('Student not found');
      }

      const student = studentResult.rows[0];

      if (student.status !== 'active') {
        throw new DomainError('Student account is not active');
      }

      // Step 2: Validate all subject IDs exist and belong to the correct semester
      const subjectsQuery = `
        SELECT 
          csub.id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits,
          csem.semester_number,
          cmaster.lms_course_id,
          cmaster.lms_department_id,
          cmaster.lms_academic_year_id
        FROM lmsact.content_map_sub_details csub
        INNER JOIN lmsact.content_map_sem_details csem ON csub.content_map_sem_details_id = csem.id
        INNER JOIN lmsact.content_map_master cmaster ON csem.content_map_master_id = cmaster.id
        WHERE csub.id = ANY($1::uuid[])
      `;

      const subjectsResult = await this.pool.query(subjectsQuery, [request.subjectIds]);

      if (subjectsResult.rows.length !== request.subjectIds.length) {
        throw new DomainError('One or more subject IDs are invalid');
      }

      // Validate all subjects belong to the requested semester
      const invalidSemesterSubjects = subjectsResult.rows.filter(
        row => row.semester_number !== request.semesterNumber
      );

      if (invalidSemesterSubjects.length > 0) {
        throw new DomainError(`Some subjects do not belong to semester ${request.semesterNumber}`);
      }

      // Validate subjects belong to student's course and department
      const invalidCourseSubjects = subjectsResult.rows.filter(
        row => row.lms_course_id !== student.course_id || 
               row.lms_department_id !== student.department_id ||
               row.lms_academic_year_id !== request.academicYearId
      );

      if (invalidCourseSubjects.length > 0) {
        throw new DomainError('Some subjects do not belong to your course or department');
      }

      // Step 3: Check for duplicate enrollments
      const existingEnrollments = await this.enrollmentRepository.findByStudentIdAndSemester(
        request.studentId,
        request.semesterNumber
      );

      const alreadyEnrolledIds = new Set(existingEnrollments.map(e => e.getContentMapSubDetailsId()));
      const duplicateSubjects = request.subjectIds.filter(id => alreadyEnrolledIds.has(id));

      if (duplicateSubjects.length > 0) {
        const duplicateNames = subjectsResult.rows
          .filter(row => duplicateSubjects.includes(row.id))
          .map(row => row.act_subject_name)
          .join(', ');
        throw new DomainError(`You are already enrolled in: ${duplicateNames}`);
      }

      // Step 4: Create enrollment entities
      const enrollments = request.subjectIds.map(subjectId => 
        StudentSubjectEnrollment.create({
          studentId: request.studentId,
          contentMapSubDetailsId: subjectId,
          semesterNumber: request.semesterNumber,
          academicYearId: request.academicYearId,
          status: 'active',
          progressPercentage: 0,
        })
      );

      // Step 5: Save enrollments to database
      const savedEnrollments = await this.enrollmentRepository.bulkSave(enrollments);

      // Step 6: Build response
      const enrolledSubjects: EnrolledSubjectDTO[] = savedEnrollments.map(enrollment => {
        const subject = subjectsResult.rows.find(row => row.id === enrollment.getContentMapSubDetailsId())!;
        return {
          enrollmentId: enrollment.getId(),
          subjectId: enrollment.getContentMapSubDetailsId(),
          subjectCode: subject.act_subject_code,
          subjectName: subject.act_subject_name,
          credits: subject.act_subject_credits,
          enrollmentDate: enrollment.getEnrollmentDate(),
        };
      });

      return {
        message: `Successfully enrolled in ${savedEnrollments.length} subject(s)`,
        enrolledSubjects,
        totalEnrolled: savedEnrollments.length,
        semesterNumber: request.semesterNumber,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to enroll in subjects: ${error.message}`);
    }
  }
}

