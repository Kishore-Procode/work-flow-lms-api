/**
 * Batch Management Service
 * 
 * Comprehensive service for managing student batches by graduation year
 * following MNC enterprise standards for educational data management.
 * 
 * Features:
 * - Batch creation and management (e.g., "Batch 2026")
 * - Student count tracking per batch/department
 * - Accurate progress calculations
 * - Department-wise batch analytics
 * - Enrollment capacity management
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { appLogger } from '../../../utils/logger';

export interface StudentBatch {
  id: string;
  batchYear: number;
  departmentId: string;
  totalStudents: number;
  enrolledStudents: number;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  departmentName?: string;
  collegeName?: string;
  collegeId?: string;
}

export interface CreateBatchRequest {
  batchYear: number;
  departmentId: string;
  totalStudents: number;
}

export interface UpdateBatchRequest {
  totalStudents?: number;
  enrolledStudents?: number;
}

export interface BatchAnalytics {
  batchId: string;
  batchYear: number;
  departmentName: string;
  collegeName: string;
  totalStudents: number;
  enrolledStudents: number;
  progressPercentage: number;
  resourcesAssigned: number;
  resourcesstarted: number;
  learningPercentage: number;
}

/**
 * Batch Management Service Class
 */
export class BatchService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Create a new student batch
   */
  async createBatch(batchData: CreateBatchRequest, createdBy: string): Promise<StudentBatch> {
    try {
      const { batchYear, departmentId, totalStudents } = batchData;

      // Validate batch year (should be current year + 4 or later for new batches)
      const currentYear = new Date().getFullYear();
      if (batchYear < currentYear + 2) {
        throw new Error(`Batch year must be at least ${currentYear + 2} for new batches`);
      }

      // Check if batch already exists for this department
      const existingBatch = await this.getBatchByYearAndDepartment(batchYear, departmentId);
      if (existingBatch) {
        throw new Error(`Batch ${batchYear} already exists for this department`);
      }

      // Verify department exists
      const departmentQuery = `
        SELECT d.id, d.name, c.name as college_name, c.id as college_id
        FROM departments d
        JOIN colleges c ON d.college_id = c.id
        WHERE d.id = $1
      `;
      const departmentResult = await this.db.query(departmentQuery, [departmentId]);
      
      if (departmentResult.rows.length === 0) {
        throw new Error('Department not found');
      }

      // Create batch
      const insertQuery = `
        INSERT INTO student_batches (batch_year, department_id, total_students, enrolled_students)
        VALUES ($1, $2, $3, 0)
        RETURNING *
      `;

      const result = await this.db.query(insertQuery, [batchYear, departmentId, totalStudents]);
      const batch = result.rows[0];

      // Log batch creation
      appLogger.info('Student batch created', {
        batchId: batch.id,
        batchYear,
        departmentId,
        totalStudents,
        createdBy,
      });

      return this.formatBatchRecord(batch);
    } catch (error) {
      appLogger.error('Failed to create batch', {
        error,
        batchData,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Get batch by year and department
   */
  async getBatchByYearAndDepartment(batchYear: number, departmentId: string): Promise<StudentBatch | null> {
    try {
      const query = `
        SELECT sb.*, d.name as department_name, c.name as college_name, c.id as college_id
        FROM student_batches sb
        JOIN departments d ON sb.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        WHERE sb.batch_year = $1 AND sb.department_id = $2
      `;

      const result = await this.db.query(query, [batchYear, departmentId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.formatBatchRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to get batch by year and department', {
        error,
        batchYear,
        departmentId,
      });
      throw error;
    }
  }

  /**
   * Get all batches for a department
   */
  async getBatchesByDepartment(departmentId: string): Promise<StudentBatch[]> {
    try {
      const query = `
        SELECT sb.*, d.name as department_name, c.name as college_name, c.id as college_id
        FROM student_batches sb
        JOIN departments d ON sb.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        WHERE sb.department_id = $1
        ORDER BY sb.batch_year DESC
      `;

      const result = await this.db.query(query, [departmentId]);
      return result.rows.map(row => this.formatBatchRecord(row));
    } catch (error) {
      appLogger.error('Failed to get batches by department', {
        error,
        departmentId,
      });
      throw error;
    }
  }

  /**
   * Get all batches for a college
   */
  async getBatchesByCollege(collegeId: string): Promise<StudentBatch[]> {
    try {
      const query = `
        SELECT sb.*, d.name as department_name, c.name as college_name, c.id as college_id
        FROM student_batches sb
        JOIN departments d ON sb.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        WHERE c.id = $1
        ORDER BY sb.batch_year DESC, d.name ASC
      `;

      const result = await this.db.query(query, [collegeId]);
      return result.rows.map(row => this.formatBatchRecord(row));
    } catch (error) {
      appLogger.error('Failed to get batches by college', {
        error,
        collegeId,
      });
      throw error;
    }
  }

  /**
   * Update batch information
   */
  async updateBatch(batchId: string, updateData: UpdateBatchRequest, updatedBy: string): Promise<StudentBatch> {
    try {
      const { totalStudents, enrolledStudents } = updateData;

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (totalStudents !== undefined) {
        updateFields.push(`total_students = $${paramCount}`);
        values.push(totalStudents);
        paramCount++;
      }

      if (enrolledStudents !== undefined) {
        updateFields.push(`enrolled_students = $${paramCount}`);
        values.push(enrolledStudents);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(batchId);

      const query = `
        UPDATE student_batches 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const batch = result.rows[0];

      // Log batch update
      appLogger.info('Student batch updated', {
        batchId,
        updateData,
        updatedBy,
      });

      return this.formatBatchRecord(batch);
    } catch (error) {
      appLogger.error('Failed to update batch', {
        error,
        batchId,
        updateData,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Increment enrolled students count
   */
  async incrementEnrolledStudents(batchId: string): Promise<StudentBatch> {
    try {
      const query = `
        UPDATE student_batches 
        SET enrolled_students = enrolled_students + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.db.query(query, [batchId]);
      
      if (result.rows.length === 0) {
        throw new Error('Batch not found');
      }

      return this.formatBatchRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to increment enrolled students', {
        error,
        batchId,
      });
      throw error;
    }
  }

  /**
   * Decrement enrolled students count
   */
  async decrementEnrolledStudents(batchId: string): Promise<StudentBatch> {
    try {
      const query = `
        UPDATE student_batches 
        SET enrolled_students = GREATEST(enrolled_students - 1, 0), updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.db.query(query, [batchId]);
      
      if (result.rows.length === 0) {
        throw new Error('Batch not found');
      }

      return this.formatBatchRecord(result.rows[0]);
    } catch (error) {
      appLogger.error('Failed to decrement enrolled students', {
        error,
        batchId,
      });
      throw error;
    }
  }

  /**
   * Get batch analytics with resource assignment data
   */
  async getBatchAnalytics(batchId: string): Promise<BatchAnalytics> {
    try {
      const query = `
        SELECT 
          sb.id as batch_id,
          sb.batch_year,
          sb.total_students,
          sb.enrolled_students,
          d.name as department_name,
          c.name as college_name,
          COALESCE(resource_stats.resources_assigned, 0) as resources_assigned,
          COALESCE(resource_stats.resources_started, 0) as resources_started
        FROM student_batches sb
        JOIN departments d ON sb.department_id = d.id
        JOIN colleges c ON d.college_id = c.id
        LEFT JOIN (
          SELECT 
            u.batch_id,
            COUNT(t.id) as resources_assigned,
            COUNT(CASE WHEN t.status IN ('started', 'healthy', 'monitoring') THEN 1 END) as resources_started
          FROM users u
          LEFT JOIN resources t ON u.id = t.assigned_student_id
          WHERE u.batch_id IS NOT NULL
          GROUP BY u.batch_id
        ) resource_stats ON sb.id = resource_stats.batch_id
        WHERE sb.id = $1
      `;

      const result = await this.db.query(query, [batchId]);
      
      if (result.rows.length === 0) {
        throw new Error('Batch not found');
      }

      const row = result.rows[0];
      
      const progressPercentage = row.total_students > 0 
        ? Math.round((row.enrolled_students / row.total_students) * 100)
        : 0;

      const learningPercentage = row.resources_assigned > 0
        ? Math.round((row.resources_started / row.resources_assigned) * 100)
        : 0;

      return {
        batchId: row.batch_id,
        batchYear: row.batch_year,
        departmentName: row.department_name,
        collegeName: row.college_name,
        totalStudents: row.total_students,
        enrolledStudents: row.enrolled_students,
        progressPercentage,
        resourcesAssigned: row.resources_assigned,
        resourcesstarted: row.resources_started,
        learningPercentage,
      };
    } catch (error) {
      appLogger.error('Failed to get batch analytics', {
        error,
        batchId,
      });
      throw error;
    }
  }

  /**
   * Get all available batch years
   */
  async getAvailableBatchYears(): Promise<number[]> {
    try {
      const query = `
        SELECT DISTINCT batch_year
        FROM student_batches
        ORDER BY batch_year DESC
      `;

      const result = await this.db.query(query);
      return result.rows.map(row => row.batch_year);
    } catch (error) {
      appLogger.error('Failed to get available batch years', { error });
      throw error;
    }
  }

  /**
   * Delete a batch (only if no students are enrolled)
   */
  async deleteBatch(batchId: string, deletedBy: string): Promise<boolean> {
    try {
      // Check if any students are enrolled in this batch
      const studentCheckQuery = `
        SELECT COUNT(*) as student_count
        FROM users
        WHERE batch_id = $1
      `;

      const studentResult = await this.db.query(studentCheckQuery, [batchId]);
      const studentCount = parseInt(studentResult.rows[0].student_count);

      if (studentCount > 0) {
        throw new Error(`Cannot delete batch with ${studentCount} enrolled students`);
      }

      // Delete the batch
      const deleteQuery = `
        DELETE FROM student_batches
        WHERE id = $1
      `;

      const result = await this.db.query(deleteQuery, [batchId]);
      const deleted = result.rowCount > 0;

      if (deleted) {
        appLogger.info('Student batch deleted', {
          batchId,
          deletedBy,
        });
      }

      return deleted;
    } catch (error) {
      appLogger.error('Failed to delete batch', {
        error,
        batchId,
        deletedBy,
      });
      throw error;
    }
  }

  /**
   * Format batch record for consistent output
   */
  private formatBatchRecord(row: any): StudentBatch {
    return {
      id: row.id,
      batchYear: row.batch_year,
      departmentId: row.department_id,
      totalStudents: row.total_students,
      enrolledStudents: row.enrolled_students,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      departmentName: row.department_name,
      collegeName: row.college_name,
      collegeId: row.college_id,
    };
  }
}

// Export singleton instance
export const batchService = new BatchService(require('../../../config/database').pool);
