/**
 * PostgreSQL Learning Resource Repository Implementation
 * 
 * Infrastructure layer implementation of ILearningResourceRepository.
 * Handles data persistence for learning resources using PostgreSQL database.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { ILearningResourceRepository, LearningResourceFilter, PaginatedLearningResourceResult } from '../../domain/repositories/ILearningResourceRepository';
import { LearningResource } from '../../domain/entities/LearningResource';
import { ResourceCode } from '../../domain/value-objects/ResourceCode';
import { Location } from '../../domain/value-objects/Location';
import { DomainError } from '../../domain/errors/DomainError';

export class PostgreSQLLearningResourceRepository implements ILearningResourceRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find learning resource by ID
   */
  public async findById(id: string): Promise<LearningResource | null> {
    const query = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      return LearningResource.fromPersistence(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find learning resource by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find learning resource by resource code
   */
  public async findByResourceCode(resourceCode: string): Promise<LearningResource | null> {
    const query = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE resource_code = $1
    `;

    try {
      const result = await this.pool.query(query, [resourceCode]);
      if (result.rows.length === 0) {
        return null;
      }

      return LearningResource.fromPersistence(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find learning resource by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find learning resources assigned to a student
   */
  public async findByAssignedStudent(studentId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    const pageNum = page || 1;
    const limitNum = limit || 25;
    const offset = (pageNum - 1) * limitNum;

    // Count query
    const countQuery = `SELECT COUNT(*) FROM learning_resources WHERE assigned_student_id = $1`;
    const countResult = await this.pool.query(countQuery, [studentId]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE assigned_student_id = $1
      ORDER BY assignment_date DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const dataResult = await this.pool.query(dataQuery, [studentId, limitNum, offset]);
      const resources = dataResult.rows.map(row => LearningResource.fromPersistence(row));

      return {
        data: resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new Error(`Failed to find learning resources by student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find available learning resources
   */
  public async findAvailable(collegeId?: string, departmentId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    const pageNum = page || 1;
    const limitNum = limit || 25;
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClauses = ['status = $1', 'is_active = true'];
    const params: any[] = ['available'];

    if (collegeId) {
      params.push(collegeId);
      whereClauses.push(`college_id = $${params.length}`);
    }

    if (departmentId) {
      params.push(departmentId);
      whereClauses.push(`department_id = $${params.length}`);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM learning_resources WHERE ${whereClauses.join(' AND ')}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    params.push(limitNum, offset);
    const dataQuery = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    try {
      const dataResult = await this.pool.query(dataQuery, params);
      const resources = dataResult.rows.map(row => LearningResource.fromPersistence(row));

      return {
        data: resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new Error(`Failed to find available learning resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save new learning resource
   */
  public async save(resource: LearningResource): Promise<LearningResource> {
    const data = resource.toPersistence();
    
    const query = `
      INSERT INTO learning_resources (
        id, resource_code, title, description, category, type,
        location_coordinates, assigned_student_id, assignment_date,
        status, media_urls, metadata, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.id,
      data.resourceCode,
      data.title,
      data.description,
      data.category,
      data.type,
      data.locationCoordinates,
      data.assignedStudentId,
      data.assignmentDate,
      data.status,
      JSON.stringify(data.mediaUrls),
      JSON.stringify(data.metadata),
      data.isActive,
      data.createdAt,
      data.updatedAt,
    ];

    try {
      const result = await this.pool.query(query, values);
      return LearningResource.fromPersistence(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw DomainError.conflict('Learning resource with this code already exists');
      }
      throw new Error(`Failed to save learning resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Placeholder implementations for other required methods
  public async findWithFilters(filter: LearningResourceFilter): Promise<PaginatedLearningResourceResult> {
    // Simplified implementation - would need full filter logic
    return this.findAvailable(filter.collegeId, filter.departmentId, filter.page, filter.limit);
  }

  public async findWithLocation(collegeId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    const pageNum = page || 1;
    const limitNum = limit || 25;
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClauses = ['location_coordinates IS NOT NULL', 'is_active = true'];
    const params: any[] = [];

    if (collegeId) {
      params.push(collegeId);
      whereClauses.push(`college_id = $${params.length}`);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM learning_resources WHERE ${whereClauses.join(' AND ')}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    params.push(limitNum, offset);
    const query = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    try {
      const dataResult = await this.pool.query(query, params);
      const resources = dataResult.rows.map(row => LearningResource.fromPersistence(row));

      return {
        data: resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new Error(`Failed to find resources with location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async findNearLocation(latitude: number, longitude: number, radiusKm: number): Promise<LearningResource[]> {
    // Placeholder - would need PostGIS for proper geospatial queries
    const query = `
      SELECT
        id,
        resource_code as "resourceCode",
        title,
        description,
        category,
        type,
        location_coordinates as "locationCoordinates",
        assigned_student_id as "assignedStudentId",
        assignment_date as "assignmentDate",
        status,
        media_urls as "mediaUrls",
        metadata,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM learning_resources
      WHERE location_coordinates IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => LearningResource.fromPersistence(row));
  }

  public async update(resource: LearningResource): Promise<LearningResource> {
    throw new Error('Update method not yet implemented');
  }

  public async delete(id: string): Promise<boolean> {
    throw new Error('Delete method not yet implemented');
  }

  public async count(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM learning_resources');
    return parseInt(result.rows[0].count, 10);
  }

  public async countByStatus(status: string): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM learning_resources WHERE status = $1', [status]);
    return parseInt(result.rows[0].count, 10);
  }

  public async countByCategory(category: string): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM learning_resources WHERE category = $1', [category]);
    return parseInt(result.rows[0].count, 10);
  }

  public async countAssigned(): Promise<number> {
    return this.countByStatus('assigned');
  }

  public async countAvailable(): Promise<number> {
    return this.countByStatus('available');
  }

  public async countCompleted(): Promise<number> {
    return this.countByStatus('completed');
  }

  public async search(query: string, collegeId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    // Simplified search implementation
    return this.findAvailable(collegeId, undefined, page, limit);
  }

  public async getCategories(collegeId?: string): Promise<string[]> {
    const result = await this.pool.query('SELECT DISTINCT category FROM learning_resources WHERE category IS NOT NULL ORDER BY category');
    return result.rows.map(row => row.category);
  }

  public async findByCollege(collegeId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    return this.findAvailable(collegeId, undefined, page, limit);
  }

  public async findByDepartment(departmentId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    return this.findAvailable(undefined, departmentId, page, limit);
  }

  public async findByStatus(status: any, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    return this.findAvailable(undefined, undefined, page, limit);
  }

  public async findByCategory(category: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult> {
    return this.findAvailable(undefined, undefined, page, limit);
  }

  public async findAssignedInDateRange(startDate: Date, endDate: Date): Promise<LearningResource[]> {
    return [];
  }

  public async findOverdue(days: number): Promise<LearningResource[]> {
    return [];
  }

  public async existsByResourceCode(resourceCode: string, excludeId?: string): Promise<boolean> {
    const resource = await this.findByResourceCode(resourceCode);
    if (!resource) return false;
    if (excludeId && resource.getId() === excludeId) return false;
    return true;
  }

  public async countByCollege(collegeId: string): Promise<number> {
    return 0;
  }

  public async countByDepartment(departmentId: string): Promise<number> {
    return 0;
  }

  public async countByAssignedStudent(studentId: string): Promise<number> {
    return 0;
  }

  public async getStatistics(collegeId?: string, departmentId?: string): Promise<any> {
    return {
      total: 0,
      available: 0,
      assigned: 0,
      completed: 0,
      archived: 0,
      byCategory: {},
      byCollege: {},
      byDepartment: {},
      assignmentRate: 0,
      completionRate: 0,
    };
  }

  public async bulkAssign(assignments: Array<{ resourceId: string; studentId: string; assignmentDate?: Date }>): Promise<boolean> {
    throw new Error('Bulk assign method not yet implemented');
  }

  public async bulkUnassign(resourceIds: string[]): Promise<boolean> {
    throw new Error('Bulk unassign method not yet implemented');
  }

  public async bulkUpdateStatus(resourceIds: string[], status: any): Promise<boolean> {
    throw new Error('Bulk update status method not yet implemented');
  }

  public async findByDateRange(startDate: Date, endDate: Date): Promise<LearningResource[]> {
    throw new Error('findByDateRange method not yet implemented');
  }

  public async saveMany(resources: LearningResource[]): Promise<LearningResource[]> {
    throw new Error('saveMany method not yet implemented');
  }

  public async updateMany(resources: LearningResource[]): Promise<LearningResource[]> {
    throw new Error('updateMany method not yet implemented');
  }

  public async deleteMany(ids: string[]): Promise<boolean> {
    throw new Error('deleteMany method not yet implemented');
  }

  public async withTransaction<T>(operation: (repository: ILearningResourceRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionRepo = new PostgreSQLLearningResourceRepository(client as any);
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
