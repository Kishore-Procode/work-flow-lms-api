import { BaseRepository } from '../../../models/base.repository';
import { Section } from '../../../types';

export class SectionRepository extends BaseRepository<Section> {
  constructor() {
    super('sections');
  }

  /**
   * Find section by name, course, department, and academic year
   */
  async findByNameCourseDepYear(
    name: string, 
    courseId: string, 
    departmentId: string, 
    academicYearId: string
  ): Promise<Section | null> {
    const query = `
      SELECT 
        id,
        name,
        course_id,
        department_id,
        academic_year_id,
        class_in_charge_id,
        max_students,
        current_students,
        status,
        academic_session,
        created_at,
        updated_at
      FROM sections 
      WHERE name = $1 AND course_id = $2 AND department_id = $3 AND academic_year_id = $4 AND status = 'active'
    `;
    
    const result = await this.query<Section>(query, [name, courseId, departmentId, academicYearId]);
    return result.rows[0] || null;
  }

  /**
   * Find sections by course, department, and academic year
   */
  async findByCourseDepYear(
    courseId: string, 
    departmentId: string, 
    academicYearId: string
  ): Promise<Section[]> {
    const query = `
      SELECT 
        id,
        name,
        course_id,
        department_id,
        academic_year_id,
        class_in_charge_id,
        max_students,
        current_students,
        status,
        academic_session,
        created_at,
        updated_at
      FROM sections 
      WHERE course_id = $1 AND department_id = $2 AND academic_year_id = $3 AND status = 'active'
      ORDER BY name ASC
    `;
    
    const result = await this.query<Section>(query, [courseId, departmentId, academicYearId]);
    return result.rows;
  }

  /**
   * Find section by ID
   */
  async findById(id: string): Promise<Section | null> {
    const query = `
      SELECT 
        id,
        name,
        course_id,
        department_id,
        academic_year_id,
        class_in_charge_id,
        max_students,
        current_students,
        status,
        academic_session,
        created_at,
        updated_at
      FROM sections 
      WHERE id = $1
    `;
    
    const result = await this.query<Section>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find sections by course
   */
  async findByCourse(courseId: string): Promise<Section[]> {
    const query = `
      SELECT 
        id,
        name,
        course_id,
        department_id,
        academic_year_id,
        class_in_charge_id,
        max_students,
        current_students,
        status,
        academic_session,
        created_at,
        updated_at
      FROM sections 
      WHERE course_id = $1 AND status = 'active'
      ORDER BY name ASC
    `;
    
    const result = await this.query<Section>(query, [courseId]);
    return result.rows;
  }
}

// Create singleton instance
export const sectionRepository = new SectionRepository();
