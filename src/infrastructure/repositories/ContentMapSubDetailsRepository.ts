/**
 * ContentMapSubDetails Repository Implementation
 * 
 * Infrastructure layer implementation for content mapping subject details data.
 * Handles PostgreSQL-specific data access operations for ContentMapSubDetails entity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { ContentMapSubDetails, ContentMapSubDetailsProps } from '../../domain/entities/ContentMapSubDetails';
import { ContentMappingStatus } from '../../domain/entities/ContentMapMaster';
import { DomainError } from '../../domain/errors/DomainError';

export interface ContentMapSubDetailsFilter {
  contentMapSemDetailsId?: string;
  actSubjectId?: string;
  lmsLearningResourceId?: string;
  mappedBy?: string;
  status?: ContentMappingStatus;
  isMapped?: boolean;
}

export interface IContentMapSubDetailsRepository {
  findById(id: string): Promise<ContentMapSubDetails | null>;
  findByContentMapSemDetailsId(contentMapSemDetailsId: string): Promise<ContentMapSubDetails[]>;
  findByFilter(filter: ContentMapSubDetailsFilter): Promise<ContentMapSubDetails[]>;
  save(contentMapSubDetails: ContentMapSubDetails): Promise<ContentMapSubDetails>;
  update(contentMapSubDetails: ContentMapSubDetails): Promise<ContentMapSubDetails>;
  delete(id: string): Promise<void>;
  deleteByContentMapSemDetailsId(contentMapSemDetailsId: string): Promise<void>;
  bulkSave(contentMapSubDetailsList: ContentMapSubDetails[]): Promise<ContentMapSubDetails[]>;
  bulkUpdate(contentMapSubDetailsList: ContentMapSubDetails[]): Promise<ContentMapSubDetails[]>;
  withTransaction<T>(operation: (repository: IContentMapSubDetailsRepository) => Promise<T>): Promise<T>;
}

export class ContentMapSubDetailsRepository implements IContentMapSubDetailsRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find content map subject details by ID
   */
  public async findById(id: string): Promise<ContentMapSubDetails | null> {
    const query = `
      SELECT
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sub_details
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to find content map subject details by ID: ${error}`);
    }
  }

  /**
   * Find all subject details for a semester
   */
  public async findByContentMapSemDetailsId(contentMapSemDetailsId: string): Promise<ContentMapSubDetails[]> {
    const query = `
      SELECT
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sub_details
      WHERE content_map_sem_details_id = $1
      ORDER BY act_subject_code ASC
    `;

    try {
      const result = await this.pool.query(query, [contentMapSemDetailsId]);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      throw new DomainError(`Failed to find subject details by semester details ID: ${error}`);
    }
  }

  /**
   * Find subject details by filter
   */
  public async findByFilter(filter: ContentMapSubDetailsFilter): Promise<ContentMapSubDetails[]> {
    const { whereClause, params } = this.buildWhereClause(filter);
    
    const query = `
      SELECT
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
      FROM lmsact.content_map_sub_details
      ${whereClause}
      ORDER BY act_subject_code ASC
    `;

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      throw new DomainError(`Failed to find subject details by filter: ${error}`);
    }
  }

  /**
   * Save new content map subject details
   */
  public async save(contentMapSubDetails: ContentMapSubDetails): Promise<ContentMapSubDetails> {
    const data = contentMapSubDetails.toPersistence();
    
    const query = `
      INSERT INTO lmsact.content_map_sub_details (
        id, content_map_sem_details_id, act_subject_id, act_subject_code,
        act_subject_name, act_subject_credits, lms_learning_resource_id,
        mapped_at, mapped_by, created_at, updated_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.contentMapSemDetailsId,
        data.actSubjectId,
        data.actSubjectCode,
        data.actSubjectName,
        data.actSubjectCredits,
        data.lmsLearningResourceId,
        data.mappedAt,
        data.mappedBy,
        data.createdAt,
        data.updatedAt,
        data.status
      ]);

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DomainError('Subject details already exist for this semester and subject');
      }
      throw new DomainError(`Failed to save content map subject details: ${error}`);
    }
  }

  /**
   * Update existing content map subject details
   */
  public async update(contentMapSubDetails: ContentMapSubDetails): Promise<ContentMapSubDetails> {
    const data = contentMapSubDetails.toPersistence();
    
    const query = `
      UPDATE lmsact.content_map_sub_details
      SET
        content_map_sem_details_id = $2,
        act_subject_id = $3,
        act_subject_code = $4,
        act_subject_name = $5,
        act_subject_credits = $6,
        lms_learning_resource_id = $7,
        mapped_at = $8,
        mapped_by = $9,
        updated_at = $10,
        status = $11
      WHERE id = $1
      RETURNING
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
    `;

    try {
      const result = await this.pool.query(query, [
        data.id,
        data.contentMapSemDetailsId,
        data.actSubjectId,
        data.actSubjectCode,
        data.actSubjectName,
        data.actSubjectCredits,
        data.lmsLearningResourceId,
        data.mappedAt,
        data.mappedBy,
        data.updatedAt,
        data.status
      ]);

      if (result.rows.length === 0) {
        throw new DomainError('Content map subject details not found for update');
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to update content map subject details: ${error}`);
    }
  }

  /**
   * Delete content map subject details
   */
  public async delete(id: string): Promise<void> {
    const query = `DELETE FROM lmsact.content_map_sub_details WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new DomainError('Content map subject details not found for deletion');
      }
    } catch (error) {
      throw new DomainError(`Failed to delete content map subject details: ${error}`);
    }
  }

  /**
   * Delete all subject details for a semester
   */
  public async deleteByContentMapSemDetailsId(contentMapSemDetailsId: string): Promise<void> {
    const query = `DELETE FROM lmsact.content_map_sub_details WHERE content_map_sem_details_id = $1`;

    try {
      await this.pool.query(query, [contentMapSemDetailsId]);
    } catch (error) {
      throw new DomainError(`Failed to delete subject details by semester details ID: ${error}`);
    }
  }

  /**
   * Bulk save multiple subject details
   */
  public async bulkSave(contentMapSubDetailsList: ContentMapSubDetails[]): Promise<ContentMapSubDetails[]> {
    if (contentMapSubDetailsList.length === 0) {
      return [];
    }

    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    contentMapSubDetailsList.forEach((subDetails) => {
      const data = subDetails.toPersistence();
      // Cast the status parameter explicitly in the VALUES clause
      const valueStr = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::lmsact.content_mapping_status)`;
      console.log('🔍 DEBUG - Generated value string:', valueStr);
      values.push(valueStr);
      params.push(
        data.id,
        data.contentMapSemDetailsId,
        data.actSubjectId,
        data.actSubjectCode,
        data.actSubjectName,
        data.actSubjectCredits,
        data.lmsLearningResourceId,
        data.mappedAt,
        data.mappedBy,
        data.createdAt,
        data.updatedAt,
        data.status
      );
    });

    const query = `
      INSERT INTO lmsact.content_map_sub_details (
        id, content_map_sem_details_id, act_subject_id, act_subject_code,
        act_subject_name, act_subject_credits, lms_learning_resource_id,
        mapped_at, mapped_by, created_at, updated_at, status
      )
      VALUES ${values.join(', ')}
      RETURNING
        id,
        content_map_sem_details_id as "contentMapSemDetailsId",
        act_subject_id as "actSubjectId",
        act_subject_code as "actSubjectCode",
        act_subject_name as "actSubjectName",
        act_subject_credits as "actSubjectCredits",
        lms_learning_resource_id as "lmsLearningResourceId",
        mapped_at as "mappedAt",
        mapped_by as "mappedBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        status
    `;

    console.log('🔍 DEBUG - Final query:', query.substring(0, 500));
    console.log('🔍 DEBUG - Params count:', params.length);
    console.log('🔍 DEBUG - Params:', JSON.stringify(params.slice(0, 12))); // Log first record's params

    try {
      console.log('🔍 DEBUG - Executing INSERT query...');
      const result = await this.pool.query(query, params);
      console.log('🔍 DEBUG - INSERT successful, inserted', result.rows.length, 'rows');
      return result.rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('🔍 DEBUG - Error in bulkSave:', error);
      throw new DomainError(`Failed to bulk save content map subject details: ${error}`);
    }
  }

  /**
   * Bulk update multiple subject details
   * Note: This method does NOT create its own transaction - it uses the existing pool connection
   * If you need transaction support, call this from within withTransaction()
   */
  public async bulkUpdate(contentMapSubDetailsList: ContentMapSubDetails[]): Promise<ContentMapSubDetails[]> {
    if (contentMapSubDetailsList.length === 0) {
      return [];
    }

    try {
      const updatedEntities: ContentMapSubDetails[] = [];

      for (const subDetails of contentMapSubDetailsList) {
        const updated = await this.update(subDetails);
        updatedEntities.push(updated);
      }

      return updatedEntities;
    } catch (error) {
      throw new DomainError(`Failed to bulk update content map subject details: ${error}`);
    }
  }

  /**
   * Execute operation within transaction
   */
  public async withTransaction<T>(operation: (repository: IContentMapSubDetailsRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionRepo = new ContentMapSubDetailsRepository(client as any);
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
  private buildWhereClause(filter: ContentMapSubDetailsFilter): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.contentMapSemDetailsId) {
      conditions.push(`content_map_sem_details_id = $${paramIndex++}`);
      params.push(filter.contentMapSemDetailsId);
    }

    if (filter.actSubjectId) {
      conditions.push(`act_subject_id = $${paramIndex++}`);
      params.push(filter.actSubjectId);
    }

    if (filter.lmsLearningResourceId) {
      conditions.push(`lms_learning_resource_id = $${paramIndex++}`);
      params.push(filter.lmsLearningResourceId);
    }

    if (filter.mappedBy) {
      conditions.push(`mapped_by = $${paramIndex++}`);
      params.push(filter.mappedBy);
    }

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }

    if (filter.isMapped !== undefined) {
      if (filter.isMapped) {
        conditions.push(`lms_learning_resource_id IS NOT NULL`);
      } else {
        conditions.push(`lms_learning_resource_id IS NULL`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, params };
  }

  /**
   * Map database row to domain entity
   */
  private mapRowToEntity(row: any): ContentMapSubDetails {
    const props: ContentMapSubDetailsProps = {
      id: row.id,
      contentMapSemDetailsId: row.contentMapSemDetailsId,
      actSubjectId: row.actSubjectId,
      actSubjectCode: row.actSubjectCode,
      actSubjectName: row.actSubjectName,
      actSubjectCredits: row.actSubjectCredits,
      lmsLearningResourceId: row.lmsLearningResourceId,
      mappedAt: row.mappedAt,
      mappedBy: row.mappedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.status
    };

    return ContentMapSubDetails.fromPersistence(props);
  }
}
