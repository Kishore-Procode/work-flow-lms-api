import { BaseRepository } from '../../../models/base.repository';

export interface FileUpload {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploadType: 'resource_image' | 'profile_image' | 'document';
  relatedEntityId?: string;
  createdAt: string;
}

export interface CreateFileUploadData {
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploadType: 'resource_image' | 'profile_image' | 'document';
  relatedEntityId?: string;
}

class UploadRepository extends BaseRepository<FileUpload> {
  constructor() {
    super('file_uploads');
  }
  /**
   * Create file upload record
   */
  async createFileUpload(uploadData: CreateFileUploadData): Promise<FileUpload> {
    const query = `
      INSERT INTO file_uploads (
        original_name, stored_name, file_path, mime_type, file_size,
        uploaded_by, upload_type, related_entity_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      uploadData.originalName,
      uploadData.storedName,
      uploadData.filePath,
      uploadData.mimeType,
      uploadData.fileSize,
      uploadData.uploadedBy,
      uploadData.uploadType,
      uploadData.relatedEntityId
    ];

    const result = await this.query<FileUpload>(query, values);
    return result.rows[0];
  }

  /**
   * Get file upload by ID
   */
  async getFileUploadById(id: string): Promise<FileUpload | null> {
    const query = 'SELECT * FROM file_uploads WHERE id = $1';
    const result = await this.query<FileUpload>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get file uploads by user
   */
  async getFileUploadsByUser(userId: string, uploadType?: string): Promise<FileUpload[]> {
    let query = 'SELECT * FROM file_uploads WHERE uploaded_by = $1';
    const values: any[] = [userId];

    if (uploadType) {
      query += ' AND upload_type = $2';
      values.push(uploadType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.query<FileUpload>(query, values);
    return result.rows;
  }

  /**
   * Get file uploads by related entity
   */
  async getFileUploadsByEntity(entityId: string, uploadType?: string): Promise<FileUpload[]> {
    let query = 'SELECT * FROM file_uploads WHERE related_entity_id = $1';
    const values: any[] = [entityId];

    if (uploadType) {
      query += ' AND upload_type = $2';
      values.push(uploadType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.query<FileUpload>(query, values);
    return result.rows;
  }

  /**
   * Delete file upload
   */
  async deleteFileUpload(id: string): Promise<boolean> {
    const query = 'DELETE FROM file_uploads WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get upload statistics
   */
  async getUploadStatistics(userId?: string): Promise<any> {
    let query = `
      SELECT 
        upload_type,
        COUNT(*) as count,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_size
      FROM file_uploads
    `;
    
    const values: any[] = [];
    
    if (userId) {
      query += ' WHERE uploaded_by = $1';
      values.push(userId);
    }
    
    query += ' GROUP BY upload_type ORDER BY count DESC';

    const result = await this.query(query, values);
    return result.rows;
  }
}

export const uploadRepository = new UploadRepository();
