/**
 * PostgreSQL User Repository Implementation
 * 
 * Infrastructure layer implementation of IUserRepository interface.
 * Handles PostgreSQL-specific data access operations for User entity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { IUserRepository, UserFilter, PaginatedResult } from '../../domain/repositories/IUserRepository';
import { User, UserProps } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserRole } from '../../domain/value-objects/UserRole';
import { UserStatus } from '../../domain/value-objects/UserStatus';
import { DomainError } from '../../domain/errors/DomainError';

export class PostgreSQLUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE email = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.pool.query(query, [email.value]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findWithFilters(filter: UserFilter): Promise<PaginatedResult<User>> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filter.role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(filter.role.value);
    }

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status.value);
    }

    if (filter.collegeId) {
      conditions.push(`college_id = $${paramIndex++}`);
      params.push(filter.collegeId);
    }

    if (filter.departmentId) {
      conditions.push(`department_id = $${paramIndex++}`);
      params.push(filter.departmentId);
    }

    if (filter.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate pagination
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || 25, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataResult = await this.pool.query(dataQuery, [...params, limit, offset]);
    const users = dataResult.rows.map(row => this.mapRowToUser(row));

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findByRole(role: UserRole, page = 1, limit = 25): Promise<PaginatedResult<User>> {
    return this.findWithFilters({ role, page, limit });
  }

  async findByCollege(collegeId: string, page = 1, limit = 25): Promise<PaginatedResult<User>> {
    return this.findWithFilters({ collegeId, page, limit });
  }

  async findByDepartment(departmentId: string, page = 1, limit = 25): Promise<PaginatedResult<User>> {
    return this.findWithFilters({ departmentId, page, limit });
  }

  async findByStatus(status: UserStatus, page = 1, limit = 25): Promise<PaginatedResult<User>> {
    return this.findWithFilters({ status, page, limit });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const query = `
      SELECT 1 FROM users 
      WHERE email = $1 AND deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [email.value]);
    return result.rows.length > 0;
  }

  async existsByRollNumber(rollNumber: string, collegeId: string, departmentId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM users 
      WHERE roll_number = $1 AND college_id = $2 AND department_id = $3 AND deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [rollNumber, collegeId, departmentId]);
    return result.rows.length > 0;
  }

  async save(user: User): Promise<User> {
    const userData = user.toPersistence();
    
    const query = `
      INSERT INTO users (
        id, email, name, phone, role, status, college_id, department_id,
        roll_number, year, section, password_hash, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;
    
    const params = [
      userData.id,
      userData.email,
      userData.name,
      userData.phone,
      userData.role,
      userData.status,
      userData.college_id,
      userData.department_id,
      userData.roll_number,
      userData.year,
      userData.section,
      userData.password_hash,
      userData.created_at,
      userData.updated_at,
    ];
    
    try {
      const result = await this.pool.query(query, params);
      return this.mapRowToUser(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint?.includes('email')) {
          throw DomainError.conflict('Email already exists');
        }
        if (error.constraint?.includes('roll_number')) {
          throw DomainError.conflict('Roll number already exists');
        }
      }
      throw error;
    }
  }

  async update(user: User): Promise<User> {
    const userData = user.toPersistence();
    
    const query = `
      UPDATE users SET
        email = $2, name = $3, phone = $4, role = $5, status = $6,
        college_id = $7, department_id = $8, roll_number = $9, year = $10,
        section = $11, password_hash = $12, updated_at = $13
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const params = [
      userData.id,
      userData.email,
      userData.name,
      userData.phone,
      userData.role,
      userData.status,
      userData.college_id,
      userData.department_id,
      userData.roll_number,
      userData.year,
      userData.section,
      userData.password_hash,
      userData.updated_at,
    ];
    
    try {
      const result = await this.pool.query(query, params);
      
      if (result.rows.length === 0) {
        throw DomainError.notFound('User');
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint?.includes('email')) {
          throw DomainError.conflict('Email already exists');
        }
        if (error.constraint?.includes('roll_number')) {
          throw DomainError.conflict('Roll number already exists');
        }
      }
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE users SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
    const result = await this.pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  async countByRole(role: UserRole): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE role = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [role.value]);
    return parseInt(result.rows[0].count, 10);
  }

  async countByStatus(status: UserStatus): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE status = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [status.value]);
    return parseInt(result.rows[0].count, 10);
  }

  async countByCollege(collegeId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE college_id = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [collegeId]);
    return parseInt(result.rows[0].count, 10);
  }

  async countByDepartment(departmentId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM users WHERE department_id = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [departmentId]);
    return parseInt(result.rows[0].count, 10);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async findPendingUsersOlderThan(days: number): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '${days} days'
        AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  async search(query: string, page = 1, limit = 25): Promise<PaginatedResult<User>> {
    return this.findWithFilters({ search: query, page, limit });
  }

  async getStatistics(): Promise<{
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    byCollege: Record<string, number>;
    recentRegistrations: number;
  }> {
    // This would be implemented with multiple queries or a complex query
    // For brevity, returning a simplified version
    const total = await this.count();
    
    return {
      total,
      byRole: {},
      byStatus: {},
      byCollege: {},
      recentRegistrations: 0,
    };
  }

  async saveMany(users: User[]): Promise<User[]> {
    // Implementation would use batch insert
    const savedUsers: User[] = [];
    for (const user of users) {
      savedUsers.push(await this.save(user));
    }
    return savedUsers;
  }

  async updateMany(users: User[]): Promise<User[]> {
    // Implementation would use batch update
    const updatedUsers: User[] = [];
    for (const user of users) {
      updatedUsers.push(await this.update(user));
    }
    return updatedUsers;
  }

  async deleteMany(ids: string[]): Promise<boolean> {
    const query = `
      UPDATE users SET deleted_at = NOW()
      WHERE id = ANY($1) AND deleted_at IS NULL
    `;
    
    const result = await this.pool.query(query, [ids]);
    return result.rowCount > 0;
  }

  async withTransaction<T>(operation: (repository: IUserRepository) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const transactionalRepo = new PostgreSQLUserRepository(client as any);
      const result = await operation(transactionalRepo);
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
   * Map database row to User domain entity
   */
  private mapRowToUser(row: any): User {
    const userProps: UserProps = {
      id: row.id,
      email: Email.create(row.email),
      name: row.name,
      phone: row.phone,
      role: UserRole.create(row.role),
      status: UserStatus.create(row.status),
      collegeId: row.college_id,
      departmentId: row.department_id,
      rollNumber: row.roll_number,
      year: row.year,
      section: row.section,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return User.fromPersistence(userProps);
  }
}
