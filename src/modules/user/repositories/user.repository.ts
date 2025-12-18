import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { User, UserRole, UserStatus, UserFilter } from '../../../types';
import bcrypt from 'bcrypt';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone?: string;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  rollNumber?: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
  academicYearId?: string;
  courseId?: string;
  sectionId?: string;
  yearOfStudy?: string;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  rollNumber?: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
  lastLogin?: Date;
  password_hash?: string;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Override base findAll to return properly mapped columns
   */
  async findAll(options: any = {}): Promise<any> {
    const {
      page = 1,
      limit = 1000, // Increased default limit to show all users
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM users`;
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with JOINs to get all related data
    const dataQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.college_id,
        u.department_id,
        u.phone,
        u.class_in_charge,
        u.class,
        u.semester,
        u.roll_number,
        u.profile_image_url,
        u.email_verified,
        u.last_login,
        u.created_at,
        u.updated_at,
        u.course_id,
        u.section_id,
        u.academic_year_id,
        u.year_of_study,
        c.name as college_name,
        d.name as department_name,
        co.name as course_name,
        co.code as course_code,
        s.name as section_name,
        ay.year_name as academic_year_name
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN courses co ON u.course_id = co.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    const dataResult = await this.query<User>(dataQuery, [limit, offset]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.college_id,
        u.department_id,
        u.phone,
        u.class_in_charge,
        u.class,
        u.semester,
        u.roll_number,
        u.profile_image_url,
        u.email_verified,
        u.last_login,
        u.password_hash,
        u.created_at,
        u.updated_at,
        u.course_id,
        u.section_id,
        u.academic_year_id,
        u.year_of_study,
        c.name as college_name,
        d.name as department_name,
        co.name as course_name,
        co.code as course_code,
        s.name as section_name,
        ay.year_name as academic_year_name
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN courses co ON u.course_id = co.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      WHERE u.email = $1
    `;
    const result = await this.query<User>(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Override base findById to include JOINs
   */
  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.college_id,
        u.department_id,
        u.phone,
        u.class_in_charge,
        u.class,
        u.semester,
        u.roll_number,
        u.profile_image_url,
        u.email_verified,
        u.last_login,
        u.password_hash,
        u.created_at,
        u.updated_at,
        u.course_id,
        u.section_id,
        u.academic_year_id,
        u.year_of_study,
        c.name as college_name,
        d.name as department_name,
        co.name as course_name,
        co.code as course_code,
        s.name as section_name,
        ay.year_name as academic_year_name
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN courses co ON u.course_id = co.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      WHERE u.id = $1
    `;
    const result = await this.query<User>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by registration number (roll_number)
   */
  async findByRegistrationNumber(registrationNumber: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        name,
        email,
        role,
        status,
        college_id,
        department_id,
        phone,
        class_in_charge,
        class,
        semester,
        roll_number,
        profile_image_url,
        email_verified,
        last_login,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE roll_number = $1
    `;
    const result = await this.query<User>(query, [registrationNumber]);
    return result.rows[0] || null;
  }

  /**
   * Find user by roll number and college
   */
  async findByRollNumberAndCollege(rollNumber: string, collegeId: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        name,
        email,
        role,
        status,
        college_id,
        department_id,
        phone,
        class_in_charge,
        class,
        semester,
        roll_number,
        profile_image_url,
        email_verified,
        last_login,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE roll_number = $1 AND college_id = $2
    `;
    const result = await this.query<User>(query, [rollNumber, collegeId]);
    return result.rows[0] || null;
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    return this.findWhere('role = $1', [role], options);
  }

  /**
   * Find users by college
   */
  async findByCollege(collegeId: string, options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    return this.findWhere('college_id = $1', [collegeId], options);
  }

  /**
   * Find users by department (excluding null/invalid departments)
   */
  async findByDepartment(departmentId: string, options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    // Ensure we only get users with valid department assignments
    const whereClause = 'department_id = $1 AND department_id IS NOT NULL';
    return this.findWhere(whereClause, [departmentId], options);
  }

  /**
   * Find users with filters
   */
  async findWithFilters(filters: UserFilter): Promise<PaginatedResult<User>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Role filter
    if (filters.role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    // College filter
    if (filters.collegeId) {
      conditions.push(`college_id = $${paramIndex}`);
      params.push(filters.collegeId);
      paramIndex++;
    }

    // Department filter
    if (filters.departmentId) {
      conditions.push(`department_id = $${paramIndex}`);
      params.push(filters.departmentId);
      paramIndex++;
    }

    // Search filter (name or email)
    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Use custom query with proper column mapping instead of base findWhere
    const {
      page = 1,
      limit = 1000, // Increased default limit to show all users
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = {
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
    const countResult = await this.query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data (keep snake_case to match User interface)
    const dataQuery = `
      SELECT
        id,
        name,
        email,
        role,
        status,
        college_id,
        department_id,
        phone,
        class_in_charge,
        class,
        semester,
        roll_number,
        profile_image_url,
        email_verified,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.query<User>(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (
        email, password_hash, name, role, phone, status, college_id, department_id,
        class_in_charge, class, semester, roll_number, profile_image_url, email_verified, academic_year_id,
        course_id, section_id, year_of_study
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      userData.email,
      userData.passwordHash,
      userData.name,
      userData.role,
      userData.phone || null,
      userData.status || 'pending',
      userData.collegeId || null,
      userData.departmentId || null,
      userData.classInCharge || null,
      userData.class || null,
      userData.semester || null,
      userData.rollNumber || null,
      userData.profileImageUrl || null,
      userData.emailVerified || false,
      userData.academicYearId || null,
      userData.courseId || null,
      userData.sectionId || null,
      userData.yearOfStudy || null,
    ];

    const result = await this.query<User>(query, values);
    return result.rows[0];
  }

  /**
   * Update user data
   */
  async updateUser(id: string, userData: UpdateUserData): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 because $1 is the ID

    // Build dynamic update query
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id); // No updates, return current user
    }

    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<User>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id, passwordHash]);
    return result.rowCount > 0;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  // Duplicate function removed - using the first implementation above

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<boolean> {
    const query = `
      UPDATE users
      SET email_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM users WHERE email = $1';
    const params: any[] = [email];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    usersByRole: Record<UserRole, number>;
    usersByStatus: Record<UserStatus, number>;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM users',
      'SELECT role, COUNT(*) as count FROM users GROUP BY role',
      'SELECT status, COUNT(*) as count FROM users GROUP BY status',
    ];

    const [totalResult, roleResult, statusResult] = await Promise.all(
      queries.map(query => this.query(query))
    );

    const usersByRole = {} as Record<UserRole, number>;
    const usersByStatus = {} as Record<UserStatus, number>;

    roleResult.rows.forEach(row => {
      usersByRole[row.role as UserRole] = parseInt((row as any).count, 10);
    });

    statusResult.rows.forEach(row => {
      usersByStatus[row.status as UserStatus] = parseInt((row as any).count, 10);
    });

    return {
      totalUsers: parseInt((totalResult.rows[0] as any)?.total || '0', 10),
      usersByRole,
      usersByStatus,
    };
  }

  /**
   * Create user from registration request
   */
  async createUserFromRegistration(registrationRequest: any): Promise<{ user: User; tempPassword: string }> {
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const query = `
      INSERT INTO users (
        name, email, phone, role, college_id, department_id,
        password_hash, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      registrationRequest.name,
      registrationRequest.email,
      registrationRequest.phone,
      registrationRequest.role,
      registrationRequest.collegeId || registrationRequest.college_id,
      registrationRequest.departmentId || registrationRequest.department_id,
      hashedPassword
    ];

    const result = await this.query<User>(query, values);
    const user = result.rows[0];

    console.log(`User created: ${user.email}, Temporary password: ${tempPassword}`);

    return { user, tempPassword };
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(departmentId: string): Promise<{
    totalStudents: number;
    totalStaff: number;
    activeStudents: number;
    ranking?: string;
  }> {
    const queries = [
      'SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND role = \'student\' AND status = \'active\'',
      'SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND role IN (\'staff\', \'hod\') AND status = \'active\'',
      'SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND role = \'student\' AND status = \'active\'',
    ];

    const [studentsResult, staffResult, activeStudentsResult] = await Promise.all(
      queries.map(query => this.query(query, [departmentId]))
    );

    return {
      totalStudents: parseInt((studentsResult.rows[0] as any)?.count || '0', 10),
      totalStaff: parseInt((staffResult.rows[0] as any)?.count || '0', 10),
      activeStudents: parseInt((activeStudentsResult.rows[0] as any)?.count || '0', 10),
      ranking: 'N/A', // Can be implemented later with more complex logic
    };
  }

  /**
   * Find students with resource data for dashboard and monitoring
   */
  async findStudentsWithresourceData(filters: {
    departmentId?: string;
    collegeId?: string;
    yearOfStudy?: number;
    section?: string;
    status?: string;
    role?: string;
  } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Base condition for students
    if (filters.role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex++;
    } else {
      conditions.push(`u.role = 'student'`);
    }

    // Department filter
    if (filters.departmentId) {
      conditions.push(`u.department_id = $${paramIndex}`);
      params.push(filters.departmentId);
      paramIndex++;
    }

    // College filter
    if (filters.collegeId) {
      conditions.push(`u.college_id = $${paramIndex}`);
      params.push(filters.collegeId);
      paramIndex++;
    }

    // Year of study filter
    if (filters.yearOfStudy) {
      conditions.push(`u.year_of_study = $${paramIndex}`);
      params.push(filters.yearOfStudy.toString());
      paramIndex++;
    }

    // Section filter
    if (filters.section) {
      conditions.push(`s.name = $${paramIndex}`);
      params.push(filters.section);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.roll_number,
        u.year_of_study,
        u.status,
        u.phone,
        u.created_at,
        u.section_id,
        u.department_id,
        u.college_id,
        d.name as department_name,
        c.name as college_name,
        s.name as section_name,
        co.name as course_name,
        ay.year_name as academic_year,
        COUNT(t.id) as assigned_resources_count,
        COUNT(CASE WHEN t.status = 'healthy' THEN 1 END) as healthy_resources_count,
        COUNT(CASE WHEN t.status = 'unhealthy' THEN 1 END) as unhealthy_resources_count,
        MAX(ti.upload_date) as last_photo_upload,
        COUNT(ti.id) as total_photos
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN courses co ON s.course_id = co.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      LEFT JOIN resources t ON t.assigned_student_id = u.id
      LEFT JOIN resource_media ti ON t.id = ti.resource_id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.roll_number, u.year_of_study, u.status,
               u.phone, u.created_at, u.section_id, u.department_id, u.college_id,
               d.name, c.name, s.name, co.name, ay.year_name
      ORDER BY u.name
    `;

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Create singleton instance
export const userRepository = new UserRepository();
