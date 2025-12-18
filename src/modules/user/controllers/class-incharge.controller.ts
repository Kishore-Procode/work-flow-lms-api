import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { convertKeysToCamelCase } from '../../../utils/convertKeys';

export class ClassInChargeController {
  /**
   * Get overview of all class in-charge assignments in the department
   */
  async getAssignmentsOverview(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      console.log('🔍 Class In-Charge Overview - User:', JSON.stringify(user, null, 2));

      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can view class in-charge assignments overview'
        });
        return;
      }

      if (!user.departmentId && !user.department_id) {
        console.error('❌ User missing departmentId:', user);
        res.status(400).json({
          success: false,
          message: 'User department information not found. Please contact administrator.'
        });
        return;
      }

      const query = `
        SELECT
          s.id as section_id,
          s.name as section_name,
          s.max_students,
          s.current_students,
          s.status as section_status,
          s.academic_session,
          ay.year_name as academic_year,
          ay.year_number,
          c.name as course_name,
          c.code as course_code,
          c.course_type as course_type,
          c.duration_years,
          d.name as department_name,
          d.code as department_code,
          u.id as faculty_id,
          u.name as faculty_name,
          u.email as faculty_email,
          u.phone as faculty_phone,
          u.last_login as faculty_last_login,
          COUNT(students.id) as actual_student_count,
          CASE
            WHEN u.id IS NULL THEN 'unassigned'
            ELSE 'assigned'
          END as assignment_status
        FROM lmsact.sections s
        JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        JOIN lmsact.courses c ON s.course_id = c.id
        JOIN lmsact.departments d ON s.department_id = d.id
        LEFT JOIN lmsact.users u ON s.class_teacher_id = u.id AND u.role = 'staff' AND u.status = 'active'
        LEFT JOIN lmsact.users students ON students.section_id = s.id AND students.role = 'student' AND students.status = 'active'
        WHERE d.id = $1 AND s.status = 'active'
        GROUP BY s.id, s.name, s.max_students, s.current_students, s.status, s.academic_session,
                 ay.year_name, ay.year_number, c.name, c.code, c.course_type, c.duration_years,
                 d.name, d.code, u.id, u.name, u.email, u.phone, u.last_login
        ORDER BY ay.year_number DESC, c.name, s.name
      `;

      const departmentId = user.departmentId || user.department_id;
      console.log('🔍 Querying sections for department:', departmentId);
      
      const result = await pool.query(query, [departmentId]);

      // Calculate summary statistics
      const assignments = result.rows;
      const totalSections = assignments.length;
      const assignedSections = assignments.filter(a => a.assignment_status === 'assigned').length;
      const unassignedSections = totalSections - assignedSections;
      const totalStudents = assignments.reduce((sum, a) => sum + parseInt(a.actual_student_count || 0), 0);

      res.status(200).json({
        success: true,
        message: 'Class in-charge assignments overview retrieved successfully',
        data: {
          assignments: convertKeysToCamelCase(assignments),
          summary: {
            totalSections,
            assignedSections,
            unassignedSections,
            totalStudents,
            assignmentRate: totalSections > 0 ? Math.round((assignedSections / totalSections) * 100) : 0
          }
        }
      });

    } catch (error) {
      console.error('Get assignments overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve assignments overview'
      });
    }
  }

  /**
   * Get staff workload distribution
   */
  async getStaffWorkload(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      console.log('🔍 Staff Workload - User:', JSON.stringify(user, null, 2));

      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can view staff workload'
        });
        return;
      }

      if (!user.departmentId && !user.department_id) {
        console.error('❌ User missing departmentId:', user);
        res.status(400).json({
          success: false,
          message: 'User department information not found. Please contact administrator.'
        });
        return;
      }

      const query = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.created_at,
          u.last_login,
          COUNT(s.id) as current_sections_count,
          SUM(COALESCE((
            SELECT COUNT(*)
            FROM lmsact.users students
            WHERE students.section_id = s.id
              AND students.role = 'student'
              AND students.status = 'active'
          ), 0)) as total_students_managed,
          SUM(COALESCE(s.max_students, 0)) as total_capacity_managed,
          ARRAY_AGG(
            CASE
              WHEN s.id IS NOT NULL
              THEN json_build_object(
                'sectionId', s.id,
                'sectionName', s.name,
                'courseName', c.name,
                'courseCode', c.code,
                'courseType', c.course_type,
                'academicYear', ay.year_name,
                'yearNumber', ay.year_number,
                'studentCount', COALESCE((
                  SELECT COUNT(*)
                  FROM lmsact.users students
                  WHERE students.section_id = s.id
                    AND students.role = 'student'
                    AND students.status = 'active'
                ), 0),
                'maxStudents', s.max_students,
                'academicSession', s.academic_session,
                'sectionStatus', s.status
              )
              ELSE NULL
            END
          ) FILTER (WHERE s.id IS NOT NULL) as assigned_sections
        FROM lmsact.users u
        LEFT JOIN lmsact.sections s ON u.id = s.class_teacher_id AND s.status = 'active'
        LEFT JOIN lmsact.courses c ON s.course_id = c.id
        LEFT JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        WHERE u.department_id = $1
          AND u.role = 'staff'
          AND u.status = 'active'
        GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.last_login
        ORDER BY current_sections_count DESC, u.name
      `;

      const departmentId = user.departmentId || user.department_id;
      console.log('🔍 Querying staff workload for department:', departmentId);
      
      const result = await pool.query(query, [departmentId]);

      res.status(200).json({
        success: true,
        message: 'Staff workload retrieved successfully',
        data: convertKeysToCamelCase(result.rows)
      });

    } catch (error) {
      console.error('Get staff workload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff workload'
      });
    }
  }

  /**
   * Get all sections in a department for class in-charge assignment
   */
  async getSectionsForAssignment(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can manage class in-charge assignments'
        });
        return;
      }

      const query = `
        SELECT
          s.id,
          s.name as section_name,
          s.max_students,
          s.current_students,
          s.status,
          s.academic_session,
          ay.year_name as academic_year,
          ay.year_number,
          c.name as course_name,
          c.code as course_code,
          c.course_type as course_type,
          d.name as department_name,
          d.code as department_code,
          u.id as current_incharge_id,
          u.name as current_incharge_name,
          u.email as current_incharge_email,
          u.phone as current_incharge_phone,
          COUNT(students.id) as actual_student_count,
          CASE
            WHEN u.id IS NULL THEN 'unassigned'
            ELSE 'assigned'
          END as assignment_status
        FROM lmsact.sections s
        JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        JOIN lmsact.courses c ON s.course_id = c.id
        JOIN lmsact.departments d ON s.department_id = d.id
        LEFT JOIN lmsact.users u ON s.class_teacher_id = u.id AND u.role = 'staff'
        LEFT JOIN lmsact.users students ON students.section_id = s.id AND students.role = 'student'
        WHERE d.id = $1 AND s.status = 'active'
        GROUP BY s.id, s.name, s.max_students, s.current_students, s.status, s.academic_session,
                 ay.year_name, ay.year_number, c.name, c.code, c.course_type, d.name, d.code,
                 u.id, u.name, u.email, u.phone
        ORDER BY ay.year_number DESC, c.name, s.name
      `;

      const result = await pool.query(query, [user.departmentId]);

      res.status(200).json({
        success: true,
        message: 'Sections retrieved successfully',
        data: convertKeysToCamelCase(result.rows)
      });

    } catch (error) {
      console.error('Get sections for assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve sections'
      });
    }
  }

  /**
   * Get available faculty for class in-charge assignment
   */
  async getAvailableFaculty(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      console.log('🔍 Available Faculty - User:', JSON.stringify(user, null, 2));

      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can manage class in-charge assignments'
        });
        return;
      }

      if (!user.departmentId && !user.department_id) {
        console.error('❌ User missing departmentId:', user);
        res.status(400).json({
          success: false,
          message: 'User department information not found. Please contact administrator.'
        });
        return;
      }

      const query = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.created_at,
          u.last_login,
          COUNT(s.id) as current_sections_count,
          SUM(COALESCE((
            SELECT COUNT(*)
            FROM lmsact.users students
            WHERE students.section_id = s.id
              AND students.role = 'student'
              AND students.status = 'active'
          ), 0)) as total_students_managed,
          ARRAY_AGG(
            CASE
              WHEN s.id IS NOT NULL
              THEN json_build_object(
                'sectionId', s.id,
                'sectionName', s.name,
                'courseName', c.name,
                'courseCode', c.code,
                'academicYear', ay.year_name,
                'yearNumber', ay.year_number,
                'studentCount', COALESCE((
                  SELECT COUNT(*)
                  FROM lmsact.users students
                  WHERE students.section_id = s.id
                    AND students.role = 'student'
                    AND students.status = 'active'
                ), 0),
                'maxStudents', s.max_students
              )
              ELSE NULL
            END
          ) FILTER (WHERE s.id IS NOT NULL) as current_sections
        FROM lmsact.users u
        LEFT JOIN lmsact.sections s ON u.id = s.class_teacher_id AND s.status = 'active'
        LEFT JOIN lmsact.courses c ON s.course_id = c.id
        LEFT JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        WHERE u.department_id = $1
          AND u.role IN ('staff')
          AND u.status = 'active'
        GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.last_login
        ORDER BY current_sections_count ASC, u.name
      `;

      const departmentId = user.departmentId || user.department_id;
      console.log('🔍 Querying available faculty for department:', departmentId);
      
      const result = await pool.query(query, [departmentId]);

      res.status(200).json({
        success: true,
        message: 'Available faculty retrieved successfully',
        data: convertKeysToCamelCase(result.rows)
      });

    } catch (error) {
      console.error('Get available faculty error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available faculty'
      });
    }
  }

  /**
   * Assign class in-charge to a section
   */
  async assignClassInCharge(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { sectionId, facultyId } = req.body;
      
      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can assign class in-charges'
        });
        return;
      }

      if (!sectionId || !facultyId) {
        res.status(400).json({
          success: false,
          message: 'Section ID and Faculty ID are required'
        });
        return;
      }

      // Verify the section belongs to the HOD's department
      const sectionVerifyQuery = `
        SELECT
          s.id, s.name, s.max_students, s.current_students,
          c.name as course_name, c.code as course_code,
          ay.year_name as academic_year,
          d.id as department_id, d.name as department_name
        FROM lmsact.sections s
        JOIN lmsact.courses c ON s.course_id = c.id
        JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        JOIN lmsact.departments d ON s.department_id = d.id
        WHERE s.id = $1 AND d.id = $2 AND s.status = 'active'
      `;
      
      const sectionResult = await pool.query(sectionVerifyQuery, [sectionId, user.departmentId]);
      
      if (sectionResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Section not found or not in your department'
        });
        return;
      }

      // Verify the faculty belongs to the same department
      const facultyVerifyQuery = `
        SELECT id, name, email FROM lmsact.users 
        WHERE id = $1 AND department_id = $2 AND role = 'staff' AND status = 'active'
      `;
      
      const facultyResult = await pool.query(facultyVerifyQuery, [facultyId, user.departmentId]);
      
      if (facultyResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Faculty not found or not in your department'
        });
        return;
      }

      // Update the section with the new class in-charge
      const updateQuery = `
        UPDATE lmsact.sections
        SET class_teacher_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, name
      `;
      
      const updateResult = await pool.query(updateQuery, [facultyId, sectionId]);
      
      if (updateResult.rows.length === 0) {
        res.status(500).json({
          success: false,
          message: 'Failed to assign class in-charge'
        });
        return;
      }

      // TODO: Add activity logging when activity_logs table is created
      // For now, we'll skip logging to avoid database errors

      res.status(200).json({
        success: true,
        message: `${facultyResult.rows[0].name} has been assigned as class in-charge for ${sectionResult.rows[0].name}`,
        data: {
          section: convertKeysToCamelCase(updateResult.rows[0]),
          faculty: convertKeysToCamelCase(facultyResult.rows[0])
        }
      });

    } catch (error) {
      console.error('Assign class in-charge error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign class in-charge'
      });
    }
  }

  /**
   * Remove class in-charge from a section
   */
  async removeClassInCharge(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { sectionId } = req.params;
      
      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can remove class in-charges'
        });
        return;
      }

      // Verify the section belongs to the HOD's department and get current in-charge info
      const sectionQuery = `
        SELECT
          s.id, s.name, s.class_teacher_id, s.max_students, s.current_students,
          c.name as course_name, c.code as course_code,
          ay.year_name as academic_year,
          d.id as department_id, d.name as department_name,
          u.name as current_incharge_name, u.email as current_incharge_email
        FROM lmsact.sections s
        JOIN lmsact.courses c ON s.course_id = c.id
        JOIN lmsact.academic_years ay ON s.academic_year_id = ay.id
        JOIN lmsact.departments d ON s.department_id = d.id
        LEFT JOIN lmsact.users u ON s.class_teacher_id = u.id
        WHERE s.id = $1 AND d.id = $2 AND s.status = 'active'
      `;
      
      const sectionResult = await pool.query(sectionQuery, [sectionId, user.departmentId]);
      
      if (sectionResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Section not found or not in your department'
        });
        return;
      }

      const section = sectionResult.rows[0];

      if (!section.class_teacher_id) {
        res.status(400).json({
          success: false,
          message: 'No class in-charge is currently assigned to this section'
        });
        return;
      }

      // Remove the class in-charge
      const updateQuery = `
        UPDATE lmsact.sections
        SET class_teacher_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name
      `;
      
      const updateResult = await pool.query(updateQuery, [sectionId]);

      // TODO: Add activity logging when activity_logs table is created
      // For now, we'll skip logging to avoid database errors

      res.status(200).json({
        success: true,
        message: `Class in-charge removed from ${section.name}`,
        data: convertKeysToCamelCase(updateResult.rows[0])
      });

    } catch (error) {
      console.error('Remove class in-charge error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove class in-charge'
      });
    }
  }

  /**
   * Sync section student counts - utility endpoint for fixing data inconsistencies
   */
  async syncSectionStudentCounts(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user || user.role !== 'hod') {
        res.status(403).json({
          success: false,
          message: 'Only HODs can sync section student counts'
        });
        return;
      }

      // Create the sync function if it doesn't exist
      const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION sync_all_section_student_counts()
        RETURNS INTEGER AS $$
        DECLARE
            updated_count INTEGER := 0;
        BEGIN
            UPDATE sections
            SET current_students = (
                SELECT COUNT(*)
                FROM users
                WHERE users.section_id = sections.id
                  AND users.role = 'student'
                  AND users.status = 'active'
            );

            GET DIAGNOSTICS updated_count = ROW_COUNT;

            RETURN updated_count;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await pool.query(createFunctionQuery);

      // Run the sync function
      const syncQuery = 'SELECT sync_all_section_student_counts() as updated_count';
      const result = await pool.query(syncQuery);

      const updatedCount = result.rows[0]?.updated_count || 0;

      res.status(200).json({
        success: true,
        message: `Successfully synced student counts for ${updatedCount} sections`,
        data: {
          updatedSections: updatedCount
        }
      });

    } catch (error) {
      console.error('Sync section student counts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync section student counts'
      });
    }
  }
}

export const classInChargeController = new ClassInChargeController();
