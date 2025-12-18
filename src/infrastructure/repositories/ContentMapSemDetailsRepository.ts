/**
 * ContentMapSemDetails Repository Implementation
 * 
 * Infrastructure layer implementation for content mapping semester details data.
 * Handles PostgreSQL-specific data access operations for ContentMapSemDetails entity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { ContentMapSemDetails, ContentMapSemDetailsProps } from '../../domain/entities/ContentMapSemDetails';
import { ContentMappingStatus } from '../../domain/entities/ContentMapMaster';
import { DomainError } from '../../domain/errors/DomainError';

export interface ContentMapSemDetailsFilter {
  contentMapMasterId?: string;
  semesterNumber?: number;
  status?: ContentMappingStatus;
}

export interface IContentMapSemDetailsRepository {
  findById(id: string): Promise<ContentMapSemDetails | null>;
  findByContentMapMasterId(contentMapMasterId: string): Promise<ContentMapSemDetails[]>;
  findByFilter(filter: ContentMapSemDetailsFilter): Promise<ContentMapSemDetails[]>;
  save(contentMapSemDetails: ContentMapSemDetails): Promise<ContentMapSemDetails>;
  update(contentMapSemDetails: ContentMapSemDetails): Promise<ContentMapSemDetails>;
  delete(id: string): Promise<void>;
  deleteByContentMapMasterId(contentMapMasterId: string): Promise<void>;
  withTransaction<T>(operation: (repository: IContentMapSemDetailsRepository) => Promise<T>): Promise<T>;
}

export class ContentMapSemDetailsRepository implements IContentMapSemDetailsRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find content map semester details by ID
   */
  public async findById(id: string): Promise<ContentMapSemDetails | null> {
    const query = `
      SELECT
        id,
        content_map_master_id as "contentMapMasterId",
        semester_number as "semesterNumber",
        semester_name as "semesterName",
        total_subjects as "totalSubjects",
        mapped_subjects as "mappedSubjects",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sem_details
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to find content map semester details by ID: ${error}`);
    }
  }

  /**
   * Find all semester details for a content map master
   */
  public async findByContentMapMasterId(contentMapMasterId: string): Promise<ContentMapSemDetails[]> {
    const query = `
      SELECT
        id,
        content_map_master_id as "contentMapMasterId",
        semester_number as "semesterNumber",
        semester_name as "semesterName",
        total_subjects as "totalSubjects",
        mapped_subjects as "mappedSubjects",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sem_details
      WHERE content_map_master_id = $1
      ORDER BY semester_number ASC
    `;

    try {
      const result = await this.pool.query(query, [contentMapMasterId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      throw new DomainError(`Failed to find semester details by content map master ID: ${error}`);
    }
  }

  /**
   * Find semester details by filter
   */
  public async findByFilter(filter: ContentMapSemDetailsFilter): Promise<ContentMapSemDetails[]> {
    const { whereClause, params } = this.buildWhereClause(filter);
    
    const query = `
      SELECT
        id,
        content_map_master_id as "contentMapMasterId",
        semester_number as "semesterNumber",
        semester_name as "semesterName",
        total_subjects as "totalSubjects",
        mapped_subjects as "mappedSubjects",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sem_details
      ${whereClause}
      ORDER BY semester_number ASC
    `;

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      throw new DomainError(`Failed to find semester details by filter: ${error}`);
    }
  }

  /**
   * Save new content map semester details
   */
  public async save(contentMapSemDetails: ContentMapSemDetails): Promise<ContentMapSemDetails> {
    const data = contentMapSemDetails.toPersistence();
    
    const query = `
      INSERT INTO lmsact.content_map_sem_details (
        id, content_map_master_id, semester_number, semester_name,
        total_subjects, mapped_subjects, created_at, updated_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        content_map_master_id as "contentMapMasterId",
        semester_number as "semesterNumber",
        semester_name as "semesterName",
        total_subjects as "totalSubjects",
        mapped_subjects as "mappedSubjects",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.contentMapMasterId,
        data.semesterNumber,
        data.semesterName,
        data.totalSubjects,
        data.mappedSubjects,
        data.createdAt,
        data.updatedAt,
        data.status
      ]);

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('Semester details already exist for this content map master and semester number');
      }
      throw new DomainError(`Failed to save content map semester details: ${error}`);
    }
  }

  /**
   * Update existing content map semester details
   */
  public async update(contentMapSemDetails: ContentMapSemDetails): Promise<ContentMapSemDetails> {
    const data = contentMapSemDetails.toPersistence();

    const query = `
      UPDATE lmsact.content_map_sem_details
      SET
        content_map_master_id = $2,
        semester_number = $3,
        semester_name = $4,
        total_subjects = $5,
        mapped_subjects = $6,
        updated_at = $7,
        status = $8::lmsact.content_mapping_status
      WHERE id = $1
      RETURNING
        id,
        content_map_master_id as "contentMapMasterId",
        semester_number as "semesterNumber",
        semester_name as "semesterName",
        total_subjects as "totalSubjects",
        mapped_subjects as "mappedSubjects",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.contentMapMasterId,
        data.semesterNumber,
        data.semesterName,
        data.totalSubjects,
        data.mappedSubjects,
        data.updatedAt,
        data.status
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Content map semester details not found for update');
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to update content map semester details: ${error}`);
    }
  }

  /**
   * Delete content map semester details
   */
  public async delete(id: string): Promise<void> {
    const query = `DELETE FROM lmsact.content_map_sem_details WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new DomainError('Content map semester details not found for deletion');
      }
    } catch (error) {
      throw new DomainError(`Failed to delete content map semester details: ${error}`);
    }
  }

  /**
   * Delete all semester details for a content map master
   */
  public async deleteByContentMapMasterId(contentMapMasterId: string): Promise<void> {
    const query = `DELETE FROM lmsact.content_map_sem_details WHERE content_map_master_id = $1`;

    try {
      await this.pool.query(query, [contentMapMasterId]);
    } catch (error) {
      throw new DomainError(`Failed to delete semester details by content map master ID: ${error}`);
    }
  }

  /**
   * Execute operation within transaction
   */
  public async withTransaction<T>(operation: (repository: IContentMapSemDetailsRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionRepo = new ContentMapSemDetailsRepository(client as any);
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
  private buildWhereClause(filter: ContentMapSemDetailsFilter): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.contentMapMasterId) {
      conditions.push(`content_map_master_id = $${paramIndex++}`);
      params.push(filter.contentMapMasterId);
    }

    if (filter.semesterNumber) {
      conditions.push(`semester_number = $${paramIndex++}`);
      params.push(filter.semesterNumber);
    }

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, params };
  }

  /**
   * Map database row to domain entity
   */
  private mapRowToEntity(row: any): ContentMapSemDetails {
    const props: ContentMapSemDetailsProps = {
      id: row.id,
      contentMapMasterId: row.contentMapMasterId,
      semesterNumber: row.semesterNumber,
      semesterName: row.semesterName,
      totalSubjects: row.totalSubjects,
      mappedSubjects: row.mappedSubjects,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.status
    };

    return ContentMapSemDetails.fromPersistence(props);
  }
}
