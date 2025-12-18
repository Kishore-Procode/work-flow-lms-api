import { BaseRepository } from '../../../models/base.repository';

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'staff' | 'hod' | 'principal';
  collegeId?: string;
  departmentId?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  passwordHash?: string; // Store hashed password for account creation upon approval
}

export interface CreateRegistrationRequestData {
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'staff' | 'hod' | 'principal';
  collegeId?: string;
  departmentId?: string;
  class?: string;
  rollNumber?: string;
  semester?: string;
  batchYear?: number;
  yearOfStudy?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  aadharNumber?: string;
  dateOfBirth?: Date;
  spocName?: string;
  spocEmail?: string;
  spocPhone?: string;
  courseId?: string;
  academicYearId?: string;
  sectionId?: string;
  passwordHash?: string; // Store hashed password for account creation upon approval
  status?: string;
  requestedAt?: Date;
}

class RegistrationRequestRepository extends BaseRepository<RegistrationRequest> {
  constructor() {
    super('registration_requests');
  }
  /**
   * Create registration request
   */
  async createRegistrationRequest(requestData: CreateRegistrationRequestData): Promise<RegistrationRequest> {
    console.log('🔍 Repository debug - data received:', {
      email: requestData.email,
      name: requestData.name,
      passwordHash: requestData.passwordHash ? `[${requestData.passwordHash.length} chars] ${requestData.passwordHash.substring(0, 20)}...` : 'undefined'
    });

    const query = `
      INSERT INTO registration_requests (
        name, email, phone, role, college_id, department_id, class, roll_number,
        semester, batch_year, year_of_study, address_line1, address_line2, city,
        state, district, pincode, aadhar_number, date_of_birth, spoc_name,
        spoc_email, spoc_phone, course_id, academic_year_id, section_id,
        password_hash, status, requested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *
    `;

    const values = [
      requestData.name,
      requestData.email,
      requestData.phone,
      requestData.role,
      requestData.collegeId,
      requestData.departmentId,
      requestData.class,
      requestData.rollNumber,
      requestData.semester,
      requestData.batchYear,
      requestData.yearOfStudy,
      requestData.addressLine1,
      requestData.addressLine2,
      requestData.city,
      requestData.state,
      requestData.district,
      requestData.pincode,
      requestData.aadharNumber,
      requestData.dateOfBirth,
      requestData.spocName,
      requestData.spocEmail,
      requestData.spocPhone,
      requestData.courseId,
      requestData.academicYearId,
      requestData.sectionId,
      requestData.passwordHash || null,
      requestData.status || 'pending',
      requestData.requestedAt || new Date()
    ];

    console.log('🔍 Repository debug - values array:', {
      passwordHashIndex: 25, // position in values array (0-based)
      passwordHashValue: values[25] ? `[${String(values[25]).length} chars] ${String(values[25]).substring(0, 20)}...` : 'null/undefined',
      totalValues: values.length,
      originalPasswordHash: requestData.passwordHash ? `[${requestData.passwordHash.length} chars] ${requestData.passwordHash.substring(0, 20)}...` : 'null/undefined'
    });

    const result = await this.query<RegistrationRequest>(query, values);
    console.log('🔍 Repository debug - query executed successfully, result:', {
      rowCount: result.rows.length,
      firstRowId: result.rows[0]?.id
    });
    return result.rows[0];
  }

  /**
   * Get registration request by ID
   */
  async findById(id: string): Promise<RegistrationRequest | null> {
    const query = 'SELECT * FROM registration_requests WHERE id = $1';
    const result = await this.query<RegistrationRequest>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all registration requests with details
   */
  async getRegistrationRequestsWithDetails(filters: {
    status?: string;
    role?: string;
    collegeId?: string;
    departmentId?: string;
  }): Promise<any[]> {
    let query = `
      SELECT
        rr.*,
        c.name as college_name,
        d.name as department_name,
        u.name as reviewed_by_name
      FROM registration_requests rr
      LEFT JOIN colleges c ON rr.college_id = c.id
      LEFT JOIN departments d ON rr.department_id = d.id
      LEFT JOIN users u ON rr.reviewed_by = u.id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND rr.status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.role) {
      query += ` AND rr.role = $${paramIndex}`;
      values.push(filters.role);
      paramIndex++;
    }

    if (filters.collegeId) {
      query += ` AND rr.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    if (filters.departmentId) {
      query += ` AND rr.department_id = $${paramIndex}`;
      values.push(filters.departmentId);
      paramIndex++;
    }

    query += ' ORDER BY rr.requested_at DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Update registration request status
   */
  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected', reviewedBy?: string, rejectionReason?: string): Promise<RegistrationRequest | null> {
    const query = `
      UPDATE registration_requests
      SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, 
          rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const values = [status, reviewedBy, rejectionReason, id];
    const result = await this.query<RegistrationRequest>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete registration request
   */
  async deleteRegistrationRequest(id: string): Promise<boolean> {
    const query = 'DELETE FROM registration_requests WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get registration statistics
   */
  async getRegistrationStatistics(filters: {
    collegeId?: string;
    departmentId?: string;
  }): Promise<any> {
    let query = `
      SELECT 
        rr.status,
        rr.role,
        COUNT(*) as count
      FROM registration_requests rr
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (filters.collegeId) {
      query += ` AND rr.college_id = $${paramIndex}`;
      values.push(filters.collegeId);
      paramIndex++;
    }

    if (filters.departmentId) {
      query += ` AND rr.department_id = $${paramIndex}`;
      values.push(filters.departmentId);
      paramIndex++;
    }

    query += ' GROUP BY rr.status, rr.role ORDER BY count DESC';

    const result = await this.query(query, values);
    return result.rows;
  }

  /**
   * Check if email already exists in registration requests
   */
  async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT id FROM registration_requests WHERE email = $1 AND status = $2';
    const result = await this.query(query, [email, 'pending']);
    return result.rows.length > 0;
  }

  /**
   * Get pending requests by role and hierarchy
   */
  async getPendingRequestsByHierarchy(approverRole: string, collegeId?: string, departmentId?: string): Promise<RegistrationRequest[]> {
    let query = `
      SELECT rr.* FROM registration_requests rr
      WHERE rr.status = 'pending'
    `;

    const values: any[] = [];
    let paramIndex = 1;

    // Apply hierarchy-based filtering
    switch (approverRole) {
      case 'staff':
        // Staff can approve students in their department
        query += ` AND rr.role = 'student'`;
        if (departmentId) {
          query += ` AND rr.department_id = $${paramIndex}`;
          values.push(departmentId);
          paramIndex++;
        }
        break;

      case 'hod':
        // HOD can approve staff and students in their department
        query += ` AND rr.role IN ('student', 'staff')`;
        if (departmentId) {
          query += ` AND rr.department_id = $${paramIndex}`;
          values.push(departmentId);
          paramIndex++;
        }
        break;

      case 'principal':
        // Principal can approve HODs, staff, and students in their college
        query += ` AND rr.role IN ('student', 'staff', 'hod')`;
        if (collegeId) {
          query += ` AND rr.college_id = $${paramIndex}`;
          values.push(collegeId);
          paramIndex++;
        }
        break;

      case 'admin':
        // Admin can approve all including principals
        break;

      default:
        // No permission
        query += ` AND 1=0`;
    }

    query += ' ORDER BY rr.requested_at ASC';

    const result = await this.query<RegistrationRequest>(query, values);
    return result.rows;
  }
}

export const registrationRequestRepository = new RegistrationRequestRepository();
