import { BaseRepository, PaginatedResult } from '../../../models/base.repository';
import { RegistrationRequest, RegistrationRequestStatus } from '../../../types';

export interface CreateRegistrationRequestData {
  email: string;
  name: string;
  role: string;
  phone: string;
  collegeId?: string;
  departmentId?: string;
  class?: string;
  rollNumber?: string;
  semester?: string;
  batchYear?: number;
  yearOfStudy?: string;
  collegeName?: string;
  // Address fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  // Personal fields
  aadharNumber?: string;
  dateOfBirth?: Date;
  // SPOC fields
  spocName?: string;
  spocEmail?: string;
  spocPhone?: string;
  // New academic structure fields
  courseId?: string;
  academicYearId?: string;
  sectionId?: string;
  // Password for account creation
  passwordHash?: string;
  status?: RegistrationRequestStatus;
  requestedAt?: Date;
}

export interface UpdateRegistrationRequestData {
  email?: string;
  name?: string;
  role?: string;
  phone?: string;
  collegeId?: string;
  departmentId?: string;
  class?: string;
  rollNumber?: string;
  semester?: string;
  batchYear?: number;
  yearOfStudy?: string;
  collegeName?: string;
  // Address fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  // Personal fields
  aadharNumber?: string;
  dateOfBirth?: Date;
  // SPOC fields
  spocName?: string;
  spocEmail?: string;
  spocPhone?: string;
  status?: RegistrationRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface RegistrationRequestWithDetails extends RegistrationRequest {
  collegeName?: string;
  departmentName?: string;
  reviewerName?: string;
}

export class RegistrationRepository extends BaseRepository<RegistrationRequest> {
  constructor() {
    super('registration_requests');
  }

  /**
   * Find all registration requests with details
   */
  async findAllWithDetails(options: any = {}): Promise<PaginatedResult<RegistrationRequestWithDetails>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'requested_at',
      sortOrder = 'desc',
      status,
      role,
      collegeId,
      departmentId
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND rr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND rr.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (collegeId) {
      whereClause += ` AND rr.college_id = $${paramIndex}`;
      params.push(collegeId);
      paramIndex++;
    }

    if (departmentId) {
      whereClause += ` AND rr.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM registration_requests rr
      ${whereClause}
    `;
    const countResult = await this.query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Get paginated data
    const dataQuery = `
      SELECT 
        rr.*,
        c.name as college_name,
        d.name as department_name,
        u.name as reviewer_name
      FROM registration_requests rr
      LEFT JOIN colleges c ON rr.college_id = c.id
      LEFT JOIN departments d ON rr.department_id = d.id
      LEFT JOIN users u ON rr.reviewed_by = u.id
      ${whereClause}
      ORDER BY rr.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const dataResult = await this.query(dataQuery, params);

    return {
      data: dataResult.rows.map(this.mapRowToRegistrationRequest),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find registration request by ID with details
   */
  async findByIdWithDetails(id: string): Promise<RegistrationRequestWithDetails | null> {
    const query = `
      SELECT 
        rr.*,
        c.name as college_name,
        d.name as department_name,
        u.name as reviewer_name
      FROM registration_requests rr
      LEFT JOIN colleges c ON rr.college_id = c.id
      LEFT JOIN departments d ON rr.department_id = d.id
      LEFT JOIN users u ON rr.reviewed_by = u.id
      WHERE rr.id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToRegistrationRequest(result.rows[0]) : null;
  }

  /**
   * Create new registration request
   */
  async createRegistrationRequest(data: CreateRegistrationRequestData): Promise<RegistrationRequest> {
    try {
      console.log('🔍 Repository debug - data received:', {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash ? `[${data.passwordHash.length} chars] ${data.passwordHash.substring(0, 20)}...` : 'undefined'
      });

    const query = `
      INSERT INTO registration_requests (
        id, email, name, role, phone, college_id, department_id,
        class, roll_number, semester, batch_year, year_of_study, college_name,
        address_line1, address_line2, city, state, district, pincode,
        aadhar_number, date_of_birth, spoc_name, spoc_email, spoc_phone,
        course_id, academic_year_id, section_id, password_hash,
        status, requested_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *
    `;

    const values = [
      data.email,
      data.name,
      data.role,
      data.phone,
      data.collegeId || null,
      data.departmentId || null,
      data.class || null,
      data.rollNumber || null,
      data.semester || null,
      data.batchYear || null,
      data.yearOfStudy || null,
      data.collegeName || null,
      data.addressLine1 || null,
      data.addressLine2 || null,
      data.city || null,
      data.state || null,
      data.district || null,
      data.pincode || null,
      data.aadharNumber || null,
      data.dateOfBirth || null,
      data.spocName || null,
      data.spocEmail || null,
      data.spocPhone || null,
      // New academic structure fields
      data.courseId || null,
      data.academicYearId || null,
      data.sectionId || null,
      data.passwordHash || null,
      data.status || 'pending',
      data.requestedAt || new Date(),
    ];

    console.log('🔍 Repository debug - values array:', {
      passwordHashIndex: 27, // position in values array (0-based)
      passwordHashValue: values[27] ? `[${String(values[27]).length} chars] ${String(values[27]).substring(0, 20)}...` : 'null/undefined',
      totalValues: values.length,
      originalPasswordHash: data.passwordHash ? `[${data.passwordHash.length} chars] ${data.passwordHash.substring(0, 20)}...` : 'null/undefined'
    });

    const result = await this.query(query, values);
    console.log('🔍 Repository debug - query executed successfully, result:', {
      rowCount: result.rows.length,
      firstRowId: result.rows[0]?.id
    });
    return this.mapRowToRegistrationRequest(result.rows[0]);
    } catch (error) {
      console.error('❌ Repository error in createRegistrationRequest:', error);
      throw error;
    }
  }

  /**
   * Update registration request
   */
  async updateRegistrationRequest(id: string, data: UpdateRegistrationRequestData): Promise<RegistrationRequest | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = this.camelToSnake(key);
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE registration_requests 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.query(query, values);
    return result.rows.length > 0 ? this.mapRowToRegistrationRequest(result.rows[0]) : null;
  }

  /**
   * Get registration request statistics
   */
  async getStatistics(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
        COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff,
        COUNT(CASE WHEN role = 'hod' THEN 1 END) as hods,
        COUNT(CASE WHEN role = 'principal' THEN 1 END) as principals
      FROM registration_requests
    `;

    const result = await this.query(query);
    return result.rows[0];
  }

  /**
   * Map database row to RegistrationRequest object
   */
  private mapRowToRegistrationRequest(row: any): RegistrationRequestWithDetails {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      phone: row.phone,
      status: row.status,
      collegeId: row.college_id,
      departmentId: row.department_id,
      class: row.class,
      rollNumber: row.roll_number,
      semester: row.semester,
      batchYear: row.batch_year,
      yearOfStudy: row.year_of_study,
      collegeName: row.college_name,
      // Address fields
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      district: row.district,
      pincode: row.pincode,
      // Personal fields
      aadharNumber: row.aadhar_number,
      dateOfBirth: row.date_of_birth,
      // SPOC fields
      spocName: row.spoc_name,
      spocEmail: row.spoc_email,
      spocPhone: row.spoc_phone,
      reviewedBy: row.reviewed_by,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      // Additional details
      departmentName: row.department_name,
      reviewerName: row.reviewer_name,
    };
  }

  /**
   * Find registration requests by department ID
   */
  async findByDepartment(departmentId: string, options: {
    page?: number;
    limit?: number;
    status?: RegistrationRequestStatus;
  } = {}): Promise<PaginatedResult<RegistrationRequest>> {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        rr.*,
        d.name as department_name,
        u.name as reviewer_name
      FROM registration_requests rr
      LEFT JOIN departments d ON rr.department_id = d.id
      LEFT JOIN users u ON rr.reviewed_by = u.id
      WHERE rr.department_id = $1 AND rr.department_id IS NOT NULL
    `;

    const queryParams: any[] = [departmentId];

    if (status) {
      query += ` AND rr.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    query += ` ORDER BY rr.requested_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM registration_requests WHERE department_id = $1 AND department_id IS NOT NULL`;
    const countParams: any[] = [departmentId];

    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(query, queryParams),
      this.pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map(row => this.mapRowToRegistrationRequest(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        // hasNext: page < totalPages, // Removed as it's not part of the expected type
        // hasPrev: page > 1 // Removed as it's not part of the expected type
      }
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const registrationRepository = new RegistrationRepository();
