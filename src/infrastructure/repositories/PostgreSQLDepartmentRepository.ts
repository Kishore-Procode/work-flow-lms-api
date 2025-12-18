/**
 * PostgreSQL Department Repository Implementation
 * 
 * Infrastructure layer implementation of IDepartmentRepository.
 * Handles data persistence using PostgreSQL database.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { IDepartmentRepository, DepartmentFilter, PaginatedDepartmentResult, DepartmentStatistics } from '../../domain/repositories/IDepartmentRepository';
import { Department } from '../../domain/entities/Department';
import { DomainError } from '../../domain/errors/DomainError';

export class PostgreSQLDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find department by ID
   */
  public async findById(id: string): Promise<Department | null> {
    const query = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        course_id as "courseId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        is_active as "isActive",
        is_custom as "isCustom",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      return Department.fromPersistence(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find department by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find department by code within a college
   */
  public async findByCode(code: string, collegeId: string): Promise<Department | null> {
    const query = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        course_id as "courseId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        is_active as "isActive",
        is_custom as "isCustom",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      WHERE code = $1 AND college_id = $2
    `;

    try {
      const result = await this.pool.query(query, [code, collegeId]);
      if (result.rows.length === 0) {
        return null;
      }

      return Department.fromPersistence(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find department by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find departments with filters and pagination
   */
  public async findWithFilters(filter: DepartmentFilter): Promise<PaginatedDepartmentResult> {
    const { page = 1, limit = 25 } = filter;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.collegeId) {
      conditions.push(`college_id = $${paramIndex++}`);
      params.push(filter.collegeId);
    }

    if (filter.courseId) {
      conditions.push(`course_id = $${paramIndex++}`);
      params.push(filter.courseId);
    }

    if (filter.hodId) {
      conditions.push(`hod_id = $${paramIndex++}`);
      params.push(filter.hodId);
    }

    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filter.isActive);
    }

    if (filter.isCustom !== undefined) {
      conditions.push(`is_custom = $${paramIndex++}`);
      params.push(filter.isCustom);
    }

    if (filter.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) FROM departments ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        course_id as "courseId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        is_active as "isActive",
        is_custom as "isCustom",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    try {
      const dataResult = await this.pool.query(dataQuery, params);
      const departments = dataResult.rows.map(row => Department.fromPersistence(row));

      return {
        data: departments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to find departments with filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find departments with simple filters (for use cases)
   */
  public async findWithSimpleFilters(
    filter: {
      collegeId?: string;
      courseId?: string;
      hodId?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: {
      page: number;
      limit: number;
      offset: number;
    }
  ): Promise<Department[]> {
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.collegeId) {
      conditions.push(`college_id = $${paramIndex++}`);
      params.push(filter.collegeId);
    }

    // Note: departments table doesn't have course_id column
    // Skipping courseId filter

    if (filter.hodId) {
      conditions.push(`hod_id = $${paramIndex++}`);
      params.push(filter.hodId);
    }

    // Note: departments table doesn't have is_active column
    // Skipping isActive filter

    if (filter.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build query - only select columns that exist in the table
    let query = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        hod_id as "hodId",
        description,
        contact_email as "contactEmail",
        contact_phone as "contactPhone",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lmsact.departments
      ${whereClause}
      ORDER BY created_at DESC
    `;

    // Add pagination if provided
    if (pagination) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, pagination.offset);
    }

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => Department.fromPersistence(row));
    } catch (error) {
      throw new Error(`Failed to find departments with simple filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count departments with filters
   */
  public async countWithFilters(filter: {
    collegeId?: string;
    courseId?: string;
    hodId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<number> {
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.collegeId) {
      conditions.push(`college_id = $${paramIndex++}`);
      params.push(filter.collegeId);
    }

    if (filter.courseId) {
      conditions.push(`course_id = $${paramIndex++}`);
      params.push(filter.courseId);
    }

    if (filter.hodId) {
      conditions.push(`hod_id = $${paramIndex++}`);
      params.push(filter.hodId);
    }

    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filter.isActive);
    }

    if (filter.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) FROM departments ${whereClause}`;

    try {
      const result = await this.pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new Error(`Failed to count departments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save new department
   */
  public async save(department: Department): Promise<Department> {
    const data = department.toPersistence();
    
    const query = `
      INSERT INTO departments (
        id, name, code, college_id, course_id, hod_id,
        total_students, total_staff, established, is_active, is_custom,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        name,
        code,
        college_id as "collegeId",
        course_id as "courseId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        is_active as "isActive",
        is_custom as "isCustom",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.id,
      data.name,
      data.code,
      data.collegeId,
      data.courseId,
      data.hodId,
      data.totalStudents,
      data.totalStaff,
      data.established,
      data.isActive,
      data.isCustom,
      data.createdAt,
      data.updatedAt,
    ];

    try {
      const result = await this.pool.query(query, values);
      return Department.fromPersistence(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw DomainError.conflict('Department with this code already exists in the college');
      }
      throw new Error(`Failed to save department: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Placeholder implementations for other required methods
  public async findByCollege(collegeId: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult> {
    return this.findWithFilters({ collegeId, page, limit });
  }

  public async findByCourse(courseId: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult> {
    return this.findWithFilters({ courseId, page, limit });
  }

  public async findByHod(hodId: string): Promise<Department[]> {
    return this.findWithSimpleFilters({ hodId });
  }

  public async findActive(page?: number, limit?: number): Promise<PaginatedDepartmentResult> {
    return this.findWithFilters({ isActive: true, page, limit });
  }

  public async findWithoutHod(collegeId?: string): Promise<Department[]> {
    const filter: any = { hodId: null };
    if (collegeId) filter.collegeId = collegeId;
    
    // This needs special handling for NULL values
    const query = `
      SELECT
        id, name, code, college_id as "collegeId", course_id as "courseId",
        hod_id as "hodId", total_students as "totalStudents", total_staff as "totalStaff",
        established, is_active as "isActive", is_custom as "isCustom",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM departments
      WHERE hod_id IS NULL ${collegeId ? 'AND college_id = $1' : ''}
      ORDER BY created_at DESC
    `;

    const params = collegeId ? [collegeId] : [];
    const result = await this.pool.query(query, params);
    return result.rows.map(row => Department.fromPersistence(row));
  }

  public async existsByCode(code: string, collegeId: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM departments WHERE code = $1 AND college_id = $2';
    const params: any[] = [code, collegeId];

    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount > 0;
  }

  public async existsByName(name: string, collegeId: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM departments WHERE name = $1 AND college_id = $2';
    const params: any[] = [name, collegeId];

    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rowCount > 0;
  }

  // Additional required methods (simplified implementations)
  public async update(department: Department): Promise<Department> {
    throw new Error('Update method not yet implemented');
  }

  public async delete(id: string): Promise<boolean> {
    throw new Error('Delete method not yet implemented');
  }

  public async count(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM departments');
    return parseInt(result.rows[0].count, 10);
  }

  public async countByCollege(collegeId: string): Promise<number> {
    return this.countWithFilters({ collegeId });
  }

  public async countByCourse(courseId: string): Promise<number> {
    return this.countWithFilters({ courseId });
  }

  public async countActive(): Promise<number> {
    return this.countWithFilters({ isActive: true });
  }

  public async countWithHod(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM departments WHERE hod_id IS NOT NULL');
    return parseInt(result.rows[0].count, 10);
  }

  public async search(query: string, collegeId?: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult> {
    return this.findWithFilters({ search: query, collegeId, page, limit });
  }

  public async getStatistics(collegeId?: string): Promise<DepartmentStatistics> {
    // Simplified implementation
    const filter = collegeId ? { collegeId } : {};
    const total = await this.countWithFilters(filter);
    const active = await this.countWithFilters({ ...filter, isActive: true });
    const withHod = await this.countWithFilters({ ...filter, hodId: 'NOT_NULL' }); // Special handling needed

    return {
      total,
      active,
      inactive: total - active,
      withHod: 0, // Placeholder
      withoutHod: 0, // Placeholder
      totalStudents: 0, // Placeholder
      totalStaff: 0, // Placeholder
      byCollege: {},
      byCourse: {},
    };
  }

  public async findByDateRange(startDate: Date, endDate: Date): Promise<Department[]> {
    throw new Error('findByDateRange method not yet implemented');
  }

  public async saveMany(departments: Department[]): Promise<Department[]> {
    throw new Error('saveMany method not yet implemented');
  }

  public async updateMany(departments: Department[]): Promise<Department[]> {
    throw new Error('updateMany method not yet implemented');
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    throw new Error('deleteMany method not yet implemented');
  }

  public async withTransaction<T>(operation: (repository: IDepartmentRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionRepo = new PostgreSQLDepartmentRepository(client as any);
      const result = await operation(transactionRepo);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
