/**
 * Get Available Staff Use Case
 * 
 * Allows HOD to view all available staff in their department
 * along with their current subject assignments and workload.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import {
  GetAvailableStaffRequest,
  GetAvailableStaffResponse,
  StaffForAssignmentDTO
} from '../../dtos/subject-staff-assignment/SubjectStaffAssignmentDTOs';

export class GetAvailableStaffUseCase {
  constructor(private readonly pool: Pool) {}

  async execute(request: GetAvailableStaffRequest): Promise<GetAvailableStaffResponse> {
    try {
      // Step 1: Verify HOD exists and get department
      const hodQuery = `
        SELECT id, name, department_id, role
        FROM lmsact.users
        WHERE id = $1 AND role = 'hod' AND status = 'active'
      `;

      const hodResult = await this.pool.query(hodQuery, [request.hodId]);

      if (hodResult.rows.length === 0) {
        throw new DomainError('HOD not found or inactive');
      }

      const hod = hodResult.rows[0];
      const departmentId = hod.department_id;

      if (!departmentId) {
        throw new DomainError('HOD does not have a department assigned');
      }

      // Step 2: Get all staff in the department
      const staffQuery = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.qualification,
          u.experience
        FROM lmsact.users u
        WHERE u.department_id = $1
          AND u.role IN ('staff', 'hod')
          AND u.status = 'active'
        ORDER BY u.name ASC
      `;

      const staffResult = await this.pool.query(staffQuery, [departmentId]);

      // Step 4: For each staff, get their current assignments
      const staffList: StaffForAssignmentDTO[] = [];

      for (const staffRow of staffResult.rows) {
        let assignmentsQuery = `
          SELECT 
            ssa.id,
            ssa.semester_number,
            csub.act_subject_code,
            csub.act_subject_name
          FROM lmsact.subject_staff_assignments ssa
          INNER JOIN lmsact.content_map_sub_details csub 
            ON ssa.content_map_sub_details_id = csub.id
          WHERE ssa.staff_id = $1 AND ssa.is_active = TRUE
        `;

        const queryParams: any[] = [staffRow.id];

        // Optionally filter by semester
        if (request.semesterNumber) {
          assignmentsQuery += ` AND ssa.semester_number = $2`;
          queryParams.push(request.semesterNumber);
        }

        assignmentsQuery += ` ORDER BY ssa.semester_number ASC, csub.act_subject_code ASC`;

        const assignmentsResult = await this.pool.query(assignmentsQuery, queryParams);

        const assignedSubjects = assignmentsResult.rows.map(row => ({
          subjectCode: row.act_subject_code,
          subjectName: row.act_subject_name,
          semesterNumber: row.semester_number
        }));

        staffList.push({
          id: staffRow.id,
          name: staffRow.name,
          email: staffRow.email,
          phone: staffRow.phone || null,
          designation: null, // Column doesn't exist in users table
          qualification: staffRow.qualification || null,
          experience: staffRow.experience || null,
          assignedSubjectsCount: assignedSubjects.length,
          assignedSubjects
        });
      }

      return {
        departmentId: departmentId,
        departmentName: hod.name, // Using HOD name as fallback since department table is empty
        staff: staffList,
        totalStaff: staffList.length
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get available staff: ${error.message}`);
    }
  }
}
