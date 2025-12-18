import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export abstract class BaseRepository<T> {
  protected pool: Pool;
  protected tableName: string;

  constructor(tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * Execute a query with parameters
   */
  protected async query<R = T>(text: string, params?: any[]): Promise<QueryResult<R>> {
    try {
      const result = await this.pool.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      console.error(`Database query error in ${this.tableName}:`, { text, params, error });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  protected async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
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
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all records with optional filtering and pagination
   */
  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    const dataResult = await this.query<T>(dataQuery, [limit, offset]);

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
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query<T>(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`;
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Count records with optional conditions
   */
  async count(whereClause?: string, params?: any[]): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }

    const result = await this.query(query, params);
    return parseInt((result.rows[0] as any)?.count || '0', 10);
  }

  /**
   * Find records with custom WHERE clause
   */
  async findWhere(whereClause: string, params?: any[], options: PaginationOptions = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await this.query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data
    const dataQuery = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${(params?.length || 0) + 1} OFFSET $${(params?.length || 0) + 2}
    `;
    const dataResult = await this.query<T>(dataQuery, [...(params || []), limit, offset]);

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
   * Execute a raw SQL query
   */
  async raw<R = any>(query: string, params?: any[]): Promise<QueryResult<R>> {
    return this.query<R>(query, params);
  }
}
