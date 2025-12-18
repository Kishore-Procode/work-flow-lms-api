import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { pool } from '../../../config/database';

export interface resourceInventory {
  id: string;
  resourceType: string;
  totalCount: number;
  availableCount: number;
  assignedCount: number;
  departmentId: string;
  collegeId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  departmentName?: string;
  collegeName?: string;
}

export interface CreateresourceInventoryData {
  resourceType: string;
  totalCount: number;
  departmentId: string;
  collegeId: string;
  notes?: string;
}

export interface UpdateresourceInventoryData {
  resourceType?: string;
  totalCount?: number;
  notes?: string;
}

export interface resourceInventoryFilter extends PaginationOptions {
  departmentId?: string;
  collegeId?: string;
  resourceType?: string;
  search?: string;
}

export class ResourceCatalogRepository extends BaseRepository<resourceInventory> {
  constructor() {
    super('resource_catalog');
  }

  /**
   * Get resource inventory with department and college details
   */
  async findWithDetails(filters: resourceInventoryFilter = {}): Promise<PaginatedResult<resourceInventory>> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'created_at',
      sortOrder = 'desc',
      departmentId,
      collegeId,
      resourceType,
      search
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (departmentId) {
      conditions.push(`ti.department_id = $${paramCount++}`);
      values.push(departmentId);
    }

    if (collegeId) {
      conditions.push(`ti.college_id = $${paramCount++}`);
      values.push(collegeId);
    }

    if (resourceType) {
      conditions.push(`ti.category ILIKE $${paramCount++}`);
      values.push(`%${resourceType}%`);
    }

    if (search) {
      conditions.push(`(ti.category ILIKE $${paramCount++} OR d.name ILIKE $${paramCount++})`);
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resource_inventory ti
      LEFT JOIN departments d ON ti.department_id = d.id
      ${whereClause}
    `;

    const countResult = await this.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Get paginated data
    const dataQuery = `
      SELECT
        ti.id,
        ti.category as "resourceType",
        ti.quantity_available + ti.quantity_assigned as "totalCount",
        ti.quantity_available as "availableCount",
        ti.quantity_assigned as "assignedCount",
        ti.department_id as "departmentId",
        ti.college_id as "collegeId",
        ti.description as "notes",
        ti.created_at as "createdAt",
        ti.updated_at as "updatedAt",
        d.name as "departmentName",
        c.name as "collegeName"
      FROM resource_inventory ti
      LEFT JOIN departments d ON ti.department_id = d.id
      LEFT JOIN colleges c ON ti.college_id = c.id
      ${whereClause}
      ORDER BY ti.${sortBy} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);
    const dataResult = await this.query<resourceInventory>(dataQuery, values);

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
   * Create resource inventory
   */
  async createInventory(data: CreateresourceInventoryData): Promise<resourceInventory> {
    const query = `
      INSERT INTO resource_inventory (
        resource_type, total_count, available_count, assigned_count,
        department_id, college_id, notes
      )
      VALUES ($1, $2, $2, 0, $3, $4, $5)
      RETURNING
        id,
        resource_type as "resourceType",
        total_count as "totalCount",
        available_count as "availableCount",
        assigned_count as "assignedCount",
        department_id as "departmentId",
        college_id as "collegeId",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.resourceType,
      data.totalCount,
      data.departmentId,
      data.collegeId,
      data.notes || null,
    ];

    const result = await this.query<resourceInventory>(query, values);
    return result.rows[0];
  }

  /**
   * Update resource inventory
   */
  async updateInventory(id: string, data: UpdateresourceInventoryData): Promise<resourceInventory | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.resourceType !== undefined) {
      updates.push(`resource_type = $${paramCount++}`);
      values.push(data.resourceType);
    }

    if (data.totalCount !== undefined) {
      // When updating total count, adjust available count accordingly
      updates.push(`total_count = $${paramCount++}`);
      updates.push(`available_count = $${paramCount++} - assigned_count`);
      values.push(data.totalCount, data.totalCount);
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE resource_inventory
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id,
        resource_type as "resourceType",
        total_count as "totalCount",
        available_count as "availableCount",
        assigned_count as "assignedCount",
        department_id as "departmentId",
        college_id as "collegeId",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.query<resourceInventory>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Check if resource type is available for assignment
   */
  async checkAvailability(resourceType: string, departmentId: string): Promise<boolean> {
    const query = `
      SELECT available_count
      FROM resource_inventory
      WHERE resource_type = $1 AND department_id = $2
    `;

    const result = await this.query<{ available_count: number }>(query, [resourceType, departmentId]);
    return (result.rows[0]?.available_count || 0) > 0;
  }

  /**
   * Decrement available count and increment assigned count
   */
  async decrementAvailableCount(resourceType: string, departmentId: string): Promise<boolean> {
    const query = `
      UPDATE resource_inventory
      SET 
        available_count = available_count - 1,
        assigned_count = assigned_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE resource_type = $1 
        AND department_id = $2 
        AND available_count > 0
      RETURNING id
    `;

    const result = await this.query(query, [resourceType, departmentId]);
    return result.rowCount > 0;
  }

  /**
   * Increment available count and decrement assigned count (for unassignment)
   */
  async incrementAvailableCount(resourceType: string, departmentId: string): Promise<boolean> {
    const query = `
      UPDATE resource_inventory
      SET 
        available_count = available_count + 1,
        assigned_count = assigned_count - 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE resource_type = $1 
        AND department_id = $2 
        AND assigned_count > 0
      RETURNING id
    `;

    const result = await this.query(query, [resourceType, departmentId]);
    return result.rowCount > 0;
  }

  /**
   * Get inventory summary by department
   */
  async getInventorySummary(departmentId: string): Promise<any> {
    const query = `
      SELECT 
        resource_type as "resourceType",
        total_count as "totalCount",
        available_count as "availableCount",
        assigned_count as "assignedCount"
      FROM resource_inventory
      WHERE department_id = $1
      ORDER BY resource_type
    `;

    const result = await this.query(query, [departmentId]);
    return result.rows;
  }

  /**
   * Get resources assigned to students by resource type
   */
  async getAssignedresourcesByType(resourceType: string, departmentId: string): Promise<any[]> {
    const query = `
      SELECT
        t.id,
        t.resource_code as "resourceCode",
        t.category,
        t.assignment_date as "assignedDate",
        u.id as "studentId",
        u.name as "studentName",
        u.email as "studentEmail",
        u.roll_number as "studentRollNumber"
      FROM learning_resources t
      INNER JOIN users u ON t.assigned_student_id = u.id
      WHERE t.category = $1
        AND u.department_id = $2
        AND t.assigned_student_id IS NOT NULL
      ORDER BY t.assignment_date DESC
    `;

    const result = await this.query(query, [resourceType, departmentId]);
    return result.rows;
  }
}

export const resourceCatalogRepository = new ResourceCatalogRepository();

