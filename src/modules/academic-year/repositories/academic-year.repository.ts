import { BaseRepository } from '../../../models/base.repository';
import { AcademicYear } from '../../../types';

export class AcademicYearRepository extends BaseRepository<AcademicYear> {
  constructor() {
    super('academic_years');
  }

  /**
   * Find academic year by year name and course
   */
  async findByYearNameAndCourse(yearName: string, courseId: string): Promise<AcademicYear | null> {
    const query = `
      SELECT 
        id,
        course_id,
        year_number,
        year_name,
        is_active,
        created_at,
        updated_at
      FROM academic_years 
      WHERE year_name = $1 AND course_id = $2 AND is_active = true
    `;
    
    const result = await this.query<AcademicYear>(query, [yearName, courseId]);
    return result.rows[0] || null;
  }

  /**
   * Find academic years by course
   */
  async findByCourse(courseId: string): Promise<AcademicYear[]> {
    const query = `
      SELECT 
        id,
        course_id,
        year_number,
        year_name,
        is_active,
        created_at,
        updated_at
      FROM academic_years 
      WHERE course_id = $1 AND is_active = true
      ORDER BY year_number ASC
    `;
    
    const result = await this.query<AcademicYear>(query, [courseId]);
    return result.rows;
  }

  /**
   * Find academic year by ID
   */
  async findById(id: string): Promise<AcademicYear | null> {
    const query = `
      SELECT 
        id,
        course_id,
        year_number,
        year_name,
        is_active,
        created_at,
        updated_at
      FROM academic_years 
      WHERE id = $1
    `;
    
    const result = await this.query<AcademicYear>(query, [id]);
    return result.rows[0] || null;
  }
}

// Create singleton instance
export const academicYearRepository = new AcademicYearRepository();
