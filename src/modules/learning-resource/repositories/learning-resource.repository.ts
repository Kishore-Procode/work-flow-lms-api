import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { resource, resourcestatus, resourceFilter } from '../../../types';

export interface CreateresourceData {
  resourceCode: string;
  category: string;
  startedDate: Date;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignedDate?: Date;
  status?: resourcestatus;
  collegeId: string;
  departmentId?: string;
  notes?: string;
}

export interface UpdateresourceData {
  category?: string;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignedDate?: Date;
  status?: resourcestatus;
  departmentId?: string;
  notes?: string;
}

export interface resourceWithDetails extends resource {
  collegeName?: string;
  departmentName?: string;
  studentName?: string;
  studentEmail?: string;
  studentRollNumber?: string;
  daysSincestarted?: number;
  healthScore?: number;
  lastUpdated?: string;
  last_photo_upload?: Date;
  batch_year?: string;
}

export class LearningResourceRepository extends BaseRepository<resource> {
  constructor() {
    super('learning_resources');
  }

  /**
   * Find resource by resource code
   */
  async findByresourceCode(resourceCode: string): Promise<resource | null> {
    const query = 'SELECT * FROM learning_resources WHERE resource_code = $1';
    const result = await this.query<resource>(query, [resourceCode]);
    return result.rows[0] || null;
  }

  /**
   * Find resource by assigned student ID
   */
  async findByAssignedStudent(studentId: string): Promise<resource | null> {
    const query = 'SELECT *,id as "resourceId" FROM learning_resources WHERE assigned_student_id = $1';
    const result = await this.query<resource>(query, [studentId]);
    return result.rows[0] || null;
  }

  /**
   * Get resource by student ID (alias for findByAssignedStudent)
   */
  async getresourceByStudentId(studentId: string): Promise<resource | null> {
    return this.findByAssignedStudent(studentId);
  }

  /**
   * Find resources by college
   */
  async findByCollege(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<resource>> {
    return this.findWhere('college_id = $1', [collegeId], options);
  }

  /**
   * Find resources by department (excluding null/invalid departments)
   */
  async findByDepartment(departmentId: string, options: PaginationOptions = {}): Promise<PaginatedResult<resource>> {
    // Ensure we only get resources with valid department assignments
    const whereClause = 'department_id = $1 AND department_id IS NOT NULL';
    return this.findWhere(whereClause, [departmentId], options);
  }

  /**
   * Find resources by assigned student
   */
  async findByStudent(studentId: string, options: PaginationOptions = {}): Promise<PaginatedResult<resource>> {
    return this.findWhere('assigned_student_id = $1', [studentId], options);
  }

  /**
   * Find resources by status
   */
  async findByStatus(status: resourcestatus, options: PaginationOptions = {}): Promise<PaginatedResult<resource>> {
    return this.findWhere('status = $1', [status], options);
  }

  /**
   * Find resource with details
   */
  async findByIdWithDetails(id: string): Promise<resourceWithDetails | null> {
    const query = `
      SELECT
        t.*,
        c.name as "collegeName",
        d.name as "departmentName",
        u.name as "studentName",
        u.email as "studentEmail",
        u.roll_number as "studentRollNumber",
        u.year_of_study as batch_year,
        MAX(ti.created_at) as last_photo_upload
      FROM learning_resources t
      LEFT JOIN colleges c ON t.college_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.assigned_student_id = u.id
      LEFT JOIN resource_media ti ON t.id = ti.resource_id
      WHERE t.id = $1
      GROUP BY t.id, c.name, d.name, u.name, u.email, u.roll_number, u.year_of_study
    `;

    const result = await this.query<resourceWithDetails>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find resources with filters
   */
  async findWithFilters(filters: resourceFilter): Promise<PaginatedResult<resourceWithDetails>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (filters.status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    // College filter
    if (filters.collegeId) {
      conditions.push(`t.college_id = $${paramIndex}`);
      params.push(filters.collegeId);
      paramIndex++;
    }

    // Department filter
    if (filters.departmentId) {
      if (filters.filterByStudentDepartment) {
        // Filter by student's department (for HOD/Staff to see resources assigned to students from their department)
        conditions.push(`u.department_id = $${paramIndex}`);
      } else {
        // Filter by resource's department (traditional filtering)
        conditions.push(`t.department_id = $${paramIndex}`);
      }
      params.push(filters.departmentId);
      paramIndex++;
    }

    // Assigned student filter
    if (filters.assignedStudentId !== undefined) {
      if (filters.assignedStudentId === null) {
        conditions.push(`t.assigned_student_id IS NULL`);
      } else {
        conditions.push(`t.assigned_student_id = $${paramIndex}`);
        params.push(filters.assignedStudentId);
        paramIndex++;
      }
    }

    // category filter
    if (filters.category) {
      conditions.push(`t.category ILIKE $${paramIndex}`);
      params.push(`%${filters.category}%`);
      paramIndex++;
    }

    // Search filter (search across multiple fields)
    if (filters.search) {
      conditions.push(`(
        t.resource_code ILIKE $${paramIndex} OR
        t.category ILIKE $${paramIndex} OR
        t.location_description ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        d.name ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.roll_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    console.log('🌳 resource FILTER DEBUG:', {
      filters,
      conditions,
      whereClause,
      params
    });
    const {
      page = 1,
      limit = 1000, // Increased default limit to show all resources
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `
      SELECT COUNT(*)
      FROM learning_resources t
      LEFT JOIN colleges c ON t.college_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.assigned_student_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await this.query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with last upload date
    const dataQuery = `
      SELECT
        t.*,
        c.name as college_name,
        d.name as department_name,
        u.name as student_name,
        u.email as student_email,
        u.roll_number as student_roll_number,
        sd.name as student_department_name,
        MAX(ti.created_at) as last_photo_upload
      FROM learning_resources t
      LEFT JOIN colleges c ON t.college_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.assigned_student_id = u.id
      LEFT JOIN departments sd ON u.department_id = sd.id
      LEFT JOIN resource_media ti ON t.id = ti.resource_id
      WHERE ${whereClause}
      GROUP BY t.id, c.name, d.name, u.name, u.email, u.roll_number, sd.name
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await this.query<resourceWithDetails>(dataQuery, [...params, limit, offset]);

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
   * Create a new resource
   */
  async createresource(resourceData: CreateresourceData): Promise<resource> {
    const query = `
      INSERT INTO learning_resources (
        resource_code, category, start_date, learning_context, latitude, longitude,
        assigned_student_id, assignment_date, status, college_id, department_id, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      resourceData.resourceCode,
      resourceData.category,
      resourceData.startedDate,
      resourceData.locationDescription || null,
      resourceData.latitude || null,
      resourceData.longitude || null,
      resourceData.assignedStudentId || null,
      resourceData.assignedDate || null,
      resourceData.status || 'assigned',
      resourceData.collegeId,
      resourceData.departmentId || null,
      resourceData.notes || null,
    ];

    const result = await this.query<resource>(query, values);
    return result.rows[0];
  }

  /**
   * Update resource data
   */
  async updateresource(id: string, resourceData: UpdateresourceData): Promise<resource | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 because $1 is the ID

    // Build dynamic update query
    Object.entries(resourceData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id); // No updates, return current resource
    }

    const query = `
      UPDATE learning_resources
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<resource>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Assign resource to student
   */
  async assignToStudent(resourceId: string, studentId: string): Promise<boolean> {
    const query = `
      UPDATE learning_resources
      SET assigned_student_id = $2, assignment_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [resourceId, studentId]);
    return result.rowCount > 0;
  }

  /**
   * Update resource status
   */
  async updateStatus(resourceId: string, status: resourcestatus): Promise<boolean> {
    const query = `
      UPDATE learning_resources
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [resourceId, status]);
    return result.rowCount > 0;
  }

  /**
   * Find unassigned resources
   */
  async findUnassigned(collegeId?: string, departmentId?: string, options: PaginationOptions = {}): Promise<PaginatedResult<resource>> {
    const conditions = ['assigned_student_id IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (collegeId) {
      conditions.push(`college_id = $${paramIndex}`);
      params.push(collegeId);
      paramIndex++;
    }

    if (departmentId) {
      conditions.push(`department_id = $${paramIndex}`);
      params.push(departmentId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    return this.findWhere(whereClause, params, options);
  }

  /**
   * Check if resource code exists
   */
  async resourceCodeExists(resourceCode: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM learning_resources WHERE resource_code = $1';
    const params: any[] = [resourceCode];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Get resource statistics
   */
  async getStatistics(): Promise<{
    totalresources: number;
    resourcesByStatus: Record<resourcestatus, number>;
    assignedresources: number;
    unassignedresources: number;
    resourcesBycategory: Array<{ category: string; count: number }>;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM learning_resources',
      'SELECT status, COUNT(*) as count FROM learning_resources GROUP BY status',
      'SELECT COUNT(*) as count FROM learning_resources WHERE assigned_student_id IS NOT NULL',
      'SELECT COUNT(*) as count FROM learning_resources WHERE assigned_student_id IS NULL',
      'SELECT category, COUNT(*) as count FROM learning_resources GROUP BY category ORDER BY count DESC LIMIT 10',
    ];

    const [totalResult, statusResult, assignedResult, unassignedResult, categoryResult] = await Promise.all(
      queries.map(query => this.query(query))
    );

    const resourcesByStatus = {} as Record<resourcestatus, number>;

    statusResult.rows.forEach(row => {
      resourcesByStatus[row.status as resourcestatus] = parseInt((row as any).count, 10);
    });

    const resourcesBycategory = categoryResult.rows.map(row => ({
      category: row.category,
      count: parseInt((row as any).count, 10),
    }));

    return {
      totalresources: parseInt((totalResult.rows[0] as any)?.total || '0', 10),
      resourcesByStatus,
      assignedresources: parseInt((assignedResult.rows[0] as any)?.count || '0', 10),
      unassignedresources: parseInt((unassignedResult.rows[0] as any)?.count || '0', 10),
      resourcesBycategory,
    };
  }
}

// Create singleton instance
export const learningResourceRepository = new LearningResourceRepository();
