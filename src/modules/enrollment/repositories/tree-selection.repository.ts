import { BaseRepository } from '../../../models/base.repository';

export interface resourceselection {
  id: string;
  studentId: string;
  resourceId: string;
  selectionDate: string;
  learningInstructions?: string;
  isstarted: boolean;
  learningDate?: string;
  learningImageId?: string;
  status: 'selected' | 'started' | 'monitoring' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateresourceselectionData {
  studentId: string;
  resourceId: string;
  learningInstructions?: string;
  status?: 'selected' | 'started' | 'monitoring' | 'completed';
}

export interface UpdateresourceselectionData {
  learningInstructions?: string;
  isstarted?: boolean;
  learningDate?: Date;
  learningImageId?: string;
  status?: 'selected' | 'started' | 'monitoring' | 'completed';
}

class ResourceSelectionRepository extends BaseRepository<resourceselection> {
  constructor() {
    super('resource_selections');
  }
  /**
   * Create resource selection
   */
  async createresourceselection(selectionData: CreateresourceselectionData): Promise<resourceselection> {
    const query = `
      INSERT INTO resource_selections (
        student_id, resource_id, learning_instructions, status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      selectionData.studentId,
      selectionData.resourceId,
      selectionData.learningInstructions,
      selectionData.status || 'selected'
    ];

    const result = await this.query<resourceselection>(query, values);
    return result.rows[0];
  }

  /**
   * Get resource selection by ID
   */
  async getresourceselectionById(id: string): Promise<resourceselection | null> {
    const query = 'SELECT * FROM resource_selections WHERE id = $1';
    const result = await this.query<resourceselection>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get student's resource selection
   */
  async getStudentresourceselection(studentId: string): Promise<resourceselection | null> {
    const query = 'SELECT * FROM resource_selections WHERE student_id = $1';
    const result = await this.query<resourceselection>(query, [studentId]);
    return result.rows[0] || null;
  }

  /**
   * Get student's resource selection with resource details
   */
  async getStudentresourceselectionWithDetails(studentId: string): Promise<any | null> {
    const query = `
      SELECT
        ts.*,
        t.category, t.resource_code, t.learning_context as location_description, t.latitude, t.longitude,
        ti.media_url as learning_image_url,
        ti.caption as learning_image_caption
      FROM resource_selections ts
      JOIN learning_resources t ON ts.resource_id = t.id
      LEFT JOIN resource_media ti ON ts.learning_image_id = ti.id
      WHERE ts.student_id = $1
    `;

    const result = await this.query(query, [studentId]);
    return result.rows[0] || null;
  }

  /**
   * Get resource selections with details
   */
  async getresourceselectionsWithDetails(filters: {
    status?: string;
    collegeId?: string;
    departmentId?: string;
    studentId?: string;
  }): Promise<any[]> {
    let query = `
      SELECT
        ts.*,
        t.category, t.resource_code, t.learning_context as location_description,
        u.name as student_name, u.email as student_email,
        c.name as college_name,
        d.name as department_name,
        ti.media_url as learning_image_url
      FROM resource_selections ts
      JOIN learning_resources t ON ts.resource_id = t.id
      JOIN users u ON ts.student_id = u.id
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN resource_media ti ON ts.learning_image_id = ti.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND ts.status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.studentId) {
      query += ` AND ts.student_id = $${paramIndex}`;
      values.push(filters.studentId);
      paramIndex++;
    }

    if (filters.collegeId) {
      query += ` AND u.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    if (filters.departmentId) {
      query += ` AND u.department_id = $${paramIndex}`;
      values.push(filters.departmentId);
      paramIndex++;
    }

    query += ' ORDER BY ts.selection_date DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Update resource selection
   */
  async updateresourceselection(id: string, updateData: UpdateresourceselectionData): Promise<resourceselection | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getresourceselectionById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE resource_selections
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<resourceselection>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete resource selection
   */
  async deleteresourceselection(id: string): Promise<boolean> {
    const query = 'DELETE FROM resource_selections WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get selection statistics
   */
  async getSelectionStatistics(filters: {
    collegeId?: string;
    departmentId?: string;
  }): Promise<any> {
    let query = `
      SELECT 
        ts.status,
        COUNT(*) as count,
        COUNT(CASE WHEN ts.is_started = true THEN 1 END) as started_count
      FROM resource_selections ts
      JOIN users u ON ts.student_id = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.collegeId) {
      query += ` AND u.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    if (filters.departmentId) {
      query += ` AND u.department_id = $${paramIndex}`;
      values.push(filters.departmentId);
      paramIndex++;
    }

    query += ' GROUP BY ts.status ORDER BY count DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Get learning progress by date range
   */
  async getlearningProgress(filters: {
    startDate?: string;
    endDate?: string;
    collegeId?: string;
    departmentId?: string;
  }): Promise<any[]> {
    let query = `
      SELECT 
        DATE(ts.learning_date) as learning_date,
        COUNT(*) as resources_started,
        COUNT(DISTINCT ts.student_id) as students_participated
      FROM resource_selections ts
      JOIN users u ON ts.student_id = u.id
      WHERE ts.is_started = true
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      query += ` AND ts.learning_date >= $${paramIndex}`;
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND ts.learning_date <= $${paramIndex}`;
      values.push(filters.endDate);
      paramIndex++;
    }

    if (filters.collegeId) {
      query += ` AND u.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    if (filters.departmentId) {
      query += ` AND u.department_id = $${paramIndex}`;
      values.push(filters.departmentId);
      paramIndex++;
    }

    query += ' GROUP BY DATE(ts.learning_date) ORDER BY learning_date DESC';

    const result = await this.query(query, values);
    return result.rows;
  }
}

export const resourceselectionRepository = new ResourceSelectionRepository();
