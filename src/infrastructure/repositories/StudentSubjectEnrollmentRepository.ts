import { Pool } from 'pg';
import { IStudentSubjectEnrollmentRepository } from '../../domain/repositories/IStudentSubjectEnrollmentRepository';
import { StudentSubjectEnrollment, StudentSubjectEnrollmentPersistence } from '../../domain/entities/StudentSubjectEnrollment';
import { DomainError } from '../../domain/errors/DomainError';

export class StudentSubjectEnrollmentRepository implements IStudentSubjectEnrollmentRepository {
  constructor(private readonly pool: Pool) {}

  public async save(enrollment: StudentSubjectEnrollment): Promise<StudentSubjectEnrollment> {
    const data = enrollment.toPersistence();

    const query = `
      INSERT INTO lmsact.student_subject_enrollments (
        id, student_id, content_map_sub_details_id, semester_number, academic_year_id,
        enrollment_date, status, progress_percentage, completed_at, grade,
        marks_obtained, total_marks, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::lmsact.enrollment_status, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [
        data.id,
        data.student_id,
        data.content_map_sub_details_id,
        data.semester_number,
        data.academic_year_id,
        data.enrollment_date,
        data.status,
        data.progress_percentage,
        data.completed_at,
        data.grade,
        data.marks_obtained,
        data.total_marks,
        data.created_at,
        data.updated_at,
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Failed to save enrollment');
      }

      return StudentSubjectEnrollment.fromPersistence(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('Student is already enrolled in this subject for this academic year');
      }
      throw new DomainError(`Failed to save enrollment: ${error.message}`);
    }
  }

  public async update(enrollment: StudentSubjectEnrollment): Promise<StudentSubjectEnrollment> {
    const data = enrollment.toPersistence();

    const query = `
      UPDATE lmsact.student_subject_enrollments
      SET
        status = $2::lmsact.enrollment_status,
        progress_percentage = $3,
        completed_at = $4,
        grade = $5,
        marks_obtained = $6,
        total_marks = $7,
        updated_at = $8
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [
        data.id,
        data.status,
        data.progress_percentage,
        data.completed_at,
        data.grade,
        data.marks_obtained,
        data.total_marks,
        data.updated_at,
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Enrollment not found');
      }

      return StudentSubjectEnrollment.fromPersistence(result.rows[0]);
    } catch (error: any) {
      throw new DomainError(`Failed to update enrollment: ${error.message}`);
    }
  }

  public async findById(id: string): Promise<StudentSubjectEnrollment | null> {
    const query = `
      SELECT * FROM lmsact.student_subject_enrollments
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return StudentSubjectEnrollment.fromPersistence(result.rows[0]);
    } catch (error: any) {
      throw new DomainError(`Failed to find enrollment: ${error.message}`);
    }
  }

  public async findByStudentId(studentId: string): Promise<StudentSubjectEnrollment[]> {
    const query = `
      SELECT * FROM lmsact.student_subject_enrollments
      WHERE student_id = $1
      ORDER BY semester_number ASC, enrollment_date DESC
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [studentId]);
      return result.rows.map(row => StudentSubjectEnrollment.fromPersistence(row));
    } catch (error: any) {
      throw new DomainError(`Failed to find enrollments: ${error.message}`);
    }
  }

  public async findByStudentIdAndSemester(studentId: string, semesterNumber: number): Promise<StudentSubjectEnrollment[]> {
    const query = `
      SELECT * FROM lmsact.student_subject_enrollments
      WHERE student_id = $1 AND semester_number = $2
      ORDER BY enrollment_date DESC
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [studentId, semesterNumber]);
      return result.rows.map(row => StudentSubjectEnrollment.fromPersistence(row));
    } catch (error: any) {
      throw new DomainError(`Failed to find enrollments: ${error.message}`);
    }
  }

  public async findByStudentIdAndAcademicYear(studentId: string, academicYearId: string): Promise<StudentSubjectEnrollment[]> {
    const query = `
      SELECT * FROM lmsact.student_subject_enrollments
      WHERE student_id = $1 AND academic_year_id = $2
      ORDER BY semester_number ASC, enrollment_date DESC
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, [studentId, academicYearId]);
      return result.rows.map(row => StudentSubjectEnrollment.fromPersistence(row));
    } catch (error: any) {
      throw new DomainError(`Failed to find enrollments: ${error.message}`);
    }
  }

  public async isStudentEnrolled(studentId: string, contentMapSubDetailsId: string, academicYearId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM lmsact.student_subject_enrollments
        WHERE student_id = $1 
        AND content_map_sub_details_id = $2 
        AND academic_year_id = $3
      ) as exists
    `;

    try {
      const result = await this.pool.query<{ exists: boolean }>(query, [studentId, contentMapSubDetailsId, academicYearId]);
      return result.rows[0].exists;
    } catch (error: any) {
      throw new DomainError(`Failed to check enrollment: ${error.message}`);
    }
  }

  public async getEnrollmentCount(contentMapSubDetailsId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM lmsact.student_subject_enrollments
      WHERE content_map_sub_details_id = $1
    `;

    try {
      const result = await this.pool.query<{ count: string }>(query, [contentMapSubDetailsId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new DomainError(`Failed to get enrollment count: ${error.message}`);
    }
  }

  public async bulkSave(enrollments: StudentSubjectEnrollment[]): Promise<StudentSubjectEnrollment[]> {
    if (enrollments.length === 0) {
      return [];
    }

    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const enrollment of enrollments) {
      const data = enrollment.toPersistence();
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::lmsact.enrollment_status, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(
        data.id,
        data.student_id,
        data.content_map_sub_details_id,
        data.semester_number,
        data.academic_year_id,
        data.enrollment_date,
        data.status,
        data.progress_percentage,
        data.completed_at,
        data.grade,
        data.marks_obtained,
        data.total_marks,
        data.created_at,
        data.updated_at
      );
    }

    const query = `
      INSERT INTO lmsact.student_subject_enrollments (
        id, student_id, content_map_sub_details_id, semester_number, academic_year_id,
        enrollment_date, status, progress_percentage, completed_at, grade,
        marks_obtained, total_marks, created_at, updated_at
      ) VALUES ${values.join(', ')}
      RETURNING *
    `;

    try {
      const result = await this.pool.query<StudentSubjectEnrollmentPersistence>(query, params);
      return result.rows.map(row => StudentSubjectEnrollment.fromPersistence(row));
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('One or more students are already enrolled in these subjects');
      }
      throw new DomainError(`Failed to bulk save enrollments: ${error.message}`);
    }
  }

  public async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM lmsact.student_subject_enrollments
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [id]);
    } catch (error: any) {
      throw new DomainError(`Failed to delete enrollment: ${error.message}`);
    }
  }
}

