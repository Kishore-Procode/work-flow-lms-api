/**
 * ContentMapMaster Repository Implementation
 * 
 * Infrastructure layer implementation for content mapping master data.
 * Handles PostgreSQL-specific data access operations for ContentMapMaster entity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { ContentMapMaster, ContentMapMasterProps, CourseTypeMapping, ContentMappingStatus } from '../../domain/entities/ContentMapMaster';
import { DomainError } from '../../domain/errors/DomainError';

export interface ContentMapMasterFilter {
  courseType?: CourseTypeMapping;
  lmsCourseId?: string;
  lmsDepartmentId?: string;
  lmsAcademicYearId?: string;
  actDepartmentId?: string;
  actRegulationId?: string;
  status?: ContentMappingStatus;
  createdBy?: string;
}

export interface PaginatedContentMapMasterResult {
  data: ContentMapMaster[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IContentMapMasterRepository {
  findById(id: string): Promise<ContentMapMaster | null>;
  findByFilter(filter: ContentMapMasterFilter): Promise<ContentMapMaster[]>;
  findPaginated(filter: ContentMapMasterFilter, page: number, limit: number): Promise<PaginatedContentMapMasterResult>;
  findExistingMapping(
    courseType: CourseTypeMapping,
    lmsCourseId: string,
    lmsDepartmentId: string,
    lmsAcademicYearId: string,
    actDepartmentId: string,
    actRegulationId: string
  ): Promise<ContentMapMaster | null>;
  save(contentMapMaster: ContentMapMaster): Promise<ContentMapMaster>;
  update(contentMapMaster: ContentMapMaster): Promise<ContentMapMaster>;
  delete(id: string): Promise<void>;
  withTransaction<T>(operation: (repository: IContentMapMasterRepository) => Promise<T>): Promise<T>;
}

export class ContentMapMasterRepository implements IContentMapMasterRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find content map master by ID
   */
  public async findById(id: string): Promise<ContentMapMaster | null> {
    const query = `
      SELECT
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
      FROM lmsact.content_map_master
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to find content map master by ID: ${error}`);
    }
  }

  /**
   * Find content map masters by filter
   */
  public async findByFilter(filter: ContentMapMasterFilter): Promise<ContentMapMaster[]> {
    const { whereClause, params } = this.buildWhereClause(filter);
    
    const query = `
      SELECT
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
      FROM lmsact.content_map_master
      ${whereClause}
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      throw new DomainError(`Failed to find content map masters by filter: ${error}`);
    }
  }

  /**
   * Find content map masters with pagination
   */
  public async findPaginated(
    filter: ContentMapMasterFilter,
    page: number = 1,
    limit: number = 25
  ): Promise<PaginatedContentMapMasterResult> {
    const offset = (page - 1) * limit;
    const { whereClause, params } = this.buildWhereClause(filter);
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM lmsact.content_map_master
      ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
      FROM lmsact.content_map_master
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, params),
        this.pool.query(dataQuery, [...params, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);
      const data = dataResult.rows.map(row => this.mapRowToEntity(row));

      return {
        data,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      throw new DomainError(`Failed to find paginated content map masters: ${error}`);
    }
  }

  /**
   * Find existing mapping to prevent duplicates
   */
  public async findExistingMapping(
    courseType: CourseTypeMapping,
    lmsCourseId: string,
    lmsDepartmentId: string,
    lmsAcademicYearId: string,
    actDepartmentId: string,
    actRegulationId: string
  ): Promise<ContentMapMaster | null> {
    const query = `
      SELECT
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
      FROM lmsact.content_map_master
      WHERE course_type = $1 
        AND lms_course_id = $2 
        AND lms_department_id = $3 
        AND lms_academic_year_id = $4 
        AND act_department_id = $5 
        AND act_regulation_id = $6
        AND status != 'inactive'
    `;

    try {
      const result = await this.pool.query(query, [
        courseType,
        lmsCourseId,
        lmsDepartmentId,
        lmsAcademicYearId,
        actDepartmentId,
        actRegulationId
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to find existing mapping: ${error}`);
    }
  }

  /**
   * Save new content map master
   */
  public async save(contentMapMaster: ContentMapMaster): Promise<ContentMapMaster> {
    const data = contentMapMaster.toPersistence();
    
    const query = `
      INSERT INTO lmsact.content_map_master (
        id, course_type, lms_course_id, lms_department_id, lms_academic_year_id,
        act_department_id, act_regulation_id, created_at, created_by, updated_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.courseType,
        data.lmsCourseId,
        data.lmsDepartmentId,
        data.lmsAcademicYearId,
        data.actDepartmentId,
        data.actRegulationId,
        data.createdAt,
        data.createdBy,
        data.updatedAt,
        data.status
      ]);

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('Content mapping already exists for this configuration');
      }
      throw new DomainError(`Failed to save content map master: ${error}`);
    }
  }

  /**
   * Update existing content map master
   */
  public async update(contentMapMaster: ContentMapMaster): Promise<ContentMapMaster> {
    const data = contentMapMaster.toPersistence();
    
    const query = `
      UPDATE lmsact.content_map_master
      SET
        course_type = $2,
        lms_course_id = $3,
        lms_department_id = $4,
        lms_academic_year_id = $5,
        act_department_id = $6,
        act_regulation_id = $7,
        updated_at = $8,
        updated_by = $9,
        status = $10
      WHERE id = $1
      RETURNING
        id,
        course_type as "courseType",
        lms_course_id as "lmsCourseId",
        lms_department_id as "lmsDepartmentId",
        lms_academic_year_id as "lmsAcademicYearId",
        act_department_id as "actDepartmentId",
        act_regulation_id as "actRegulationId",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.courseType,
        data.lmsCourseId,
        data.lmsDepartmentId,
        data.lmsAcademicYearId,
        data.actDepartmentId,
        data.actRegulationId,
        data.updatedAt,
        data.updatedBy,
        data.status
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Content map master not found for update');
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to update content map master: ${error}`);
    }
  }

  /**
   * Delete content map master
   */
  public async delete(id: string): Promise<void> {
    const query = `DELETE FROM lmsact.content_map_master WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new DomainError('Content map master not found for deletion');
      }
    } catch (error) {
      throw new DomainError(`Failed to delete content map master: ${error}`);
    }
  }

  /**
   * Execute operation within transaction
   */
  public async withTransaction<T>(operation: (repository: IContentMapMasterRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionRepo = new ContentMapMasterRepository(client as any);
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

  /**
   * Build WHERE clause for filtering
   */
  private buildWhereClause(filter: ContentMapMasterFilter): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.courseType) {
      conditions.push(`course_type = $${paramIndex++}`);
      params.push(filter.courseType);
    }

    if (filter.lmsCourseId) {
      conditions.push(`lms_course_id = $${paramIndex++}`);
      params.push(filter.lmsCourseId);
    }

    if (filter.lmsDepartmentId) {
      conditions.push(`lms_department_id = $${paramIndex++}`);
      params.push(filter.lmsDepartmentId);
    }

    if (filter.lmsAcademicYearId) {
      conditions.push(`lms_academic_year_id = $${paramIndex++}`);
      params.push(filter.lmsAcademicYearId);
    }

    if (filter.actDepartmentId) {
      conditions.push(`act_department_id = $${paramIndex++}`);
      params.push(filter.actDepartmentId);
    }

    if (filter.actRegulationId) {
      conditions.push(`act_regulation_id = $${paramIndex++}`);
      params.push(filter.actRegulationId);
    }

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }

    if (filter.createdBy) {
      conditions.push(`created_by = $${paramIndex++}`);
      params.push(filter.createdBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, params };
  }

  /**
   * Map database row to domain entity
   */
  private mapRowToEntity(row: any): ContentMapMaster {
    const props: ContentMapMasterProps = {
      id: row.id,
      courseType: row.courseType,
      lmsCourseId: row.lmsCourseId,
      lmsDepartmentId: row.lmsDepartmentId,
      lmsAcademicYearId: row.lmsAcademicYearId,
      actDepartmentId: row.actDepartmentId,
      actRegulationId: row.actRegulationId,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      status: row.status
    };

    return ContentMapMaster.fromPersistence(props);
  }
}
