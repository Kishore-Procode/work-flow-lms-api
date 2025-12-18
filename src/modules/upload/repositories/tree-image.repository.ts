import { BaseRepository } from '../../../models/base.repository';

export interface resourceImage {
  id: string;
  resource_id: string;
  student_id: string;
  image_url: string;
  image_type: 'progress' | 'issue' | 'general';
  caption?: string;
  upload_date: string;
  file_size?: number;
  file_name?: string;
  mime_type?: string;
  created_at: string;
}

export interface CreateresourceImageData {
  resourceId: string;
  studentId: string;
  imageUrl: string;
  imageType: 'progress' | 'issue' | 'general';
  caption?: string;
  fileSize?: number;
  fileName?: string;
  mimeType?: string;
}

class ResourceImageRepository extends BaseRepository<resourceImage> {
  constructor() {
    super('resource_media');
  }
  /**
   * Create resource image record
   */
  async createresourceImage(imageData: CreateresourceImageData): Promise<resourceImage> {
    const query = `
      INSERT INTO resource_media (
        resource_id, student_id, image_url, image_type, caption, file_size, file_name, mime_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      imageData.resourceId,
      imageData.studentId,
      imageData.imageUrl,
      imageData.imageType,
      imageData.caption || null,
      imageData.fileSize || null,
      imageData.fileName || null,
      imageData.mimeType || null
    ];

    const result = await this.query<resourceImage>(query, values);
    return result.rows[0];
  }

  /**
   * Get resource image by ID
   */
  async getresourceImageById(id: string): Promise<resourceImage | null> {
    const query = 'SELECT * FROM resource_media WHERE id = $1';
    const result = await this.query<resourceImage>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get resource images
   */
  async getresourceImages(resourceId: string, imageType?: string): Promise<resourceImage[]> {
    let query = 'SELECT * FROM resource_media WHERE resource_id = $1';
    const values: any[] = [resourceId];

    if (imageType) {
      query += ' AND image_type = $2';
      values.push(imageType);
    }

    query += ' ORDER BY upload_date DESC';

    const result = await this.query<resourceImage>(query, values);
    return result.rows;
  }

  /**
   * Get resource images by student
   */
  async getresourceImagesByStudent(studentId: string, resourceId?: string, imageType?: string): Promise<resourceImage[]> {
    let query = 'SELECT * FROM resource_media WHERE student_id = $1';
    const values: any[] = [studentId];

    if (resourceId) {
      query += ' AND resource_id = $2';
      values.push(resourceId);
    }

    if (imageType) {
      query += ` AND image_type = $${values.length + 1}`;
      values.push(imageType);
    }

    query += ' ORDER BY upload_date DESC';

    const result = await this.query<resourceImage>(query, values);
    return result.rows;
  }

  /**
   * Get images with resource and student details
   */
  async getresourceImagesWithDetails(filters: {
    resourceId?: string;
    studentId?: string;
    imageType?: string;
    collegeId?: string;
    departmentId?: string;
  }): Promise<any[]> {
    let query = `
      SELECT
        ti.*,
        t.category, t.resource_code, t.learning_context as location_description,
        u.name as student_name, u.email as student_email,
        c.name as college_name,
        d.name as department_name
      FROM resource_media ti
      JOIN learning_resources t ON ti.resource_id = t.id
      JOIN users u ON ti.student_id = u.id
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.resourceId) {
      query += ` AND ti.resource_id = $${paramIndex}`;
      values.push(filters.resourceId);
      paramIndex++;
    }

    if (filters.studentId) {
      query += ` AND ti.student_id = $${paramIndex}`;
      values.push(filters.studentId);
      paramIndex++;
    }

    if (filters.imageType) {
      query += ` AND ti.image_type = $${paramIndex}`;
      values.push(filters.imageType);
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

    query += ' ORDER BY ti.upload_date DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Update resource image
   */
  async updateresourceImage(id: string, updateData: Partial<CreateresourceImageData>): Promise<resourceImage | null> {
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
      return this.getresourceImageById(id);
    }

    const query = `
      UPDATE resource_media
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<resourceImage>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete resource image
   */
  async deleteresourceImage(id: string): Promise<boolean> {
    const query = 'DELETE FROM resource_media WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get image statistics
   */
  async getImageStatistics(filters: {
    studentId?: string;
    resourceId?: string;
    collegeId?: string;
    departmentId?: string;
  }): Promise<any> {
    let query = `
      SELECT 
        ti.image_type,
        COUNT(*) as count,
        SUM(ti.file_size) as total_size
      FROM resource_media ti
      JOIN users u ON ti.student_id = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.studentId) {
      query += ` AND ti.student_id = $${paramIndex}`;
      values.push(filters.studentId);
      paramIndex++;
    }

    if (filters.resourceId) {
      query += ` AND ti.resource_id = $${paramIndex}`;
      values.push(filters.resourceId);
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

    query += ' GROUP BY ti.image_type ORDER BY count DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Get all resource images (for admin dashboard)
   */
  async getAllresourceImages(): Promise<any[]> {
    const query = `
      SELECT ti.*, t.category, t.resource_code, u.name as student_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      ORDER BY ti.upload_date DESC
    `;

    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Get resource images by college
   */
  async getresourceImagesByCollege(collegeId: string): Promise<any[]> {
    const query = `
      SELECT ti.*, t.category, t.resource_code, u.name as student_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      WHERE t.college_id = $1
      ORDER BY ti.upload_date DESC
    `;

    const result = await this.query(query, [collegeId]);
    return result.rows;
  }

  /**
   * Get resource images by department
   */
  async getresourceImagesByDepartment(departmentId: string): Promise<any[]> {
    const query = `
      SELECT ti.*, t.category, t.resource_code, u.name as student_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      WHERE t.department_id = $1
      ORDER BY ti.upload_date DESC
    `;

    const result = await this.query(query, [departmentId]);
    return result.rows;
  }

  /**
   * Get recent resource images by department within specified days
   */
  async getRecentByDepartment(departmentId: string, limit: number = 30): Promise<any[]> {
    const query = `
      SELECT
        ti.*,
        t.category,
        t.resource_code,
        t.learning_context as location_description,
        u.name as student_name,
        u.email as student_email,
        u.roll_number as student_roll_number,
        d.name as department_name,
        ay.year_name as academic_year_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      WHERE t.department_id = $1
      ORDER BY ti.upload_date DESC
      LIMIT $2
    `;

    const result = await this.query(query, [departmentId, limit]);
    return result.rows;
  }

  /**
   * Get recent resource images by college within specified limit
   */
  async getRecentByCollege(collegeId: string, limit: number = 30): Promise<any[]> {
    const query = `
      SELECT
        ti.*,
        t.category,
        t.resource_code,
        t.learning_context as location_description,
        u.name as student_name,
        u.email as student_email,
        u.roll_number as student_roll_number,
        d.name as department_name,
        ay.year_name as academic_year_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      WHERE t.college_id = $1
      ORDER BY ti.upload_date DESC
      LIMIT $2
    `;

    const result = await this.query(query, [collegeId, limit]);
    return result.rows;
  }

  /**
   * Get recent resource images from all colleges (admin view)
   */
  async getRecentresourceImages(limit: number = 30): Promise<any[]> {
    const query = `
      SELECT
        ti.*,
        t.category,
        t.resource_code,
        t.learning_context as location_description,
        u.name as student_name,
        u.email as student_email,
        u.roll_number as student_roll_number,
        d.name as department_name,
        ay.year_name as academic_year_name
      FROM resource_media ti
      LEFT JOIN learning_resources t ON ti.resource_id = t.id
      LEFT JOIN users u ON ti.student_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      ORDER BY ti.upload_date DESC
      LIMIT $1
    `;

    const result = await this.query(query, [limit]);
    return result.rows;
  }
}

export const resourceImageRepository = new ResourceImageRepository();
