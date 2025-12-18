import { Pool } from 'pg';
import { pool } from '../../../config/database';

export interface resourceMonitoringRecord {
  id: string;
  resourceId: string;
  studentId: string;
  monitoringDate: Date;
  heightCm?: number;
  trunkDiameterCm?: number;
  healthStatus: string;
  watered: boolean;
  fertilized: boolean;
  pruned: boolean;
  pestIssues?: string;
  diseaseIssues?: string;
  generalNotes?: string;
  weatherConditions?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface CreateMonitoringRecordData {
  resourceId: string;
  studentId: string;
  monitoringDate: Date;
  heightCm?: number;
  trunkDiameterCm?: number;
  healthStatus: string;
  watered?: boolean;
  fertilized?: boolean;
  pruned?: boolean;
  pestIssues?: string;
  diseaseIssues?: string;
  generalNotes?: string;
  weatherConditions?: string;
}

export interface UpdateMonitoringRecordData {
  heightCm?: number;
  trunkDiameterCm?: number;
  healthStatus?: string;
  watered?: boolean;
  fertilized?: boolean;
  pruned?: boolean;
  pestIssues?: string;
  diseaseIssues?: string;
  generalNotes?: string;
  weatherConditions?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
}

class ProgressTrackingRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createMonitoringRecord(data: CreateMonitoringRecordData): Promise<resourceMonitoringRecord> {
    const query = `
      INSERT INTO progress_tracking_records (
        resource_id, student_id, monitoring_date, height_cm, trunk_diameter_cm,
        health_status, watered, fertilized, pruned, pest_issues, disease_issues,
        general_notes, weather_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      data.resourceId,
      data.studentId,
      data.monitoringDate,
      data.heightCm,
      data.trunkDiameterCm,
      data.healthStatus,
      data.watered || false,
      data.fertilized || false,
      data.pruned || false,
      data.pestIssues,
      data.diseaseIssues,
      data.generalNotes,
      data.weatherConditions
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getMonitoringRecordById(id: string): Promise<resourceMonitoringRecord | null> {
    const query = `
      SELECT tmr.*, 
             t.resource_code, t.category,
             u.name as student_name,
             v.name as verified_by_name
      FROM progress_tracking_records tmr
      LEFT JOIN resources t ON tmr.resource_id = t.id
      LEFT JOIN users u ON tmr.student_id = u.id
      LEFT JOIN users v ON tmr.verified_by = v.id
      WHERE tmr.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getMonitoringRecordsByresource(resourceId: string): Promise<resourceMonitoringRecord[]> {
    const query = `
      SELECT tmr.*, 
             u.name as student_name,
             v.name as verified_by_name
      FROM progress_tracking_records tmr
      LEFT JOIN users u ON tmr.student_id = u.id
      LEFT JOIN users v ON tmr.verified_by = v.id
      WHERE tmr.resource_id = $1
      ORDER BY tmr.monitoring_date DESC, tmr.created_at DESC
    `;

    const result = await this.pool.query(query, [resourceId]);
    return result.rows;
  }

  async getMonitoringRecordsByStudent(studentId: string): Promise<resourceMonitoringRecord[]> {
    const query = `
      SELECT tmr.*, 
             t.resource_code, t.category, t.location_description,
             v.name as verified_by_name
      FROM progress_tracking_records tmr
      LEFT JOIN resources t ON tmr.resource_id = t.id
      LEFT JOIN users v ON tmr.verified_by = v.id
      WHERE tmr.student_id = $1
      ORDER BY tmr.monitoring_date DESC, tmr.created_at DESC
    `;

    const result = await this.pool.query(query, [studentId]);
    return result.rows;
  }

  async getMonitoringRecordsByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: {
      collegeId?: string;
      departmentId?: string;
      studentId?: string;
      resourceId?: string;
    }
  ): Promise<resourceMonitoringRecord[]> {
    let query = `
      SELECT tmr.*, 
             t.resource_code, t.category, t.location_description,
             u.name as student_name,
             v.name as verified_by_name,
             c.name as college_name,
             d.name as department_name
      FROM progress_tracking_records tmr
      LEFT JOIN resources t ON tmr.resource_id = t.id
      LEFT JOIN users u ON tmr.student_id = u.id
      LEFT JOIN users v ON tmr.verified_by = v.id
      LEFT JOIN colleges c ON t.college_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE tmr.monitoring_date BETWEEN $1 AND $2
    `;

    const values: any[] = [startDate, endDate];
    let paramCount = 2;

    if (filters?.collegeId) {
      query += ` AND t.college_id = $${++paramCount}`;
      values.push(filters.collegeId);
    }

    if (filters?.departmentId) {
      query += ` AND t.department_id = $${++paramCount}`;
      values.push(filters.departmentId);
    }

    if (filters?.studentId) {
      query += ` AND tmr.student_id = $${++paramCount}`;
      values.push(filters.studentId);
    }

    if (filters?.resourceId) {
      query += ` AND tmr.resource_id = $${++paramCount}`;
      values.push(filters.resourceId);
    }

    query += ` ORDER BY tmr.monitoring_date DESC, tmr.created_at DESC`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async updateMonitoringRecord(id: string, data: UpdateMonitoringRecordData): Promise<resourceMonitoringRecord | null> {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramCount}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE progress_tracking_records 
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteMonitoringRecord(id: string): Promise<boolean> {
    const query = 'DELETE FROM progress_tracking_records WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async verifyMonitoringRecord(id: string, verifiedBy: string): Promise<resourceMonitoringRecord | null> {
    const query = `
      UPDATE progress_tracking_records 
      SET verified_by = $1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [verifiedBy, id]);
    return result.rows[0] || null;
  }

  async getMonitoringStats(filters?: {
    collegeId?: string;
    departmentId?: string;
    studentId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy_count,
        COUNT(CASE WHEN health_status = 'fair' THEN 1 END) as fair_count,
        COUNT(CASE WHEN health_status = 'poor' THEN 1 END) as poor_count,
        COUNT(CASE WHEN health_status = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN verified_by IS NOT NULL THEN 1 END) as verified_count,
        AVG(height_cm) as avg_height,
        AVG(trunk_diameter_cm) as avg_trunk_diameter
      FROM progress_tracking_records tmr
      LEFT JOIN resources t ON tmr.resource_id = t.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 0;

    if (filters?.collegeId) {
      query += ` AND t.college_id = $${++paramCount}`;
      values.push(filters.collegeId);
    }

    if (filters?.departmentId) {
      query += ` AND t.department_id = $${++paramCount}`;
      values.push(filters.departmentId);
    }

    if (filters?.studentId) {
      query += ` AND tmr.student_id = $${++paramCount}`;
      values.push(filters.studentId);
    }

    if (filters?.startDate) {
      query += ` AND tmr.monitoring_date >= $${++paramCount}`;
      values.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND tmr.monitoring_date <= $${++paramCount}`;
      values.push(filters.endDate);
    }

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}

export const progressTrackingRepository = new ProgressTrackingRepository();
