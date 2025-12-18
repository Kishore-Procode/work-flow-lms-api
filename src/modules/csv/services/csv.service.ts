/**
 * CSV Upload and Processing Service
 * 
 * Comprehensive service for handling CSV bulk uploads following
 * MNC enterprise standards for data processing and validation.
 * 
 * Features:
 * - Student data bulk upload (regNo, Name, college Mail Id)
 * - College-Principal data pairs upload
 * - Comprehensive validation and error handling
 * - Progress tracking and audit logging
 * - Duplicate detection and prevention
 * - Rollback capability for failed uploads
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import csv from 'csv-parser';
import { Readable } from 'stream';
import { Pool } from 'pg';
import { appLogger } from '../../../utils/logger';
import { batchService } from '../../batch/services/batch.service';

export interface CSVUploadResult {
  uploadId: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: CSVError[];
  status: 'completed' | 'failed' | 'partial';
}

export interface CSVError {
  row: number;
  field?: string;
  value?: string;
  error: string;
}

export interface StudentCSVRecord {
  regNo: string;
  name: string;
  collegeMailId: string;
  // Optional fields that might be included
  phone?: string;
  department?: string;
  batch?: string;
}

export interface CollegePrincipalCSVRecord {
  collegeName: string;
  principalName: string;
  principalEmail: string;
  collegeEmail: string;
  phone: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  website?: string;
}

/**
 * CSV Processing Service Class
 */
export class CSVService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Process student CSV upload
   */
  async processStudentCSV(
    fileBuffer: Buffer,
    fileName: string,
    departmentId: string,
    batchYear: number,
    uploadedBy: string
  ): Promise<CSVUploadResult> {
    const uploadId = await this.createUploadLog(uploadedBy, fileName, fileBuffer.length, 'students');
    
    try {
      // Verify department and batch exist
      const batch = await batchService.getBatchByYearAndDepartment(batchYear, departmentId);
      if (!batch) {
        throw new Error(`Batch ${batchYear} not found for the specified department`);
      }

      // Parse CSV
      const records = await this.parseCSV<StudentCSVRecord>(fileBuffer);
      
      // Validate CSV format
      const validationErrors = this.validateStudentCSVFormat(records);
      if (validationErrors.length > 0) {
        await this.updateUploadLog(uploadId, {
          status: 'failed',
          totalRecords: records.length,
          failedRecords: records.length,
          errorDetails: validationErrors,
        });
        
        return {
          uploadId,
          totalRecords: records.length,
          successfulRecords: 0,
          failedRecords: records.length,
          errors: validationErrors,
          status: 'failed',
        };
      }

      // Process records in transaction
      const result = await this.processStudentRecords(records, departmentId, batch.id, uploadId);
      
      // Update upload log
      await this.updateUploadLog(uploadId, {
        status: result.failedRecords === 0 ? 'completed' : 'partial',
        totalRecords: result.totalRecords,
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        errorDetails: result.errors,
      });

      return result;
    } catch (error) {
      appLogger.error('CSV processing failed', {
        error,
        uploadId,
        fileName,
        departmentId,
        batchYear,
        uploadedBy,
      });

      await this.updateUploadLog(uploadId, {
        status: 'failed',
        errorDetails: [{ row: 0, error: error.message }],
      });

      throw error;
    }
  }

  /**
   * Process college-principal CSV upload
   */
  async processCollegePrincipalCSV(
    fileBuffer: Buffer,
    fileName: string,
    uploadedBy: string
  ): Promise<CSVUploadResult> {
    const uploadId = await this.createUploadLog(uploadedBy, fileName, fileBuffer.length, 'colleges');
    
    try {
      // Parse CSV
      const records = await this.parseCSV<CollegePrincipalCSVRecord>(fileBuffer);
      
      // Validate CSV format
      const validationErrors = this.validateCollegePrincipalCSVFormat(records);
      if (validationErrors.length > 0) {
        await this.updateUploadLog(uploadId, {
          status: 'failed',
          totalRecords: records.length,
          failedRecords: records.length,
          errorDetails: validationErrors,
        });
        
        return {
          uploadId,
          totalRecords: records.length,
          successfulRecords: 0,
          failedRecords: records.length,
          errors: validationErrors,
          status: 'failed',
        };
      }

      // Process records in transaction
      const result = await this.processCollegePrincipalRecords(records, uploadId);
      
      // Update upload log
      await this.updateUploadLog(uploadId, {
        status: result.failedRecords === 0 ? 'completed' : 'partial',
        totalRecords: result.totalRecords,
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        errorDetails: result.errors,
      });

      return result;
    } catch (error) {
      appLogger.error('College-Principal CSV processing failed', {
        error,
        uploadId,
        fileName,
        uploadedBy,
      });

      await this.updateUploadLog(uploadId, {
        status: 'failed',
        errorDetails: [{ row: 0, error: error.message }],
      });

      throw error;
    }
  }

  /**
   * Parse CSV buffer into records
   */
  private async parseCSV<T>(fileBuffer: Buffer): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const records: T[] = [];
      const stream = Readable.from(fileBuffer);

      stream
        .pipe(csv())
        .on('data', (data) => {
          records.push(data);
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  /**
   * Validate student CSV format
   */
  private validateStudentCSVFormat(records: StudentCSVRecord[]): CSVError[] {
    const errors: CSVError[] = [];
    const requiredFields = ['regNo', 'name', 'collegeMailId'];

    if (records.length === 0) {
      errors.push({ row: 0, error: 'CSV file is empty' });
      return errors;
    }

    // Check if all required fields are present in the first record
    const firstRecord = records[0];
    const missingFields = requiredFields.filter(field => !(field in firstRecord));
    
    if (missingFields.length > 0) {
      errors.push({
        row: 0,
        error: `Missing required columns: ${missingFields.join(', ')}. Expected format: regNo, name, collegeMailId`,
      });
      return errors;
    }

    // Validate each record
    records.forEach((record, index) => {
      const rowNumber = index + 1;

      // Check required fields
      requiredFields.forEach(field => {
        if (!record[field] || record[field].toString().trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            value: record[field],
            error: `${field} is required`,
          });
        }
      });

      // Validate email format
      if (record.collegeMailId) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.collegeMailId)) {
          errors.push({
            row: rowNumber,
            field: 'collegeMailId',
            value: record.collegeMailId,
            error: 'Invalid email format',
          });
        }
      }

      // Validate registration number format (basic validation)
      if (record.regNo && record.regNo.length < 3) {
        errors.push({
          row: rowNumber,
          field: 'regNo',
          value: record.regNo,
          error: 'Registration number must be at least 3 characters',
        });
      }

      // Validate name
      if (record.name && record.name.length < 2) {
        errors.push({
          row: rowNumber,
          field: 'name',
          value: record.name,
          error: 'Name must be at least 2 characters',
        });
      }
    });

    return errors;
  }

  /**
   * Validate college-principal CSV format
   */
  private validateCollegePrincipalCSVFormat(records: CollegePrincipalCSVRecord[]): CSVError[] {
    const errors: CSVError[] = [];
    const requiredFields = ['collegeName', 'principalName', 'principalEmail', 'collegeEmail', 'phone', 'address', 'district', 'state', 'pincode'];

    if (records.length === 0) {
      errors.push({ row: 0, error: 'CSV file is empty' });
      return errors;
    }

    // Check if all required fields are present
    const firstRecord = records[0];
    const missingFields = requiredFields.filter(field => !(field in firstRecord));
    
    if (missingFields.length > 0) {
      errors.push({
        row: 0,
        error: `Missing required columns: ${missingFields.join(', ')}`,
      });
      return errors;
    }

    // Validate each record
    records.forEach((record, index) => {
      const rowNumber = index + 1;

      // Check required fields
      requiredFields.forEach(field => {
        if (!record[field] || record[field].toString().trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            value: record[field],
            error: `${field} is required`,
          });
        }
      });

      // Validate email formats
      const emailFields = ['principalEmail', 'collegeEmail'];
      emailFields.forEach(field => {
        if (record[field]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(record[field])) {
            errors.push({
              row: rowNumber,
              field,
              value: record[field],
              error: 'Invalid email format',
            });
          }
        }
      });

      // Validate phone number
      if (record.phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(record.phone.replace(/\s+/g, ''))) {
          errors.push({
            row: rowNumber,
            field: 'phone',
            value: record.phone,
            error: 'Invalid phone number format',
          });
        }
      }

      // Validate pincode
      if (record.pincode) {
        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(record.pincode)) {
          errors.push({
            row: rowNumber,
            field: 'pincode',
            value: record.pincode,
            error: 'Pincode must be 6 digits',
          });
        }
      }
    });

    return errors;
  }

  /**
   * Process student records in database transaction
   */
  private async processStudentRecords(
    records: StudentCSVRecord[],
    departmentId: string,
    batchId: string,
    uploadId: string
  ): Promise<CSVUploadResult> {
    const client = await this.db.connect();
    const errors: CSVError[] = [];
    let successfulRecords = 0;

    try {
      await client.query('BEGIN');

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 1;

        try {
          // Check for duplicate registration number
          const duplicateCheck = await client.query(
            'SELECT id FROM users WHERE roll_number = $1 AND department_id = $2',
            [record.regNo, departmentId]
          );

          if (duplicateCheck.rows.length > 0) {
            errors.push({
              row: rowNumber,
              field: 'regNo',
              value: record.regNo,
              error: 'Registration number already exists in this department',
            });
            continue;
          }

          // Check for duplicate email
          const emailCheck = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [record.collegeMailId.toLowerCase()]
          );

          if (emailCheck.rows.length > 0) {
            errors.push({
              row: rowNumber,
              field: 'collegeMailId',
              value: record.collegeMailId,
              error: 'Email already exists',
            });
            continue;
          }

          // Create user record
          const insertQuery = `
            INSERT INTO users (
              name, email, roll_number, role, status, 
              department_id, batch_id, phone, email_verified
            )
            VALUES ($1, $2, $3, 'student', 'pending', $4, $5, $6, false)
            RETURNING id
          `;

          await client.query(insertQuery, [
            record.name.trim(),
            record.collegeMailId.toLowerCase().trim(),
            record.regNo.trim(),
            departmentId,
            batchId,
            record.phone || null,
          ]);

          successfulRecords++;
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: `Database error: ${error.message}`,
          });
        }
      }

      // Update batch enrolled students count
      if (successfulRecords > 0) {
        await client.query(
          'UPDATE student_batches SET enrolled_students = enrolled_students + $1 WHERE id = $2',
          [successfulRecords, batchId]
        );
      }

      await client.query('COMMIT');

      appLogger.info('Student CSV processing completed', {
        uploadId,
        totalRecords: records.length,
        successfulRecords,
        failedRecords: errors.length,
      });

      return {
        uploadId,
        totalRecords: records.length,
        successfulRecords,
        failedRecords: errors.length,
        errors,
        status: errors.length === 0 ? 'completed' : 'partial',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process college-principal records (placeholder - to be implemented)
   */
  private async processCollegePrincipalRecords(
    records: CollegePrincipalCSVRecord[],
    uploadId: string
  ): Promise<CSVUploadResult> {
    // TODO: Implement college-principal processing
    // This would involve creating college and principal user records
    
    return {
      uploadId,
      totalRecords: records.length,
      successfulRecords: 0,
      failedRecords: records.length,
      errors: [{ row: 0, error: 'College-Principal CSV processing not yet implemented' }],
      status: 'failed',
    };
  }

  /**
   * Create upload log entry
   */
  private async createUploadLog(
    uploadedBy: string,
    fileName: string,
    fileSize: number,
    uploadType: string
  ): Promise<string> {
    const query = `
      INSERT INTO csv_upload_logs (uploaded_by, file_name, file_size, upload_type)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const result = await this.db.query(query, [uploadedBy, fileName, fileSize, uploadType]);
    return result.rows[0].id;
  }

  /**
   * Update upload log with results
   */
  private async updateUploadLog(
    uploadId: string,
    data: {
      status?: string;
      totalRecords?: number;
      successfulRecords?: number;
      failedRecords?: number;
      errorDetails?: CSVError[];
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status) {
      updateFields.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    if (data.totalRecords !== undefined) {
      updateFields.push(`total_records = $${paramCount}`);
      values.push(data.totalRecords);
      paramCount++;
    }

    if (data.successfulRecords !== undefined) {
      updateFields.push(`successful_records = $${paramCount}`);
      values.push(data.successfulRecords);
      paramCount++;
    }

    if (data.failedRecords !== undefined) {
      updateFields.push(`failed_records = $${paramCount}`);
      values.push(data.failedRecords);
      paramCount++;
    }

    if (data.errorDetails) {
      updateFields.push(`error_details = $${paramCount}`);
      values.push(JSON.stringify(data.errorDetails));
      paramCount++;
    }

    updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    values.push(uploadId);

    const query = `
      UPDATE csv_upload_logs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
    `;

    await this.db.query(query, values);
  }
}

// Export singleton instance
export const csvService = new CSVService(require('../../../config/database').pool);
