import { BaseRepository, PaginationOptions } from '../../../models/base.repository';

export interface MonitoringRecord {
  id: string;
  resourceId: string;
  studentId: string;
  monitoringDate: string;
  heightCm?: number;
  healthStatus?: string;
  notes?: string;
  photoUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface CreateMonitoringData {
  resourceId: string;
  studentId: string;
  monitoringDate: Date;
  heightCm?: number;
  healthStatus?: string;
  notes?: string;
  photoUrl?: string;
}

export class MonitoringRepository extends BaseRepository<MonitoringRecord> {
  constructor() {
    super('progress_tracking_records');
  }

  /**
   * Get monitoring records by resource ID
   */
  async getMonitoringRecordsByresource(
    resourceId: string, 
    options: PaginationOptions & { limit?: number } = {}
  ): Promise<MonitoringRecord[]> {
    const { limit = 10 } = options;
    
    const query = `
      SELECT * FROM progress_tracking_records 
      WHERE resource_id = $1 
      ORDER BY monitoring_date DESC, created_at DESC 
      LIMIT $2
    `;
    
    const result = await this.query<MonitoringRecord>(query, [resourceId, limit]);
    return result.rows;
  }

  /**
   * Get monitoring records by student ID
   */
  async getMonitoringRecordsByStudent(
    studentId: string, 
    options: PaginationOptions & { limit?: number } = {}
  ): Promise<MonitoringRecord[]> {
    const { limit = 10 } = options;
    
    const query = `
      SELECT * FROM progress_tracking_records 
      WHERE student_id = $1 
      ORDER BY monitoring_date DESC, created_at DESC 
      LIMIT $2
    `;
    
    const result = await this.query<MonitoringRecord>(query, [studentId, limit]);
    return result.rows;
  }

  /**
   * Create monitoring record
   */
  async createMonitoringRecord(data: CreateMonitoringData): Promise<MonitoringRecord> {
    const query = `
      INSERT INTO progress_tracking_records (
        resource_id, student_id, monitoring_date, height_cm, health_status, notes, photo_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.resourceId,
      data.studentId,
      data.monitoringDate,
      data.heightCm || null,
      data.healthStatus || null,
      data.notes || null,
      data.photoUrl || null
    ];

    const result = await this.query<MonitoringRecord>(query, values);
    return result.rows[0];
  }

  /**
   * Get latest monitoring record for a resource
   */
  async getLatestMonitoringRecord(resourceId: string): Promise<MonitoringRecord | null> {
    const query = `
      SELECT * FROM progress_tracking_records 
      WHERE resource_id = $1 
      ORDER BY monitoring_date DESC, created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.query<MonitoringRecord>(query, [resourceId]);
    return result.rows[0] || null;
  }

  /**
   * Verify monitoring record
   */
  async verifyMonitoringRecord(recordId: string, verifiedBy: string): Promise<boolean> {
    const query = `
      UPDATE progress_tracking_records 
      SET verified_by = $2, verified_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    
    const result = await this.query(query, [recordId, verifiedBy]);
    return result.rowCount > 0;
  }
}

// Create singleton instance
export const monitoringRepository = new MonitoringRepository();
