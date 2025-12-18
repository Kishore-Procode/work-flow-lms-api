/**
 * Get Subjects for Assignment Use Case
 * 
 * Allows HOD to view all subjects in a semester with their current staff assignments.
 * Shows which subjects are assigned and which need assignment.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { DomainError } from '../../../domain/errors/DomainError';
import {
  GetSubjectsForAssignmentRequest,
  GetSubjectsForAssignmentResponse,
  SubjectForAssignmentDTO
} from '../../dtos/subject-staff-assignment/SubjectStaffAssignmentDTOs';

export class GetSubjectsForAssignmentUseCase {
  constructor(private readonly pool: Pool) {}

  async execute(request: GetSubjectsForAssignmentRequest): Promise<GetSubjectsForAssignmentResponse> {
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

      // Step 2: Get all subjects for this department and semester with assignment status
      const subjectsQuery = `
        SELECT 
          csub.id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits,
          ssa.id as assignment_id,
          ssa.staff_id,
          u.name as staff_name,
          u.email as staff_email,
          ssa.assigned_at,
          CASE WHEN ssa.id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
        FROM lmsact.content_map_sub_details csub
        INNER JOIN lmsact.content_map_sem_details csem 
          ON csub.content_map_sem_details_id = csem.id
        INNER JOIN lmsact.content_map_master cmaster 
          ON csem.content_map_master_id = cmaster.id
        LEFT JOIN lmsact.subject_staff_assignments ssa 
          ON csub.id = ssa.content_map_sub_details_id 
          AND ssa.is_active = TRUE
        LEFT JOIN lmsact.users u 
          ON ssa.staff_id = u.id
        WHERE cmaster.lms_department_id = $1
          AND csem.id = $2
          AND cmaster.status != 'inactive'
        ORDER BY csub.act_subject_code ASC
      `;

      const subjectsResult = await this.pool.query(subjectsQuery, [
        departmentId,
        request.academicYearId  // This is actually the content_map_sem_details_id
      ]);

      console.log('🔍 Subjects Query Params:', { departmentId, semesterNumber: request.semesterNumber, academicYearId: request.academicYearId });
      console.log('🔍 Subjects Query Result Count:', subjectsResult.rows.length);
      console.log('🔍 Subjects Query Result:', JSON.stringify(subjectsResult.rows, null, 2));

      // Step 4: Map to DTOs
      const subjects: SubjectForAssignmentDTO[] = subjectsResult.rows.map(row => ({
        id: row.id,
        subjectCode: row.act_subject_code,
        subjectName: row.act_subject_name,
        credits: row.act_subject_credits,
        assignedStaffId: row.staff_id || null,
        assignedStaffName: row.staff_name || null,
        assignedStaffEmail: row.staff_email || null,
        assignedAt: row.assigned_at || null,
        assignmentId: row.assignment_id || null,
        isAssigned: row.is_assigned
      }));

      const assignedCount = subjects.filter(s => s.isAssigned).length;
      const unassignedCount = subjects.length - assignedCount;

      return {
        departmentId: departmentId,
        departmentName: hod.name, // Using HOD name as fallback since department table is empty
        semesterNumber: request.semesterNumber,
        academicYearId: request.academicYearId,
        subjects,
        totalSubjects: subjects.length,
        assignedCount,
        unassignedCount
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get subjects for assignment: ${error.message}`);
    }
  }
}
