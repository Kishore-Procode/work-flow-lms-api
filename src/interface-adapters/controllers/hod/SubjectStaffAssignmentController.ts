/**
 * Subject Staff Assignment Controller
 * 
 * Interface adapter layer controller for handling HOD subject-staff assignment operations.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SubjectStaffAssignmentRepository } from '../../../infrastructure/repositories/SubjectStaffAssignmentRepository';
import { GetSubjectsForAssignmentUseCase } from '../../../application/use-cases/subject-staff-assignment/GetSubjectsForAssignmentUseCase';
import { GetAvailableStaffUseCase } from '../../../application/use-cases/subject-staff-assignment/GetAvailableStaffUseCase';
import { AssignStaffToSubjectUseCase } from '../../../application/use-cases/subject-staff-assignment/AssignStaffToSubjectUseCase';
import { DomainError } from '../../../domain/errors/DomainError';

export class SubjectStaffAssignmentController {
  constructor(private readonly pool: Pool) {}

  /**
   * Get all subjects for a semester with their staff assignments
   * GET /api/v1/hod/subject-assignments/subjects
   */
  async getSubjectsForAssignment(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { semesterNumber, academicYearId } = req.query;

      if (!semesterNumber || !academicYearId) {
        res.status(400).json({
          success: false,
          message: 'Semester number and academic year ID are required'
        });
        return;
      }

      const useCase = new GetSubjectsForAssignmentUseCase(this.pool);
      const result = await useCase.execute({
        hodId,
        semesterNumber: parseInt(semesterNumber as string),
        academicYearId: academicYearId as string
      });

      res.status(200).json({
        success: true,
        message: 'Subjects retrieved successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error in getSubjectsForAssignment:', error);
      
      if (error instanceof DomainError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subjects for assignment'
      });
    }
  }

  /**
   * Get all available staff in HOD's department
   * GET /api/v1/hod/subject-assignments/staff
   */
  async getAvailableStaff(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { semesterNumber, academicYearId } = req.query;

      const useCase = new GetAvailableStaffUseCase(this.pool);
      const result = await useCase.execute({
        hodId,
        semesterNumber: semesterNumber ? parseInt(semesterNumber as string) : undefined,
        academicYearId: academicYearId as string | undefined
      });

      res.status(200).json({
        success: true,
        message: 'Staff retrieved successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error in getAvailableStaff:', error);

      if (error instanceof DomainError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available staff'
      });
    }
  }

  /**
   * Get subjects assigned to a specific staff member
   * GET /api/v1/hod/subject-assignments/staff/:staffId/subjects
   */
  async getStaffAssignedSubjects(req: Request, res: Response): Promise<void> {
    try {
      const { staffId } = req.params;

      console.log('🔍 getStaffAssignedSubjects - staffId:', staffId);

      // Query to get all subjects assigned to this staff member
      const query = `
        SELECT
          ssa.id as assignment_id,
          ssa.content_map_sub_details_id as subject_id,
          cmsd.act_subject_code as subject_code,
          cmsd.act_subject_name as subject_name,
          ssa.semester_number,
          ssa.academic_year_id,
          ay.year_name as academic_year,
          ssa.assigned_at,
          ssa.notes
        FROM lmsact.subject_staff_assignments ssa
        INNER JOIN lmsact.content_map_sub_details cmsd ON ssa.content_map_sub_details_id = cmsd.id
        INNER JOIN lmsact.academic_years ay ON ssa.academic_year_id = ay.id
        WHERE ssa.staff_id = $1
        AND ssa.is_active = true
        ORDER BY ssa.semester_number, cmsd.act_subject_name
      `;

      const result = await this.pool.query(query, [staffId]);

      console.log('🔍 Staff assigned subjects:', result.rows.length);

      res.status(200).json({
        success: true,
        message: 'Staff assigned subjects retrieved successfully',
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error in getStaffAssignedSubjects:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff assigned subjects'
      });
    }
  }

  /**
   * Assign a staff member to a subject
   * POST /api/v1/hod/subject-assignments/assign
   */
  async assignStaffToSubject(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { contentMapSubDetailsId, staffId, semesterNumber, academicYearId, notes } = req.body;

      if (!contentMapSubDetailsId || !staffId || !semesterNumber || !academicYearId) {
        res.status(400).json({
          success: false,
          message: 'Content map subject details ID, staff ID, semester number, and academic year ID are required'
        });
        return;
      }

      const assignmentRepository = new SubjectStaffAssignmentRepository(this.pool);
      const useCase = new AssignStaffToSubjectUseCase(this.pool, assignmentRepository);
      
      const result = await useCase.execute({
        hodId,
        contentMapSubDetailsId,
        staffId,
        semesterNumber: parseInt(semesterNumber),
        academicYearId,
        notes
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.assignment
      });
    } catch (error: any) {
      console.error('Error in assignStaffToSubject:', error);
      
      if (error instanceof DomainError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to assign staff to subject'
      });
    }
  }

  /**
   * Remove staff assignment from a subject
   * DELETE /api/v1/hod/subject-assignments/:assignmentId
   */
  async removeStaffAssignment(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { assignmentId } = req.params;

      if (!assignmentId) {
        res.status(400).json({
          success: false,
          message: 'Assignment ID is required'
        });
        return;
      }

      const assignmentRepository = new SubjectStaffAssignmentRepository(this.pool);

      // Verify HOD owns this assignment
      const assignment = await assignmentRepository.findById(assignmentId);

      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
        return;
      }

      // Verify HOD's department matches assignment's department
      const hodQuery = `
        SELECT department_id FROM lmsact.users
        WHERE id = $1 AND role = 'hod' AND status = 'active'
      `;
      const hodResult = await this.pool.query(hodQuery, [hodId]);

      if (hodResult.rows.length === 0 || hodResult.rows[0].department_id !== assignment.getDepartmentId()) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to remove this assignment'
        });
        return;
      }

      // Deactivate the assignment
      await assignmentRepository.deactivate(assignmentId);

      res.status(200).json({
        success: true,
        message: 'Staff assignment removed successfully'
      });
    } catch (error: any) {
      console.error('Error in removeStaffAssignment:', error);
      
      if (error instanceof DomainError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove staff assignment'
      });
    }
  }

  /**
   * Get courses with content mapping for HOD's department
   * GET /api/v1/hod/subject-assignments/courses
   */
  async getHODCourses(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;

      console.log('🔍 getHODCourses - hodId:', hodId);

      // Get HOD's department
      const hodQuery = `
        SELECT u.id, u.name, u.department_id, d.name as department_name
        FROM lmsact.users u
        LEFT JOIN lmsact.departments d ON u.department_id = d.id
        WHERE u.id = $1 AND u.role = 'hod' AND u.status = 'active'
      `;

      const hodResult = await this.pool.query(hodQuery, [hodId]);

      if (hodResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'HOD user not found or not active'
        });
        return;
      }

      const user = hodResult.rows[0];
      const departmentId = user.department_id;

      if (!departmentId) {
        res.status(400).json({
          success: false,
          message: 'HOD does not have a department assigned'
        });
        return;
      }

      // Get courses that have content mapping for this department
      const coursesQuery = `
        SELECT DISTINCT
          c.id,
          c.name,
          c.code,
          c.course_type,
          c.duration_years,
          COUNT(DISTINCT csem.id) as semester_count,
          COUNT(DISTINCT csub.id) as subject_count
        FROM lmsact.content_map_master cmaster
        INNER JOIN lmsact.courses c ON cmaster.lms_course_id = c.id
        LEFT JOIN lmsact.content_map_sem_details csem ON csem.content_map_master_id = cmaster.id
        LEFT JOIN lmsact.content_map_sub_details csub ON csub.content_map_sem_details_id = csem.id
        WHERE cmaster.lms_department_id = $1
          AND cmaster.status != 'inactive'
          AND c.is_active = TRUE
        GROUP BY c.id, c.name, c.code, c.course_type, c.duration_years
        ORDER BY c.name
      `;

      const coursesResult = await this.pool.query(coursesQuery, [departmentId]);

      console.log('🔍 Courses with content mapping:', coursesResult.rows.length);

      const courses = coursesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        courseType: row.course_type,
        durationYears: row.duration_years,
        semesterCount: parseInt(row.semester_count) || 0,
        subjectCount: parseInt(row.subject_count) || 0
      }));

      res.status(200).json({
        success: true,
        message: 'Courses retrieved successfully',
        data: {
          departmentId: departmentId,
          departmentName: user.department_name,
          courses
        }
      });
    } catch (error: any) {
      console.error('Error in getHODCourses:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve courses'
      });
    }
  }

  /**
   * Get academic years for a course with content mapping
   * GET /api/v1/hod/subject-assignments/academic-years
   */
  async getAcademicYearsForCourse(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { courseId } = req.query;

      console.log('🔍 getAcademicYearsForCourse - hodId:', hodId, 'courseId:', courseId);

      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
        return;
      }

      // Get HOD's department
      const hodQuery = `
        SELECT u.id, u.name, u.department_id, d.name as department_name
        FROM lmsact.users u
        LEFT JOIN lmsact.departments d ON u.department_id = d.id
        WHERE u.id = $1 AND u.role = 'hod' AND u.status = 'active'
      `;

      const hodResult = await this.pool.query(hodQuery, [hodId]);

      if (hodResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'HOD user not found or not active'
        });
        return;
      }

      const user = hodResult.rows[0];
      const departmentId = user.department_id;

      if (!departmentId) {
        res.status(400).json({
          success: false,
          message: 'HOD does not have a department assigned'
        });
        return;
      }

      // Get academic years that have content mapping for this course and department
      const academicYearsQuery = `
        SELECT DISTINCT
          ay.id,
          ay.year_name,
          ay.year_number,
          ay.start_date,
          ay.end_date,
          ay.is_current,
          COUNT(DISTINCT csem.id) as semester_count,
          COUNT(DISTINCT csub.id) as subject_count
        FROM lmsact.content_map_master cmaster
        INNER JOIN lmsact.academic_years ay ON cmaster.lms_academic_year_id = ay.id
        LEFT JOIN lmsact.content_map_sem_details csem ON csem.content_map_master_id = cmaster.id
        LEFT JOIN lmsact.content_map_sub_details csub ON csub.content_map_sem_details_id = csem.id
        WHERE cmaster.lms_department_id = $1
          AND cmaster.lms_course_id = $2
          AND cmaster.status != 'inactive'
        GROUP BY ay.id, ay.year_name, ay.year_number, ay.start_date, ay.end_date, ay.is_current
        ORDER BY ay.year_number DESC, ay.year_name DESC
      `;

      const academicYearsResult = await this.pool.query(academicYearsQuery, [departmentId, courseId]);

      console.log('🔍 Academic years with content mapping:', academicYearsResult.rows.length);

      const academicYears = academicYearsResult.rows.map(row => ({
        id: row.id,
        yearName: row.year_name,
        yearNumber: row.year_number,
        startDate: row.start_date,
        endDate: row.end_date,
        isCurrent: row.is_current,
        semesterCount: parseInt(row.semester_count) || 0,
        subjectCount: parseInt(row.subject_count) || 0
      }));

      res.status(200).json({
        success: true,
        message: 'Academic years retrieved successfully',
        data: {
          departmentId: departmentId,
          departmentName: user.department_name,
          courseId: courseId,
          academicYears
        }
      });
    } catch (error: any) {
      console.error('Error in getAcademicYearsForCourse:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve academic years'
      });
    }
  }

  /**
   * Get HOD's semesters (semesters in their department)
   * GET /api/v1/hod/subject-assignments/semesters
   */
  async getHODSemesters(req: Request, res: Response): Promise<void> {
    try {
      const hodId = (req as any).user?.userId;
      const { courseId, academicYearId } = req.query;

      console.log('🔍 getHODSemesters - hodId:', hodId, 'courseId:', courseId, 'academicYearId:', academicYearId);

      // Get HOD's department
      const hodQuery = `
        SELECT u.id, u.name, u.department_id, d.name as department_name, u.role, u.status
        FROM lmsact.users u
        LEFT JOIN lmsact.departments d ON u.department_id = d.id
        WHERE u.id = $1
      `;

      const hodResult = await this.pool.query(hodQuery, [hodId]);

      console.log('🔍 HOD Query Result:', JSON.stringify(hodResult.rows, null, 2));

      if (hodResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = hodResult.rows[0];

      if (user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: `Access denied. User role is '${user.role}', HOD role required`
        });
        return;
      }

      if (user.status !== 'active') {
        res.status(403).json({
          success: false,
          message: `Account is ${user.status}. Active status required`
        });
        return;
      }

      const departmentId = user.department_id;

      if (!departmentId) {
        res.status(400).json({
          success: false,
          message: 'HOD does not have a department assigned'
        });
        return;
      }

      // Get semesters with subject counts (aggregated by semester number)
      // CRITICAL FIX: Use lms_department_id (which stores the actual UUID)
      // NOT act_department_id (which has old numeric IDs like '1', '3', etc.)
      // IMPORTANT: When there are duplicate semester records, pick the one with the most subjects
      let semestersQuery = `
        WITH semester_subject_counts AS (
          SELECT
            csem.id as sem_details_id,
            csem.semester_number,
            COUNT(DISTINCT csub.id) as subject_count,
            COUNT(DISTINCT CASE WHEN ssa.is_active = TRUE THEN ssa.id END) as assigned_count
          FROM lmsact.content_map_sem_details csem
          INNER JOIN lmsact.content_map_master cmaster
            ON csem.content_map_master_id = cmaster.id
          LEFT JOIN lmsact.content_map_sub_details csub
            ON csub.content_map_sem_details_id = csem.id
          LEFT JOIN lmsact.subject_staff_assignments ssa
            ON csub.id = ssa.content_map_sub_details_id AND ssa.is_active = TRUE
          WHERE cmaster.lms_department_id = $1
            AND cmaster.status != 'inactive'
          GROUP BY csem.id, csem.semester_number
        ),
        best_semester_per_number AS (
          SELECT DISTINCT ON (semester_number)
            sem_details_id,
            semester_number,
            subject_count,
            assigned_count
          FROM semester_subject_counts
          ORDER BY semester_number, subject_count DESC, sem_details_id
        )
        SELECT
          semester_number,
          semester_number || CASE
            WHEN semester_number = 1 THEN 'st'
            WHEN semester_number = 2 THEN 'nd'
            WHEN semester_number = 3 THEN 'rd'
            ELSE 'th'
          END || ' Semester' as semester_name,
          sem_details_id as content_map_sem_details_id,
          subject_count as total_subjects,
          assigned_count as assigned_subjects
        FROM best_semester_per_number
        WHERE 1=1
      `;

      const queryParams: any[] = [departmentId];

      // Build the WHERE clause for filters
      let filterConditions = '';

      // Filter by course if provided
      if (courseId) {
        filterConditions += ` AND cmaster.lms_course_id = $${queryParams.length + 1}`;
        queryParams.push(courseId);
      }

      // Filter by academic year if provided
      if (academicYearId) {
        filterConditions += ` AND cmaster.lms_academic_year_id = $${queryParams.length + 1}`;
        queryParams.push(academicYearId);
      }

      // Replace the placeholder in the CTE query
      semestersQuery = semestersQuery.replace('WHERE cmaster.lms_department_id = $1',
        `WHERE cmaster.lms_department_id = $1${filterConditions}`);

      semestersQuery += `
        ORDER BY semester_number ASC
      `;

      console.log('🔍 Executing semesters query with params:', {
        departmentId,
        courseId,
        queryParams,
        query: semestersQuery
      });

      const semestersResult = await this.pool.query(semestersQuery, queryParams);

      console.log('🔍 Semesters Query Result:', JSON.stringify(semestersResult.rows, null, 2));
      console.log('🔍 Semesters count:', semestersResult.rows.length);

      const semesters = semestersResult.rows.map(row => ({
        semesterNumber: row.semester_number,
        semesterName: row.semester_name,
        totalSubjects: parseInt(row.total_subjects) || 0,
        assignedSubjects: parseInt(row.assigned_subjects) || 0,
        unassignedSubjects: (parseInt(row.total_subjects) || 0) - (parseInt(row.assigned_subjects) || 0),
        contentMapSemDetailsId: row.content_map_sem_details_id
      }));

      res.status(200).json({
        success: true,
        message: 'Semesters retrieved successfully',
        data: {
          departmentId: departmentId,
          departmentName: user.department_name,
          semesters
        }
      });
    } catch (error: any) {
      console.error('Error in getHODSemesters:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve semesters'
      });
    }
  }
}
