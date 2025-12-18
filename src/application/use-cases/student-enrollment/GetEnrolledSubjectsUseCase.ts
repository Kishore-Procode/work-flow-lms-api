import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { IStudentSubjectEnrollmentRepository } from '../../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { GetEnrolledSubjectsRequest, GetEnrolledSubjectsResponse, EnrolledSubjectDetailDTO } from '../../dtos/student-enrollment/StudentEnrollmentDTOs';

/**
 * GetEnrolledSubjectsUseCase
 * 
 * Displays all subjects the student is currently enrolled in with progress tracking.
 * 
 * Display Information:
 * - Subject code and name
 * - Credits
 * - Enrollment date
 * - Progress percentage
 * - Status (active, completed, etc.)
 * - Quick access to learning content
 */
export class GetEnrolledSubjectsUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly enrollmentRepository: IStudentSubjectEnrollmentRepository
  ) {}

  async execute(request: GetEnrolledSubjectsRequest): Promise<GetEnrolledSubjectsResponse> {
    // Validate input
    if (!request.studentId) {
      throw new DomainError('Student ID is required');
    }

    try {
      // Get enrollments based on filters
      let enrollments;

      if (request.semesterNumber) {
        enrollments = await this.enrollmentRepository.findByStudentIdAndSemester(
          request.studentId,
          request.semesterNumber
        );
      } else if (request.academicYearId) {
        enrollments = await this.enrollmentRepository.findByStudentIdAndAcademicYear(
          request.studentId,
          request.academicYearId
        );
      } else {
        enrollments = await this.enrollmentRepository.findByStudentId(request.studentId);
      }

      if (enrollments.length === 0) {
        return {
          enrollments: [],
          totalEnrollments: 0,
          activeEnrollments: 0,
          completedEnrollments: 0,
        };
      }

      // Get subject details for all enrollments with regulation and syllabus PDF info
      const enrollmentIds = enrollments.map(e => e.getContentMapSubDetailsId());

      const subjectsQuery = `
        SELECT
          csub.id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits,
          csub.lms_learning_resource_id,
          csub.act_subject_id,
          csem.content_map_master_id,
          cmaster.act_regulation_id,
          ay.name as regulation_name,
          syl.id as syllabus_id,
          syl.document_url as syllabus_pdf_url
        FROM lmsact.content_map_sub_details csub
        LEFT JOIN lmsact.content_map_sem_details csem ON csub.content_map_sem_details_id = csem.id
        LEFT JOIN lmsact.content_map_master cmaster ON csem.content_map_master_id = cmaster.id
        LEFT JOIN workflowmgmt.academic_years ay ON cmaster.act_regulation_id::integer = ay.id
        LEFT JOIN workflowmgmt.syllabi syl ON csub.act_subject_id::integer = syl.course_id AND syl.is_active = true
        WHERE csub.id = ANY($1::uuid[])
      `;

      const subjectsResult = await this.pool.query(subjectsQuery, [enrollmentIds]);
      const subjectMap = new Map(subjectsResult.rows.map(row => [row.id, row]));

      // Fetch all lesson plans for all subjects
      const syllabusIds = subjectsResult.rows
        .map(row => row.syllabus_id)
        .filter(id => id != null);

      let lessonPlansMap = new Map<string, any[]>();

      if (syllabusIds.length > 0) {
        const lessonPlansQuery = `
          SELECT
            lp.id,
            lp.syllabus_id,
            lp.module_name,
            lp.title,
            lp.document_url,
            lp.duration_minutes
          FROM workflowmgmt.lesson_plans lp
          WHERE lp.syllabus_id = ANY($1::uuid[])
            AND lp.is_active = true
          ORDER BY lp.module_name, lp.created_date
        `;

        const lessonPlansResult = await this.pool.query(lessonPlansQuery, [syllabusIds]);

        // Group lesson plans by syllabus_id
        lessonPlansResult.rows.forEach(lp => {
          if (!lessonPlansMap.has(lp.syllabus_id)) {
            lessonPlansMap.set(lp.syllabus_id, []);
          }
          lessonPlansMap.get(lp.syllabus_id)!.push({
            id: lp.id,
            moduleName: lp.module_name,
            title: lp.title,
            pdfUrl: lp.document_url,
            duration: lp.duration_minutes,
          });
        });
      }

      // Build response
      const enrollmentDetails: EnrolledSubjectDetailDTO[] = enrollments.map(enrollment => {
        const subject = subjectMap.get(enrollment.getContentMapSubDetailsId());

        if (!subject) {
          throw new DomainError(`Subject not found for enrollment ${enrollment.getId()}`);
        }

        // Get lesson plans for this subject's syllabus
        const lessonPlans = subject.syllabus_id
          ? lessonPlansMap.get(subject.syllabus_id) || []
          : [];

        return {
          enrollmentId: enrollment.getId(),
          subjectId: enrollment.getContentMapSubDetailsId(),
          subjectCode: subject.act_subject_code,
          subjectName: subject.act_subject_name,
          credits: subject.act_subject_credits,
          semesterNumber: enrollment.getSemesterNumber(),
          enrollmentDate: enrollment.getEnrollmentDate(),
          status: enrollment.getStatus(),
          progressPercentage: enrollment.getProgressPercentage(),
          completedAt: enrollment.getCompletedAt(),
          grade: enrollment.getGrade(),
          marksObtained: enrollment.getMarksObtained(),
          totalMarks: enrollment.getTotalMarks(),
          lmsLearningResourceId: subject.lms_learning_resource_id,
          regulationId: subject.act_regulation_id,
          regulationName: subject.regulation_name,
          syllabusPdfUrl: subject.syllabus_pdf_url || null,
          lessonPlans: lessonPlans,
        };
      });

      // Calculate statistics
      const activeCount = enrollmentDetails.filter(e => e.status === 'active').length;
      const completedCount = enrollmentDetails.filter(e => e.status === 'completed').length;

      return {
        enrollments: enrollmentDetails,
        totalEnrollments: enrollmentDetails.length,
        activeEnrollments: activeCount,
        completedEnrollments: completedCount,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get enrolled subjects: ${error.message}`);
    }
  }
}

