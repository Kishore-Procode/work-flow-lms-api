import { pool } from '../../../config/database';
import { PaginationOptions, PaginatedResult } from '../../../types';

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  college_id: string;
  college_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Section {
  id: string;
  name: string;
  course_id: string;
  department_id: string;
  academic_year_id: string;
  academic_session?: string;
  max_students?: number;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}


export class CourseRepository {
  /**
   * Find all courses with pagination
   */
  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<Course>> {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        col.name as college_name
      FROM courses c
      LEFT JOIN colleges col ON c.college_id = col.id
    `;

    const queryParams: any[] = [];

    if (search) {
      query += ` WHERE (c.name ILIKE $1 OR c.code ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY c.name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM courses c`;
    const countParams: any[] = [];

    if (search) {
      countQuery += ` WHERE (c.name ILIKE $1 OR c.code ILIKE $1)`;
      countParams.push(`%${search}%`);
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        // hasNext: page < totalPages, // Removed as it's not part of the expected type
        // hasPrev: page > 1 // Removed as it's not part of the expected type
      }
    };
  }

  /**
   * Find course by ID
   */
  async findById(id: string): Promise<Course | null> {
    const query = `
      SELECT 
        c.*,
        col.name as college_name
      FROM courses c
      LEFT JOIN colleges col ON c.college_id = col.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find courses by college ID
   */
  async findByCollege(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Course>> {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        col.name as college_name
      FROM courses c
      LEFT JOIN colleges col ON c.college_id = col.id
      WHERE c.college_id = $1
    `;

    const queryParams: any[] = [collegeId];

    if (search) {
      query += ` AND (c.name ILIKE $2 OR c.code ILIKE $2)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY c.name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM courses c WHERE c.college_id = $1`;
    const countParams: any[] = [collegeId];

    if (search) {
      countQuery += ` AND (c.name ILIKE $2 OR c.code ILIKE $2)`;
      countParams.push(`%${search}%`);
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        // hasNext: page < totalPages, // Removed as it's not part of the expected type
        // hasPrev: page > 1 // Removed as it's not part of the expected type
      }
    };
  }

  /**
   * Create a new course
   */
  async create(courseData: {
    name: string;
    code: string;
    type: string;
    college_id: string;
    department_id?: string;
    description?: string;
    duration_years?: number;
    is_active?: boolean;
  }): Promise<Course> {
    const query = `
      INSERT INTO courses (name, code, description, college_id, department_id, course_type, duration_years, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      courseData.name,
      courseData.code,
      courseData.description,
      courseData.college_id,
      courseData.department_id,
      courseData.type,
      courseData.duration_years || 4,
      courseData.is_active !== undefined ? courseData.is_active : true
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a course
   */
  async update(id: string, courseData: Partial<Omit<Course, 'id' | 'created_at' | 'updated_at'>>): Promise<Course | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (courseData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(courseData.name);
    }
    if (courseData.code !== undefined) {
      fields.push(`code = $${paramCount++}`);
      values.push(courseData.code);
    }
    if (courseData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(courseData.description);
    }
    if (courseData.duration_years !== undefined) {
      fields.push(`duration_years = $${paramCount++}`);
      values.push(courseData.duration_years);
    }
    if (courseData.college_id !== undefined) {
      fields.push(`college_id = $${paramCount++}`);
      values.push(courseData.college_id);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE courses 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a course
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM courses WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if course code exists in college
   */
  async existsByCodeInCollege(code: string, collegeId: string, excludeId?: string): Promise<boolean> {
    let query = `SELECT id FROM courses WHERE code = $1 AND college_id = $2`;
    const params = [code, collegeId];

    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Find course by name and department
   */
  async findByNameAndDepartment(name: string, departmentId: string): Promise<Course | null> {
    const query = `
      SELECT
        c.*,
        col.name as college_name
      FROM courses c
      LEFT JOIN colleges col ON c.college_id = col.id
      WHERE c.name = $1 AND c.department_id = $2
    `;

    const result = await pool.query(query, [name, departmentId]);
    return result.rows[0] || null;
  }

  /**
   * Get course statistics
   */
  async getStatistics(courseId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT d.id) as total_departments,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') as total_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'staff') as total_staff
      FROM courses c
      LEFT JOIN departments d ON c.id = d.course_id
      LEFT JOIN users u ON d.id = u.department_id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [courseId]);
    return result.rows[0];
  }

  async updateSection(id: string, data: Partial<Omit<Section, 'id' | 'created_at' | 'updated_at'>>): Promise<Section | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.course_id !== undefined) {
      fields.push(`course_id = $${paramCount++}`);
      values.push(data.course_id);
    }
    if (data.department_id !== undefined) {
      fields.push(`department_id = $${paramCount++}`);
      values.push(data.department_id);
    }
    if (data.academic_year_id !== undefined) {
      fields.push(`academic_year_id = $${paramCount++}`);
      values.push(data.academic_year_id);
    }
    if (data.academic_session !== undefined) {
      fields.push(`academic_session = $${paramCount++}`);
      values.push(data.academic_session);
    }
    if (data.max_students !== undefined) {
      fields.push(`max_students = $${paramCount++}`);
      values.push(data.max_students);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      // No fields to update
      const result = await pool.query('SELECT * FROM sections WHERE id = $1', [id]);
      return result.rows[0] || null;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id); // For WHERE clause

    const query = `
    UPDATE sections
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
    console.log('query', query)
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
}

// Export singleton instance
export const courseRepository = new CourseRepository();
