/**
 * Assign Staff to Subject Use Case
 * 
 * Allows HOD to assign a staff member to teach a subject.
 * Ensures only one staff per subject and proper authorization.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { SubjectStaffAssignment } from '../../../domain/entities/SubjectStaffAssignment';
import { ISubjectStaffAssignmentRepository } from '../../../infrastructure/repositories/SubjectStaffAssignmentRepository';
import { DomainError } from '../../../domain/errors/DomainError';
import {
  AssignStaffToSubjectRequest,
  AssignStaffToSubjectResponse
} from '../../dtos/subject-staff-assignment/SubjectStaffAssignmentDTOs';

export class AssignStaffToSubjectUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly assignmentRepository: ISubjectStaffAssignmentRepository
  ) {}

  async execute(request: AssignStaffToSubjectRequest): Promise<AssignStaffToSubjectResponse> {
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

      // Step 2: Verify staff exists and belongs to same department
      const staffQuery = `
        SELECT id, name, email, department_id, role, status
        FROM lmsact.users
        WHERE id = $1 AND role IN ('staff', 'hod')
      `;

      const staffResult = await this.pool.query(staffQuery, [request.staffId]);

      if (staffResult.rows.length === 0) {
        throw new DomainError('Staff not found');
      }

      const staff = staffResult.rows[0];

      if (staff.status !== 'active') {
        throw new DomainError('Staff member is not active');
      }

      if (staff.department_id !== departmentId) {
        throw new DomainError('Staff member does not belong to your department');
      }

      // Step 3: Verify subject exists and belongs to department
      const subjectQuery = `
        SELECT
          csub.id,
          csub.act_subject_code,
          csub.act_subject_name,
          csub.act_subject_credits,
          csub.content_map_sem_details_id,
          csem.id as sem_details_id,
          csem.semester_number,
          cmaster.lms_department_id,
          cmaster.lms_academic_year_id
        FROM lmsact.content_map_sub_details csub
        INNER JOIN lmsact.content_map_sem_details csem
          ON csub.content_map_sem_details_id = csem.id
        INNER JOIN lmsact.content_map_master cmaster
          ON csem.content_map_master_id = cmaster.id
        WHERE csub.id = $1
          AND cmaster.status != 'inactive'
      `;

      const subjectResult = await this.pool.query(subjectQuery, [request.contentMapSubDetailsId]);

      if (subjectResult.rows.length === 0) {
        throw new DomainError('Subject not found or inactive');
      }

      const subject = subjectResult.rows[0];

      if (subject.lms_department_id !== departmentId) {
        throw new DomainError('Subject does not belong to your department');
      }

      if (subject.semester_number !== request.semesterNumber) {
        throw new DomainError('Subject does not belong to specified semester');
      }

      // Validate using content_map_sem_details_id instead of lms_academic_year_id
      // because the frontend passes contentMapSemDetailsId as academicYearId
      if (subject.content_map_sem_details_id !== request.academicYearId) {
        throw new DomainError('Subject does not belong to specified semester details');
      }

      // Step 4: Create assignment entity
      // Use the actual lms_academic_year_id from the subject's content_map_master
      const assignment = SubjectStaffAssignment.create({
        contentMapSubDetailsId: request.contentMapSubDetailsId,
        staffId: request.staffId,
        departmentId: departmentId,
        semesterNumber: request.semesterNumber,
        academicYearId: subject.lms_academic_year_id,
        assignedBy: request.hodId,
        notes: request.notes
      });

      // Step 5: Save assignment (this will automatically deactivate any existing assignment)
      const savedAssignment = await this.assignmentRepository.save(assignment);

      // Step 6: Return success response
      return {
        success: true,
        message: `Successfully assigned ${staff.name} to ${subject.act_subject_name}`,
        assignment: {
          assignmentId: savedAssignment.getId(),
          subjectCode: subject.act_subject_code,
          subjectName: subject.act_subject_name,
          staffName: staff.name,
          staffEmail: staff.email,
          assignedAt: savedAssignment.getAssignedAt()
        }
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to assign staff to subject: ${error.message}`);
    }
  }
}
