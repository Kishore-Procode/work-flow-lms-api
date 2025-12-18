import { Request, Response } from 'express';
import { Pool } from 'pg';
import { pool } from '../../../config/database';

interface StudentProgressQuery {
  page?: number;
  limit?: number;
  departmentId?: string;
  healthStatus?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface StudentProgressData {
  id: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  department: string;
  departmentId: string;
  resourceCode: string;
  resourcecategory: string;
  assignedDate: string;
  lastPhotoDate?: string;
  totalPhotos: number;
  currentHeight: number;
  growthRate: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  careScore: number;
  isActive: boolean;
  notes?: string;
}

export class StudentProgressController {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Get student progress data with pagination and filtering
   * Optimized single query to fetch all required data
   */
  async getStudentProgress(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        departmentId,
        healthStatus,
        searchTerm,
        sortBy = 'studentName',
        sortOrder = 'asc'
      } = req.query as StudentProgressQuery;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Build WHERE conditions for the base query
      const baseConditions: string[] = ['u.role = \'student\''];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by department for HOD/Staff
      if (departmentId) {
        console.log('🏢 Adding department filter:', departmentId);
        baseConditions.push(`u.department_id = $${paramIndex}`);
        params.push(departmentId);
        paramIndex++;
      }

      // Build WHERE conditions for the final query
      const finalConditions: string[] = [];

      // Search filter
      if (searchTerm) {
        finalConditions.push(`(
          student_name ILIKE $${paramIndex} OR
          student_email ILIKE $${paramIndex} OR
          roll_number ILIKE $${paramIndex} OR
          resource_code ILIKE $${paramIndex}
        )`);
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      // Health status filter removed - no longer using health status

      const baseWhereClause = baseConditions.join(' AND ');
      const finalWhereClause = finalConditions.length > 0 ? `WHERE ${finalConditions.join(' AND ')}` : '';

      // Debug logging
      console.log('🔍 Query Debug Info:');
      console.log('Department ID:', departmentId);
      console.log('Search Term:', searchTerm);
      console.log('Health Status:', healthStatus);
      console.log('Base WHERE:', baseWhereClause);
      console.log('Final WHERE:', finalWhereClause);
      console.log('Params:', params);

      // Test query to check department users
      if (departmentId) {
        const testQuery = `SELECT COUNT(*) as count FROM users WHERE role = 'student' AND department_id = $1`;
        const testResult = await this.pool.query(testQuery, [departmentId]);
        console.log('🧪 Test query result - Students in department:', testResult.rows[0].count);
      }

      // Main query with all data in single call
      const query = `
        WITH student_resource_data AS (
          SELECT
            u.id as student_id,
            u.name as student_name,
            u.email as student_email,
            u.roll_number,
            u.status as student_status,
            u.created_at as student_created_at,
            d.name as department_name,
            d.id as department_id,
            t.id as resource_id,
            t.resource_code,
            t.category as resource_category,
            t.location_description as resource_location,
            t.assigned_date as assigned_date
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN learning_resources t ON u.id = t.assigned_student_id
          WHERE ${baseWhereClause}
        ),
        photo_stats AS (
          SELECT
            std.student_id,
            COUNT(ti.id) as total_photos,
            MAX(ti.created_at) as last_photo_date
          FROM student_resource_data std
          LEFT JOIN resource_media ti ON std.resource_id = ti.resource_id
          GROUP BY std.student_id
        ),
        enriched_data AS (
          SELECT
            std.*,
            ps.total_photos,
            ps.last_photo_date
          FROM student_resource_data std
          LEFT JOIN photo_stats ps ON std.student_id = ps.student_id
        )
        SELECT
          student_id as id,
          student_name,
          student_email,
          roll_number,
          department_name as department,
          department_id,
          resource_id,
          COALESCE(resource_code, 'Not Assigned') as resource_code,
          COALESCE(resource_category, 'N/A') as resource_category,
          COALESCE(resource_location, 'N/A') as resource_location,
          COALESCE(assigned_date, student_created_at) as assigned_date,
          last_photo_date,
          COALESCE(total_photos, 0) as total_photos,
          (student_status = 'active') as is_active
        FROM enriched_data
        ${finalWhereClause}
        ORDER BY ${this.getSortColumn(sortBy)} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(Number(limit), offset);

      // Count query for pagination
      const countQuery = `
        WITH student_resource_data AS (
          SELECT
            u.id as student_id,
            u.name as student_name,
            u.email as student_email,
            u.roll_number,
            u.department_id,
            t.id as resource_id,
            t.resource_code
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          LEFT JOIN learning_resources t ON u.id = t.assigned_student_id
          WHERE ${baseWhereClause}
        ),
        photo_stats AS (
          SELECT
            std.student_id,
            COUNT(ti.id) as total_photos
          FROM student_resource_data std
          LEFT JOIN resource_media ti ON std.resource_id = ti.resource_id
          GROUP BY std.student_id
        ),
        enriched_data AS (
          SELECT
            std.*,
            ps.total_photos
          FROM student_resource_data std
          LEFT JOIN photo_stats ps ON std.student_id = ps.student_id
        )
        SELECT COUNT(*) as total
        FROM enriched_data
        ${finalWhereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        this.pool.query(query, params),
        this.pool.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);

      const students = dataResult.rows as StudentProgressData[];
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          students,
          pagination: {
            currentPage: Number(page),
            totalPages,
            totalItems: total,
            itemsPerPage: Number(limit),
            hasNextPage: Number(page) < totalPages,
            hasPreviousPage: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching student progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student progress data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get valid sort columns to prevent SQL injection
   */
  private getSortColumn(sortBy: string): string {
    const validColumns: { [key: string]: string } = {
      'studentName': 'student_name',
      'department': 'department_name',
      'resourceCode': 'resource_code',
      'assignedDate': 'assigned_date',
      'totalPhotos': 'total_photos',
      'currentHeight': 'current_height',
      'growthRate': 'growth_rate',
      'healthStatus': 'calculated_health_status',
      'careScore': 'care_score'
    };

    return validColumns[sortBy] || 'student_name';
  }

  /**
   * Get department summary statistics
   */
  async getDepartmentSummary(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId } = req.query;

      const query = `
        SELECT
          COUNT(DISTINCT u.id) as total_students,
          COUNT(DISTINCT t.id) as resources_assigned,
          COUNT(DISTINCT ti.id) as total_photos,
          0 as avg_height
        FROM users u
        LEFT JOIN resources t ON u.id = t.assigned_student_id
        LEFT JOIN resource_media ti ON t.id = ti.resource_id
        WHERE u.role = 'student'
        ${departmentId ? 'AND u.department_id = $1' : ''}
      `;

      const params = departmentId ? [departmentId] : [];
      const result = await this.pool.query(query, params);

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Error fetching department summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
