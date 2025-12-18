import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { Invitation, InvitationStatus, UserRole } from '../../../types';

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  sentBy: string;
  collegeId?: string;
  departmentId?: string;
  invitationToken: string;
  expiresAt: Date;
  status?: InvitationStatus;
  // Student-specific fields
  name?: string;
  phone?: string;
  yearOfStudy?: number;
  section?: string;
  rollNumber?: string;
  academicYearId?: string;
  courseId?: string;
  sectionId?: string;
  // Staff-specific fields
  designation?: string;
  qualification?: string;
  experience?: number;
}

export interface UpdateInvitationData {
  status?: InvitationStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface InvitationWithDetails extends Invitation {
  invitedByName?: string;
  invitedByEmail?: string;
  collegeName?: string;
  departmentName?: string;
}

export class InvitationRepository extends BaseRepository<Invitation> {
  constructor() {
    super('invitations');
  }

  /**
   * Find invitation by email
   */
  async findByEmail(email: string): Promise<Invitation | null> {
    const query = 'SELECT * FROM invitations WHERE email = $1';
    const result = await this.query<Invitation>(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: string): Promise<Invitation | null> {
    const query = 'SELECT * FROM invitations WHERE token = $1';
    const result = await this.query<Invitation>(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Find invitations by status
   */
  async findByStatus(status: InvitationStatus, options: PaginationOptions = {}): Promise<PaginatedResult<Invitation>> {
    return this.findWhere('status = $1', [status], options);
  }

  /**
   * Find invitations by college
   */
  async findByCollege(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Invitation>> {
    return this.findWhere('college_id = $1', [collegeId], options);
  }

  /**
   * Find invitations by department
   */
  async findByDepartment(departmentId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Invitation>> {
    return this.findWhere('department_id = $1', [departmentId], options);
  }

  /**
   * Find invitation with details
   */
  async findByIdWithDetails(id: string): Promise<InvitationWithDetails | null> {
    const query = `
      SELECT 
        i.*,
        u.name as invited_by_name,
        u.email as invited_by_email,
        c.name as college_name,
        d.name as department_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      LEFT JOIN colleges c ON i.college_id = c.id
      LEFT JOIN departments d ON i.department_id = d.id
      WHERE i.id = $1
    `;

    const result = await this.query<InvitationWithDetails>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all invitations with details
   */
  async findAllWithDetails(options: PaginationOptions = {}): Promise<PaginatedResult<InvitationWithDetails>> {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = 'SELECT COUNT(*) FROM invitations';
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with details
    const dataQuery = `
      SELECT 
        i.*,
        u.name as invited_by_name,
        u.email as invited_by_email,
        c.name as college_name,
        d.name as department_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      LEFT JOIN colleges c ON i.college_id = c.id
      LEFT JOIN departments d ON i.department_id = d.id
      ORDER BY i.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;

    const dataResult = await this.query<InvitationWithDetails>(dataQuery, [limit, offset]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new invitation
   */
  async createInvitation(invitationData: CreateInvitationData): Promise<Invitation> {
    const query = `
      INSERT INTO invitations (
        email, role, sent_by, college_id, department_id, invitation_token, expires_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      invitationData.email,
      invitationData.role,
      invitationData.sentBy,
      invitationData.collegeId || null,
      invitationData.departmentId || null,
      invitationData.invitationToken,
      invitationData.expiresAt,
      invitationData.status || 'pending',
    ];

    const result = await this.query<Invitation>(query, values);
    return result.rows[0];
  }

  async createInvitationForBulkUpload(invitationData: any): Promise<Invitation> {
    const query = `
        INSERT INTO invitations (
          email, role, sent_by, college_id, department_id, status, invitation_token,
          name, phone, year_of_study, section, roll_number, designation, qualification, experience, academic_year_id, course_id, section_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

    const values = [
      invitationData.email,
      invitationData.role,
      invitationData.sentBy,
      invitationData.collegeId || null,
      invitationData.departmentId || null,
      invitationData.status || 'pending',
      invitationData.invitationToken,
      invitationData.name,
      invitationData.phone,
      invitationData.yearOfStudy,
      invitationData.section,
      invitationData.rollNumber,
      invitationData.designation,
      invitationData.qualification,
      invitationData.experience,
      invitationData.academic_year_id || null,
      invitationData.course_id || null,
      invitationData.section_id || null,
    ];

    const result = await this.query<Invitation>(query, values);
    return result.rows[0];
  }

  /**
   * Update invitation data
   */
  async updateInvitation(id: string, invitationData: UpdateInvitationData): Promise<Invitation | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 because $1 is the ID

    // Build dynamic update query
    Object.entries(invitationData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id); // No updates, return current invitation
    }

    const query = `
      UPDATE invitations
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<Invitation>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(id: string): Promise<boolean> {
    const query = `
      UPDATE invitations
      SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(id: string): Promise<boolean> {
    const query = `
      UPDATE invitations
      SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Find expired invitations
   */
  async findExpired(): Promise<Invitation[]> {
    const query = "SELECT * FROM invitations WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending'";
    const result = await this.query<Invitation>(query);
    return result.rows;
  }

  /**
   * Mark invitation as expired
   */
  async markAsExpired(id: string): Promise<boolean> {
    const query = `
      UPDATE invitations
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if email has pending invitation
   */
  async hasPendingInvitation(email: string): Promise<boolean> {
    const query =
      "SELECT 1 FROM invitations WHERE email = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP";
    const result = await this.query(query, [email]);
    return result.rowCount > 0;
  }

  /**
   * Get invitation statistics
   */
  async getStatistics(): Promise<{
    totalInvitations: number;
    invitationsByStatus: Record<InvitationStatus, number>;
    invitationsByRole: Record<UserRole, number>;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM invitations',
      'SELECT status, COUNT(*) as count FROM invitations GROUP BY status',
      'SELECT role, COUNT(*) as count FROM invitations GROUP BY role',
    ];

    const [totalResult, statusResult, roleResult] = await Promise.all(queries.map(query => this.query(query)));

    const invitationsByStatus = {} as Record<InvitationStatus, number>;
    const invitationsByRole = {} as Record<UserRole, number>;

    statusResult.rows.forEach(row => {
      invitationsByStatus[row.status as InvitationStatus] = parseInt((row as any).count, 10);
    });

    roleResult.rows.forEach(row => {
      invitationsByRole[row.role as UserRole] = parseInt((row as any).count, 10);
    });

    return {
      totalInvitations: parseInt((totalResult.rows[0] as any)?.total || '0', 10),
      invitationsByStatus,
      invitationsByRole,
    };
  }
}

// Create singleton instance
export const invitationRepository = new InvitationRepository();
