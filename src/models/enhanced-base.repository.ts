/**
 * Enhanced Base Repository
 * 
 * Advanced base repository with comprehensive pagination, filtering, sorting,
 * and security features following enterprise standards.
 * 
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { appLogger } from '../utils/logger';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface EnhancedPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value?: any;
  values?: any[];
}

export interface EnhancedPaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: {
    applied: FilterCondition[];
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

/**
 * Enhanced Base Repository Class
 */
export abstract class EnhancedBaseRepository<T = any> {
  protected db: Pool;
  protected abstract tableName: string;
  protected abstract primaryKey: string;
  protected allowedSortFields: string[] = ['created_at', 'updated_at'];
  protected defaultSortField: string = 'created_at';
  protected maxLimit: number = 1000;
  protected defaultLimit: number = 25;

  constructor(database?: Pool) {
    this.db = database || pool;
  }

  /**
   * Execute query with error handling and logging
   */
  protected async query<R = T>(text: string, params?: any[]): Promise<QueryResult<R>> {
    const start = Date.now();
    
    try {
      const result = await this.db.query(text, params);
      const duration = Date.now() - start;
      
      appLogger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rowCount: result.rowCount,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      appLogger.error('Database query failed', {
        error,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p),
        duration,
      });
      
      throw error;
    }
  }

  /**
   * Execute transaction with proper error handling
   */
  protected async executeTransaction<R>(
    callback: (client: PoolClient) => Promise<R>,
    options: TransactionOptions = {}
  ): Promise<R> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      
      if (options.readOnly) {
        await client.query('SET TRANSACTION READ ONLY');
      }
      
      const result = await callback(client);
      await client.query('COMMIT');
      
      appLogger.debug('Transaction completed successfully');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      appLogger.error('Transaction failed and rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause from filter conditions
   */
  protected buildWhereClause(conditions: FilterCondition[]): { clause: string; params: any[] } {
    if (conditions.length === 0) {
      return { clause: '1=1', params: [] };
    }

    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const condition of conditions) {
      const { field, operator, value, values } = condition;
      
      // Validate field name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(field)) {
        throw new Error(`Invalid field name: ${field}`);
      }

      switch (operator) {
        case 'eq':
          clauses.push(`${field} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'ne':
          clauses.push(`${field} != $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'gt':
          clauses.push(`${field} > $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'gte':
          clauses.push(`${field} >= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'lt':
          clauses.push(`${field} < $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'lte':
          clauses.push(`${field} <= $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'like':
          clauses.push(`${field} LIKE $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'ilike':
          clauses.push(`${field} ILIKE $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
          
        case 'in':
          if (values && values.length > 0) {
            const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
            clauses.push(`${field} IN (${placeholders})`);
            params.push(...values);
          }
          break;
          
        case 'not_in':
          if (values && values.length > 0) {
            const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
            clauses.push(`${field} NOT IN (${placeholders})`);
            params.push(...values);
          }
          break;
          
        case 'is_null':
          clauses.push(`${field} IS NULL`);
          break;
          
        case 'is_not_null':
          clauses.push(`${field} IS NOT NULL`);
          break;
          
        default:
          throw new Error(`Unsupported operator: ${operator}`);
      }
    }

    return {
      clause: clauses.join(' AND '),
      params,
    };
  }

  /**
   * Build search clause for multiple fields
   */
  protected buildSearchClause(search: string, searchFields: string[], startParamIndex: number = 1): { clause: string; params: any[] } {
    if (!search || !searchFields.length) {
      return { clause: '1=1', params: [] };
    }

    const searchTerm = `%${search.toLowerCase()}%`;
    const clauses = searchFields.map(field => {
      // Validate field name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(field)) {
        throw new Error(`Invalid search field: ${field}`);
      }
      return `LOWER(${field}) LIKE $${startParamIndex}`;
    });

    return {
      clause: `(${clauses.join(' OR ')})`,
      params: [searchTerm],
    };
  }

  /**
   * Validate and sanitize sort parameters
   */
  protected validateSortParams(sortBy?: string, sortOrder?: string): { sortBy: string; sortOrder: 'ASC' | 'DESC' } {
    const validatedSortBy = sortBy && this.allowedSortFields.includes(sortBy) 
      ? sortBy 
      : this.defaultSortField;
      
    const validatedSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    return { sortBy: validatedSortBy, sortOrder: validatedSortOrder };
  }

  /**
   * Enhanced find with comprehensive filtering and pagination
   */
  async findWithFilters(
    conditions: FilterCondition[] = [],
    options: EnhancedPaginationOptions = {}
  ): Promise<EnhancedPaginatedResult<T>> {
    const {
      page = 1,
      limit = this.defaultLimit,
      sortBy,
      sortOrder,
      search,
      searchFields = [],
    } = options;

    // Validate and sanitize parameters
    const validatedLimit = Math.min(Math.max(1, limit), this.maxLimit);
    const validatedPage = Math.max(1, page);
    const offset = (validatedPage - 1) * validatedLimit;
    const { sortBy: validatedSortBy, sortOrder: validatedSortOrder } = this.validateSortParams(sortBy, sortOrder);

    // Build WHERE clause
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(conditions);
    const { clause: searchClause, params: searchParams } = this.buildSearchClause(search, searchFields, whereParams.length + 1);

    // Combine conditions
    const finalWhereClause = search && searchFields.length > 0
      ? `${whereClause} AND ${searchClause}`
      : whereClause;
    const finalParams = [...whereParams, ...searchParams];

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${finalWhereClause}`;
    const countResult = await this.query(countQuery, finalParams);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      WHERE ${finalWhereClause}
      ORDER BY ${validatedSortBy} ${validatedSortOrder}
      LIMIT $${finalParams.length + 1} OFFSET $${finalParams.length + 2}
    `;
    const dataResult = await this.query<T>(dataQuery, [...finalParams, validatedLimit, offset]);

    const totalPages = Math.ceil(total / validatedLimit);

    return {
      data: dataResult.rows,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1,
      },
      filters: {
        applied: conditions,
        search,
        sortBy: validatedSortBy,
        sortOrder: validatedSortOrder.toLowerCase(),
      },
    };
  }

  /**
   * Find by ID with error handling
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create record with transaction support
   */
  async create(data: Partial<T>): Promise<T> {
    return this.executeTransaction(async (client) => {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
      const values = Object.values(data);

      const query = `
        INSERT INTO ${this.tableName} (${fields})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0];
    });
  }

  /**
   * Update record with optimistic locking
   */
  async update(id: string, data: Partial<T>, expectedVersion?: number): Promise<T | null> {
    return this.executeTransaction(async (client) => {
      // Check current version if optimistic locking is enabled
      if (expectedVersion !== undefined) {
        const versionCheck = await client.query(
          `SELECT version FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
          [id]
        );
        
        if (versionCheck.rows.length === 0) {
          throw new Error('Record not found');
        }
        
        if (versionCheck.rows[0].version !== expectedVersion) {
          throw new Error('Record has been modified by another user');
        }
      }

      const fields = Object.keys(data);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(data)];

      // Add version increment if version field exists
      const versionClause = fields.includes('version') ? '' : ', version = COALESCE(version, 0) + 1';
      const updatedAtClause = fields.includes('updated_at') ? '' : ', updated_at = CURRENT_TIMESTAMP';

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}${versionClause}${updatedAtClause}
        WHERE ${this.primaryKey} = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    });
  }

  /**
   * Soft delete record
   */
  async softDelete(id: string): Promise<boolean> {
    return this.executeTransaction(async (client) => {
      const query = `
        UPDATE ${this.tableName}
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL
      `;

      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    });
  }

  /**
   * Hard delete record
   */
  async delete(id: string): Promise<boolean> {
    return this.executeTransaction(async (client) => {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    });
  }
}
