/**
 * PostgreSQL Course Type Repository
 * 
 * Infrastructure layer implementation of ICourseTypeRepository.
 * Handles database operations for course type data.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { ICourseTypeRepository, CourseType } from '../../domain/repositories/ICourseTypeRepository';
import { DomainError } from '../../domain/errors/DomainError';

export class PostgreSQLCourseTypeRepository implements ICourseTypeRepository {
  constructor(private readonly pool: Pool) {}

  async findAllActive(): Promise<CourseType[]> {
    const query = `
      SELECT
        id,
        code,
        name,
        description,
        display_order as "displayOrder",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lmsact.course_types
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => this.mapRowToCourseType(row));
    } catch (error) {
      throw new DomainError(`Failed to get active course types: ${error}`);
    }
  }

  async findByCode(code: string): Promise<CourseType | null> {
    const query = `
      SELECT
        id,
        code,
        name,
        description,
        display_order as "displayOrder",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lmsact.course_types
      WHERE code = $1
    `;

    try {
      const result = await this.pool.query(query, [code]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCourseType(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to get course type by code: ${error}`);
    }
  }

  async findById(id: string): Promise<CourseType | null> {
    const query = `
      SELECT
        id,
        code,
        name,
        description,
        display_order as "displayOrder",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lmsact.course_types
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCourseType(result.rows[0]);
    } catch (error) {
      throw new DomainError(`Failed to get course type by ID: ${error}`);
    }
  }

  async findAll(): Promise<CourseType[]> {
    const query = `
      SELECT
        id,
        code,
        name,
        description,
        display_order as "displayOrder",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lmsact.course_types
      ORDER BY display_order ASC, name ASC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => this.mapRowToCourseType(row));
    } catch (error) {
      throw new DomainError(`Failed to get all course types: ${error}`);
    }
  }

  private mapRowToCourseType(row: any): CourseType {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || undefined,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}

