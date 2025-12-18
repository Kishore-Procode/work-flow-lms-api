/**
 * Subject Staff Assignment Repository
 * 
 * Infrastructure layer repository for managing subject-staff assignments.
 * Handles database operations for staff assignments to subjects.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { SubjectStaffAssignment, SubjectStaffAssignmentProps } from '../../domain/entities/SubjectStaffAssignment';
import { DomainError } from '../../domain/errors/DomainError';

export interface ISubjectStaffAssignmentRepository {
  save(assignment: SubjectStaffAssignment): Promise<SubjectStaffAssignment>;
  bulkSave(assignments: SubjectStaffAssignment[]): Promise<SubjectStaffAssignment[]>;
  findById(id: string): Promise<SubjectStaffAssignment | null>;
  findBySubjectId(contentMapSubDetailsId: string): Promise<SubjectStaffAssignment | null>;
  findByStaffId(staffId: string, isActive?: boolean): Promise<SubjectStaffAssignment[]>;
  findByDepartmentAndSemester(departmentId: string, semesterNumber: number, academicYearId: string): Promise<SubjectStaffAssignment[]>;
  deactivate(id: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  withTransaction<T>(callback: (repo: ISubjectStaffAssignmentRepository) => Promise<T>): Promise<T>;
}

export class SubjectStaffAssignmentRepository implements ISubjectStaffAssignmentRepository {
  constructor(private readonly pool: Pool, private readonly client?: PoolClient) {}

  /**
   * Save a new subject staff assignment or update existing one
   */
  public async save(assignment: SubjectStaffAssignment): Promise<SubjectStaffAssignment> {
    const executor = this.client || this.pool;
    
    // First, deactivate any existing active assignment for this subject
    const deactivateQuery = `
      UPDATE lmsact.subject_staff_assignments
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE content_map_sub_details_id = $1 AND is_active = TRUE AND id != $2
    `;
    
    await executor.query(deactivateQuery, [
      assignment.getContentMapSubDetailsId(),
      assignment.getId()
    ]);

    // Insert or update the assignment
    const query = `
      INSERT INTO lmsact.subject_staff_assignments (
        id,
        content_map_sub_details_id,
        staff_id,
        department_id,
        semester_number,
        academic_year_id,
        assigned_by,
        assigned_at,
        is_active,
        notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        staff_id = EXCLUDED.staff_id,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at,
        is_active = EXCLUDED.is_active,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    try {
      const result = await executor.query(query, [
        assignment.getId(),
        assignment.getContentMapSubDetailsId(),
        assignment.getStaffId(),
        assignment.getDepartmentId(),
        assignment.getSemesterNumber(),
        assignment.getAcademicYearId(),
        assignment.getAssignedBy(),
        assignment.getAssignedAt(),
        assignment.getIsActive(),
        assignment.getNotes() || null,
        assignment.getCreatedAt(),
        assignment.getUpdatedAt()
      ]);

      return this.mapToEntity(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new DomainError('This subject already has an active staff assignment');
      }
      throw new DomainError(`Failed to save subject staff assignment: ${error.message}`);
    }
  }

  /**
   * Bulk save multiple assignments (typically for semester-wise assignment)
   */
  public async bulkSave(assignments: SubjectStaffAssignment[]): Promise<SubjectStaffAssignment[]> {
    const executor = this.client || this.pool;
    const savedAssignments: SubjectStaffAssignment[] = [];

    try {
      for (const assignment of assignments) {
        const saved = await this.save(assignment);
        savedAssignments.push(saved);
      }

      return savedAssignments;
    } catch (error: any) {
      throw new DomainError(`Failed to bulk save assignments: ${error.message}`);
    }
  }

  /**
   * Find assignment by ID
   */
  public async findById(id: string): Promise<SubjectStaffAssignment | null> {
    const executor = this.client || this.pool;
    
    const query = `
      SELECT * FROM lmsact.subject_staff_assignments
      WHERE id = $1
    `;

    try {
      const result = await executor.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error: any) {
      throw new DomainError(`Failed to find assignment by ID: ${error.message}`);
    }
  }

  /**
   * Find active assignment for a subject
   */
  public async findBySubjectId(contentMapSubDetailsId: string): Promise<SubjectStaffAssignment | null> {
    const executor = this.client || this.pool;
    
    const query = `
      SELECT * FROM lmsact.subject_staff_assignments
      WHERE content_map_sub_details_id = $1 AND is_active = TRUE
      ORDER BY assigned_at DESC
      LIMIT 1
    `;

    try {
      const result = await executor.query(query, [contentMapSubDetailsId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error: any) {
      throw new DomainError(`Failed to find assignment by subject ID: ${error.message}`);
    }
  }

  /**
   * Find all assignments for a staff member
   */
  public async findByStaffId(staffId: string, isActive: boolean = true): Promise<SubjectStaffAssignment[]> {
    const executor = this.client || this.pool;
    
    const query = `
      SELECT * FROM lmsact.subject_staff_assignments
      WHERE staff_id = $1 AND is_active = $2
      ORDER BY semester_number ASC, assigned_at DESC
    `;

    try {
      const result = await executor.query(query, [staffId, isActive]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error: any) {
      throw new DomainError(`Failed to find assignments by staff ID: ${error.message}`);
    }
  }

  /**
   * Find all assignments for a department and semester
   */
  public async findByDepartmentAndSemester(
    departmentId: string,
    semesterNumber: number,
    academicYearId: string
  ): Promise<SubjectStaffAssignment[]> {
    const executor = this.client || this.pool;
    
    const query = `
      SELECT * FROM lmsact.subject_staff_assignments
      WHERE department_id = $1 
        AND semester_number = $2 
        AND academic_year_id = $3
        AND is_active = TRUE
      ORDER BY assigned_at DESC
    `;

    try {
      const result = await executor.query(query, [departmentId, semesterNumber, academicYearId]);
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error: any) {
      throw new DomainError(`Failed to find assignments by department and semester: ${error.message}`);
    }
  }

  /**
   * Deactivate an assignment (soft delete)
   */
  public async deactivate(id: string): Promise<void> {
    const executor = this.client || this.pool;
    
    const query = `
      UPDATE lmsact.subject_staff_assignments
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      const result = await executor.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new DomainError('Assignment not found');
      }
    } catch (error: any) {
      throw new DomainError(`Failed to deactivate assignment: ${error.message}`);
    }
  }

  /**
   * Permanently delete an assignment
   */
  public async deleteById(id: string): Promise<void> {
    const executor = this.client || this.pool;
    
    const query = `
      DELETE FROM lmsact.subject_staff_assignments
      WHERE id = $1
    `;

    try {
      const result = await executor.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new DomainError('Assignment not found');
      }
    } catch (error: any) {
      throw new DomainError(`Failed to delete assignment: ${error.message}`);
    }
  }

  /**
   * Execute operations within a transaction
   */
  public async withTransaction<T>(
    callback: (repo: ISubjectStaffAssignmentRepository) => Promise<T>
  ): Promise<T> {
    if (this.client) {
      // Already in a transaction
      return callback(this);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const transactionalRepo = new SubjectStaffAssignmentRepository(this.pool, client);
      const result = await callback(transactionalRepo);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to domain entity
   */
  private mapToEntity(row: any): SubjectStaffAssignment {
    return SubjectStaffAssignment.create({
      id: row.id,
      contentMapSubDetailsId: row.content_map_sub_details_id,
      staffId: row.staff_id,
      departmentId: row.department_id,
      semesterNumber: row.semester_number,
      academicYearId: row.academic_year_id,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}
