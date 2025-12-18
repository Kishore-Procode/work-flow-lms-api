import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { Department } from '../../../types';

export interface CreateDepartmentData {
  name: string;
  code: string;
  collegeId: string;
  hodId?: string;
  totalStudents?: number;
  totalStaff?: number;
  established?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  code?: string;
  hodId?: string;
  totalStudents?: number;
  totalStaff?: number;
  established?: string;
}

export interface DepartmentWithDetails extends Department {
  collegeName?: string;
  hodName?: string;
  hodEmail?: string;
}

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super('departments');
  }

  /**
   * Override base findAll to return properly mapped columns
   */
  async findAll(options: any = {}): Promise<any> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM departments`;
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with proper column mapping
    const dataQuery = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    const dataResult = await this.query<Department>(dataQuery, [limit, offset]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find departments by college
   */
  async findByCollege(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Department>> {
    return this.findWhere('college_id = $1', [collegeId], options);
  }

  /**
   * Find department by code and college
   */
  async findByCodeAndCollege(code: string, collegeId: string): Promise<Department | null> {
    const query = 'SELECT * FROM departments WHERE code = $1 AND college_id = $2';
    const result = await this.query<Department>(query, [code, collegeId]);
    return result.rows[0] || null;
  }

  /**
   * Find department with college and HOD details
   */
  async findByIdWithDetails(id: string): Promise<DepartmentWithDetails | null> {
    console.log('🔍 findByIdWithDetails - Looking up department:', id);

    const query = `
      SELECT
        d.id,
        d.name,
        d.code,
        d.college_id as "collegeId",
        d.hod_id as "hodId",
        d.total_students as "totalStudents",
        d.total_staff as "totalStaff",
        d.established,
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        c.name as college_name,
        u.name as hod_name,
        u.email as hod_email
      FROM departments d
      LEFT JOIN colleges c ON d.college_id = c.id
      LEFT JOIN users u ON d.hod_id = u.id
      WHERE d.id = $1
    `;

    const result = await this.query<DepartmentWithDetails>(query, [id]);

    console.log('🔍 findByIdWithDetails - Query result:', {
      rowCount: result.rowCount,
      found: result.rows.length > 0,
      department: result.rows[0] ? { id: result.rows[0].id, name: result.rows[0].name } : null
    });

    return result.rows[0] || null;
  }

  /**
   * Find all departments with details
   */
  async findAllWithDetails(options: PaginationOptions = {}): Promise<PaginatedResult<DepartmentWithDetails>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = 'SELECT COUNT(*) FROM departments';
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with details
    const dataQuery = `
      SELECT
        d.id,
        d.name,
        d.code,
        d.college_id as "collegeId",
        d.hod_id as "hodId",
        d.total_students as "totalStudents",
        d.total_staff as "totalStaff",
        d.established,
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        c.name as college_name,
        u.name as hod_name,
        u.email as hod_email
      FROM departments d
      LEFT JOIN colleges c ON d.college_id = c.id
      LEFT JOIN users u ON d.hod_id = u.id
      ORDER BY d.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;

    const dataResult = await this.query<DepartmentWithDetails>(dataQuery, [limit, offset]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new department
   */
  async createDepartment(departmentData: CreateDepartmentData): Promise<Department> {
    const query = `
      INSERT INTO departments (
        name, code, college_id, hod_id, total_students, total_staff, established
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        name,
        code,
        college_id as "collegeId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      departmentData.name,
      departmentData.code,
      departmentData.collegeId,
      departmentData.hodId || null,
      departmentData.totalStudents || 0,
      departmentData.totalStaff || 0,
      departmentData.established || null,
    ];

    const result = await this.query<Department>(query, values);
    return result.rows[0];
  }

  /**
   * Update department data
   */
  async updateDepartment(id: string, departmentData: UpdateDepartmentData): Promise<Department | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 because $1 is the ID

    // Build dynamic update query
    Object.entries(departmentData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id); // No updates, return current department
    }

    const query = `
      UPDATE departments
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<Department>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Assign HOD to department
   */
  async assignHOD(departmentId: string, hodId: string): Promise<boolean> {
    const query = `
      UPDATE departments
      SET hod_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [departmentId, hodId]);
    return result.rowCount > 0;
  }

  /**
   * Find department by HOD ID
   */
  async findByHODId(hodId: string): Promise<Department | null> {
    const query = 'SELECT * FROM departments WHERE hod_id = $1';
    const result = await this.query<Department>(query, [hodId]);
    return result.rows[0] || null;
  }

  /**
   * Check if department code exists in college
   */
  async codeExistsInCollege(code: string, collegeId: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM departments WHERE code = $1 AND college_id = $2';
    const params: any[] = [code, collegeId];

    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await this.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Get department statistics
   */
  async getStatistics(): Promise<{
    totalDepartments: number;
    departmentsWithHOD: number;
    departmentsWithoutHOD: number;
    totalStudents: number;
    totalStaff: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM departments',
      'SELECT COUNT(*) as count FROM departments WHERE hod_id IS NOT NULL',
      'SELECT COUNT(*) as count FROM departments WHERE hod_id IS NULL',
      'SELECT SUM(total_students) as total FROM departments',
      'SELECT SUM(total_staff) as total FROM departments',
    ];

    const [totalResult, withHODResult, withoutHODResult, studentsResult, staffResult] = await Promise.all(
      queries.map(query => this.query(query))
    );

    return {
      totalDepartments: parseInt((totalResult.rows[0] as any)?.total || '0', 10),
      departmentsWithHOD: parseInt((withHODResult.rows[0] as any)?.count || '0', 10),
      departmentsWithoutHOD: parseInt((withoutHODResult.rows[0] as any)?.count || '0', 10),
      totalStudents: parseInt((studentsResult.rows[0] as any)?.total || '0', 10),
      totalStaff: parseInt((staffResult.rows[0] as any)?.total || '0', 10),
    };
  }

  /**
   * Get departments by college with student and staff counts
   */
  async findByCollegeWithCounts(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<DepartmentWithDetails>> {
    const {
      page = 1,
      limit = 10000,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = 'SELECT COUNT(*) FROM departments WHERE college_id = $1';
    const countResult = await this.query(countQuery, [collegeId]);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with details
    const dataQuery = `
      SELECT
        d.id,
        d.name,
        d.code,
        d.college_id as "collegeId",
        d.hod_id as "hodId",
        d.total_students as "totalStudents",
        d.total_staff as "totalStaff",
        d.established,
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        c.name as college_name,
        u.name as hod_name,
        u.email as hod_email
      FROM departments d
      LEFT JOIN colleges c ON d.college_id = c.id
      LEFT JOIN users u ON d.hod_id = u.id
      WHERE d.college_id = $3
      ORDER BY d.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    console.log('Data Query:', dataQuery);
    console.log('[limit, offset, collegeId]:', [limit, offset, collegeId]);
    const dataResult = await this.query<DepartmentWithDetails>(dataQuery, [limit, offset, collegeId]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find department by ID with proper column mapping
   */
  async findById(id: string): Promise<Department | null> {
    const query = `
      SELECT
        id,
        name,
        code,
        college_id as "collegeId",
        hod_id as "hodId",
        total_students as "totalStudents",
        total_staff as "totalStaff",
        established,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      WHERE id = $1
    `;
    const result = await this.query<Department>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find department by name and college
   */
  async findByNameAndCollege(name: string, collegeId: string): Promise<Department | null> {
    const query = 'SELECT * FROM departments WHERE name = $1 AND college_id = $2';
    const result = await this.query<Department>(query, [name, collegeId]);
    return result.rows[0] || null;
  }


}

// Create singleton instance
export const departmentRepository = new DepartmentRepository();
