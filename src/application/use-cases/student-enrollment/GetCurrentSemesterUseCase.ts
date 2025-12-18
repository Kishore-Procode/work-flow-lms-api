import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import { GetCurrentSemesterRequest, GetCurrentSemesterResponse } from '../../dtos/student-enrollment/StudentEnrollmentDTOs';

/**
 * GetCurrentSemesterUseCase
 * 
 * Calculates which semester a student is currently in based on their batch enrollment dates.
 * 
 * Logic:
 * - Student is enrolled in a batch (e.g., batch_year = 2022 for "2022-2026")
 * - Current date: October 2025
 * - Calculate: Student started in 2022, current year is 2025 → 3 years completed
 * - Formula: ((current_year - batch_start_year) * 2) + (current_month >= 6 ? 2 : 1)
 * - Two durations: Jan-May (Semester 1 of year) and June-Dec (Semester 2 of year)
 */
export class GetCurrentSemesterUseCase {
  constructor(private readonly pool: Pool) {}

  async execute(request: GetCurrentSemesterRequest): Promise<GetCurrentSemesterResponse> {
    // Validate input
    if (!request.studentId) {
      throw new DomainError('Student ID is required');
    }

    // Get student information including course, department, and year of study
    const studentQuery = `
      SELECT
        u.id,
        u.name as student_name,
        u.course_id,
        u.department_id,
        u.year_of_study,
        u.semester,
        u.created_at as enrollment_date,
        c.name as course_name,
        c.course_type::text as course_type,
        c.duration_years,
        d.name as department_name,
        ay.id as academic_year_id,
        ay.year_name as academic_year_name
      FROM lmsact.users u
      LEFT JOIN lmsact.courses c ON u.course_id = c.id
      LEFT JOIN lmsact.departments d ON u.department_id = d.id
      LEFT JOIN lmsact.academic_years ay ON u.academic_year_id = ay.id
      WHERE u.id = $1 AND u.role = 'student'
    `;

    try {
      const studentResult = await this.pool.query(studentQuery, [request.studentId]);

      if (studentResult.rows.length === 0) {
        throw new DomainError('Student not found');
      }

      const student = studentResult.rows[0];

      // Validate required data
      if (!student.course_id) {
        throw new DomainError('Student is not assigned to a course');
      }
      if (!student.department_id) {
        throw new DomainError('Student is not assigned to a department');
      }

      // Calculate current semester based on enrollment date or use existing semester
      let currentSemester: number;
      let batchYear: number;

      if (student.semester) {
        // Parse semester string (e.g., "3rd" -> 3)
        currentSemester = parseInt(student.semester.replace(/\D/g, '')) || 1;
      } else if (student.year_of_study) {
        // Parse year of study (e.g., "2nd" -> 2, then calculate semester)
        const yearNum = parseInt(student.year_of_study.replace(/\D/g, '')) || 1;
        // Assume 2 semesters per year, and we're in the first semester of that year
        currentSemester = (yearNum - 1) * 2 + 1;
      } else if (student.enrollment_date) {
        // Calculate based on enrollment date
        const enrollmentYear = new Date(student.enrollment_date).getFullYear();
        batchYear = enrollmentYear;
        currentSemester = this.calculateCurrentSemester(batchYear);
      } else {
        // Default to semester 1
        currentSemester = 1;
      }

      // Calculate batch year if not already set
      if (!batchYear) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        // Estimate batch year based on current semester
        const yearsCompleted = Math.floor((currentSemester - 1) / 2);
        batchYear = currentYear - yearsCompleted - (currentMonth < 6 ? 1 : 0);
      }

      // Validate semester is within course duration
      const maxSemesters = this.getMaxSemestersForCourseType(student.course_type);
      if (currentSemester > maxSemesters) {
        currentSemester = maxSemesters; // Cap at max semesters
      }

      // Calculate semester dates
      const { startDate, endDate } = this.getSemesterDates(batchYear, currentSemester);

      // Get or create academic year if not set
      let academicYearId = student.academic_year_id;
      let academicYearName = student.academic_year_name;

      if (!academicYearId) {
        // Try to find current academic year
        const currentAcademicYearQuery = `
          SELECT id, year_name
          FROM lmsact.academic_years
          WHERE is_active = true
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const ayResult = await this.pool.query(currentAcademicYearQuery);

        if (ayResult.rows.length > 0) {
          academicYearId = ayResult.rows[0].id;
          academicYearName = ayResult.rows[0].year_name;
        } else {
          throw new DomainError('No active academic year found. Please contact administrator.');
        }
      }

      return {
        studentId: student.id,
        studentName: student.student_name,
        courseType: student.course_type,
        courseName: student.course_name,
        departmentName: student.department_name,
        batchYear,
        currentSemester,
        academicYearId,
        academicYearName,
        semesterStartDate: startDate,
        semesterEndDate: endDate,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get current semester: ${error.message}`);
    }
  }

  /**
   * Calculate current semester based on batch year
   * Formula: ((current_year - batch_start_year) * 2) + (current_month >= 6 ? 2 : 1)
   * Two durations: Jan-May (Semester 1) and June-Dec (Semester 2)
   */
  private calculateCurrentSemester(batchYear: number): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Calculate years completed
    const yearsCompleted = currentYear - batchYear;

    // Determine which semester of the current year
    // Jan-May = Semester 1, June-Dec = Semester 2
    const semesterInYear = currentMonth >= 6 ? 2 : 1;

    // Calculate total semester number
    const currentSemester = (yearsCompleted * 2) + semesterInYear;

    return currentSemester;
  }

  /**
   * Get maximum semesters for a course type
   */
  private getMaxSemestersForCourseType(courseType: string): number {
    const semesterMap: Record<string, number> = {
      'Diploma': 6,
      'UG': 8,
      'PG': 4,
      'Certificate': 2,
    };

    return semesterMap[courseType] || 8; // Default to 8 if unknown
  }

  /**
   * Calculate semester start and end dates
   * Jan-May = Semester 1 (Jan 1 - May 31)
   * June-Dec = Semester 2 (June 1 - Dec 31)
   */
  private getSemesterDates(batchYear: number, semesterNumber: number): { startDate: Date; endDate: Date } {
    // Calculate which year this semester falls in
    const yearOffset = Math.floor((semesterNumber - 1) / 2);
    const year = batchYear + yearOffset;

    // Determine if it's semester 1 or 2 of that year
    const isFirstSemester = semesterNumber % 2 === 1;

    if (isFirstSemester) {
      // Jan-May
      return {
        startDate: new Date(year, 0, 1), // January 1
        endDate: new Date(year, 4, 31), // May 31
      };
    } else {
      // June-Dec
      return {
        startDate: new Date(year, 5, 1), // June 1
        endDate: new Date(year, 11, 31), // December 31
      };
    }
  }
}

