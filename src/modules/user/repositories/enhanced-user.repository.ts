/**
 * Enhanced User Repository
 *
 * Advanced user repository with comprehensive CRUD operations, role-based filtering,
 * advanced search, and audit logging following enterprise standards.
 *
 * @author Student-ACT LMS Team
 * @version 2.0.0
 */

import { PoolClient } from 'pg';
import {
  EnhancedBaseRepository,
  FilterCondition,
  EnhancedPaginationOptions,
  EnhancedPaginatedResult,
} from '../../../models/enhanced-base.repository';
import { User, UserRole, UserStatus, UserFilter } from '../../../types';
import { appLogger } from '../../../utils/logger';
import { hashPassword } from '../../../utils/auth.utils';
import { academicYearRepository } from '../../academic-year/repositories/academic-year.repository';

export interface CreateUserData {
  name: string;
  email: string;
  password?: string;
  passwordHash?: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  collegeId?: string;
  departmentId?: string;
  courseId?: string;
  rollNumber?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  profileImageUrl?: string;
  qualification?: string;
  experience?: string;
  employeeId?: string;
  yearOfStudy?: string;
  sectionId?: string;
  academicYearId?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  collegeId?: string;
  departmentId?: string;
  courseId?: string;
  rollNumber?: string;
  classInCharge?: string;
  class?: string;
  semester?: string;
  profileImageUrl?: string;
  qualification?: string;
  experience?: string;
  employeeId?: string;
  emailVerified?: boolean;
  lastLogin?: Date;
}

export interface UserWithDetails extends User {
  collegeName?: string;
  departmentName?: string;
  assignedresourcesCount?: number;
  lastLoginFormatted?: string;
  courseName?: string;
}

export interface UserWithresourceAssignment extends User {
  collegeName?: string;
  departmentName?: string;
  courseName?: string;
  sectionName?: string;
  academicYearName?: string;
  resourceAssignment?: {
    id: string;
    resourceCode: string;
    category: string;
    locationDescription: string;
    startedDate: string;
    status: string;
    assignedDate: string;
  } | null;
}

export interface UserFilterOptions {
  role?: UserRole;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  courseId?: string;
  academicYearId?: string;
  section?: string;
  assignmentStatus?: string; // 'assigned', 'unassigned'
  search?: string;
  emailVerified?: boolean;
  hasPhone?: boolean;
  hasCollege?: boolean;
  hasDepartment?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  unassigned?: boolean; // Only students without assigned resources
}

/**
 * Enhanced User Repository Class
 */
export class EnhancedUserRepository extends EnhancedBaseRepository<User> {
  protected tableName = 'users';
  protected primaryKey = 'id';
  protected allowedSortFields = ['created_at', 'updated_at', 'name', 'email', 'role', 'status', 'last_login'];
  protected defaultSortField = 'created_at';

  /**
   * Find staff members with role-based filtering
   */
  async findStaffWithFilters(
    filters: any,
    options: EnhancedPaginationOptions = {}
  ): Promise<EnhancedPaginatedResult<UserWithDetails>> {
    try {
      // Build filter conditions for staff
      const conditions: FilterCondition[] = [];

      // Always filter by college
      if (filters.collegeId) {
        conditions.push({
          field: 'u.college_id',
          operator: 'eq',
          value: filters.collegeId,
        });
      }

      // Filter by department if specified
      if (filters.departmentId) {
        conditions.push({
          field: 'u.department_id',
          operator: 'eq',
          value: filters.departmentId,
        });
      }

      // Filter by specific role if specified
      if (filters.role) {
        conditions.push({
          field: 'u.role',
          operator: 'eq',
          value: filters.role,
        });
      } else if (filters.allowedRoles && filters.allowedRoles.length > 0) {
        // Filter by allowed roles (staff, hod)
        conditions.push({
          field: 'u.role',
          operator: 'in',
          values: filters.allowedRoles,
        });
      }

      // Filter by status if specified
      if (filters.status) {
        conditions.push({
          field: 'u.status',
          operator: 'eq',
          value: filters.status,
        });
      }

      // Build search options for staff-specific fields (only text fields, no UUIDs)
      const searchOptions: EnhancedPaginationOptions = {
        ...options,
        search: filters.search,
        searchFields: ['u.name', 'u.email'],
      };

      return await this.findUsersWithDetailsQuery(conditions, searchOptions, filters);
    } catch (error) {
      console.error('Failed to find staff with filters:', { error });
      throw error;
    }
  }

  /**
   * Find users with advanced filtering and role-based access control
   */
  async findUsersWithFilters(
    filters: UserFilterOptions,
    requestingUser: { role: UserRole; collegeId?: string; departmentId?: string },
    options: EnhancedPaginationOptions = {}
  ): Promise<EnhancedPaginatedResult<UserWithDetails>> {
    try {
      // Build filter conditions
      const conditions: FilterCondition[] = [];

      // Apply role-based access control
      if (requestingUser.role !== 'admin' && requestingUser.role !== 'super_admin') {
        if (requestingUser.role === 'principal' && requestingUser.collegeId) {
          conditions.push({ field: 'u.college_id', operator: 'eq', value: requestingUser.collegeId });
        } else if (['hod', 'staff'].includes(requestingUser.role) && requestingUser.departmentId) {
          conditions.push({ field: 'u.department_id', operator: 'eq', value: requestingUser.departmentId });
        }
      }

      // Apply user filters
      if (filters.role) {
        conditions.push({ field: 'u.role', operator: 'eq', value: filters.role });
      }

      if (filters.status) {
        conditions.push({ field: 'u.status', operator: 'eq', value: filters.status });
      }

      if (filters.collegeId) {
        conditions.push({ field: 'u.college_id', operator: 'eq', value: filters.collegeId });
      }

      if (filters.departmentId) {
        conditions.push({ field: 'u.department_id', operator: 'eq', value: filters.departmentId });
      }

      if (filters.emailVerified !== undefined) {
        conditions.push({ field: 'u.email_verified', operator: 'eq', value: filters.emailVerified });
      }

      if (filters.hasPhone !== undefined) {
        conditions.push({
          field: 'u.phone',
          operator: filters.hasPhone ? 'is_not_null' : 'is_null',
        });
      }

      if (filters.hasCollege !== undefined) {
        conditions.push({
          field: 'u.college_id',
          operator: filters.hasCollege ? 'is_not_null' : 'is_null',
        });
      }

      if (filters.hasDepartment !== undefined) {
        conditions.push({
          field: 'u.department_id',
          operator: filters.hasDepartment ? 'is_not_null' : 'is_null',
        });
      }

      // Unassigned filter (students without assigned resources)
      if (filters.unassigned === true) {
        conditions.push({
          field: 'u.role',
          operator: 'eq',
          value: 'student',
        });
        // Additional condition will be added in the WHERE clause to check for no assigned resources
      }

      if (filters.createdAfter) {
        conditions.push({ field: 'u.created_at', operator: 'gte', value: filters.createdAfter });
      }

      if (filters.createdBefore) {
        conditions.push({ field: 'u.created_at', operator: 'lte', value: filters.createdBefore });
      }

      if (filters.lastLoginAfter) {
        conditions.push({ field: 'u.last_login', operator: 'gte', value: filters.lastLoginAfter });
      }

      if (filters.lastLoginBefore) {
        conditions.push({ field: 'u.last_login', operator: 'lte', value: filters.lastLoginBefore });
      }

      // Build search options
      const searchOptions: EnhancedPaginationOptions = {
        ...options,
        search: filters.search,
        searchFields: ['u.name', 'u.email', 'u.roll_number', 'c.name', 'd.name'],
      };

      return await this.findUsersWithDetailsQuery(conditions, searchOptions, filters);
    } catch (error) {
      appLogger.error('Failed to find users with filters', {
        error,
        filters,
        requestingUser: { role: requestingUser.role, collegeId: requestingUser.collegeId },
      });
      throw error;
    }
  }

  /**
   * Execute complex query with joins for user details
   */
  private async findUsersWithDetailsQuery(
    conditions: FilterCondition[],
    options: EnhancedPaginationOptions,
    filters?: UserFilterOptions
  ): Promise<EnhancedPaginatedResult<UserWithDetails>> {
    const { page = 1, limit = this.defaultLimit, sortBy, sortOrder, search, searchFields = [] } = options;

    // Validate and sanitize parameters
    const validatedLimit = Math.min(Math.max(1, limit), this.maxLimit);
    const validatedPage = Math.max(1, page);
    const offset = (validatedPage - 1) * validatedLimit;
    const { sortBy: validatedSortBy, sortOrder: validatedSortOrder } = this.validateSortParams(sortBy, sortOrder);

    // Build WHERE clause
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(conditions);
    const { clause: searchClause, params: searchParams } = this.buildSearchClause(
      search,
      searchFields,
      whereParams.length + 1
    );

    // Add unassigned filter condition
    let unassignedClause = '';
    if (filters?.unassigned === true) {
      unassignedClause =
        ' AND u.id NOT IN (SELECT DISTINCT assigned_student_id FROM learning_resources WHERE assigned_student_id IS NOT NULL)';
    }

    // Combine conditions
    const finalWhereClause =
      search && searchFields.length > 0
        ? `${whereClause} AND ${searchClause}${unassignedClause}`
        : `${whereClause}${unassignedClause}`;
    const finalParams = [...whereParams, ...searchParams];

    console.log('👥 USER FILTER DEBUG:', {
      filters,
      conditions,
      whereClause,
      searchClause,
      unassignedClause,
      finalWhereClause,
      finalParams,
    });

    // Count total records
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE ${finalWhereClause}
    `;
    const countResult = await this.query(countQuery, finalParams);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with details
    const dataQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.college_id,
        u.department_id,
        u.year_of_study,
        u.course_id,
        u.phone,
        u.class_in_charge,
        u.class,
        u.semester,
        u.roll_number,
        u.profile_image_url,
        u.qualification,
        u.experience,
        u.employee_id,
        u.email_verified,
        u.last_login,
        u.created_at,
        u.updated_at,
        c.name as college_name,
        d.name as department_name,
        ${filters?.unassigned === true ? 'NULL' : 'co.name'} as course_name,
        ${filters?.unassigned === true ? '0' : 'COALESCE(resource_count.assigned_resources, 0)'} as assigned_resources_count
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      ${
        filters?.unassigned !== true
          ? `
      LEFT JOIN (
        SELECT assigned_student_id, COUNT(*) as assigned_resources
        FROM learning_resources
        WHERE assigned_student_id IS NOT NULL
        GROUP BY assigned_student_id
      ) resource_count ON u.id = resource_count.assigned_student_id
       LEFT JOIN courses co ON u.course_id = co.id
      `
          : ''
      }
      WHERE ${finalWhereClause}
      ORDER BY u.${validatedSortBy} ${validatedSortOrder}
      LIMIT $${finalParams.length + 1} OFFSET $${finalParams.length + 2}
    `;
    console.log(dataQuery);

    const dataResult = await this.query(dataQuery, [...finalParams, validatedLimit, offset]);

    const totalPages = Math.ceil(total / validatedLimit);

    // Format results
    const formattedData: UserWithDetails[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      college_id: row.college_id,
      department_id: row.department_id,
      year_of_study: row.year_of_study,
      course_id: row.course_id,
      phone: row.phone,
      class_in_charge: row.class_in_charge,
      class: row.class,
      semester: row.semester,
      roll_number: row.roll_number,
      profile_image_url: row.profile_image_url,
      qualification: row.qualification,
      experience: row.experience,
      employee_id: row.employee_id,
      email_verified: row.email_verified,
      last_login: row.last_login,
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: '', // Not included in query for security
      collegeName: row.college_name,
      departmentName: row.department_name,
      assignedresourcesCount: parseInt(row.assigned_resources_count || '0'),
      lastLoginFormatted: row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never',
      courseName: row.course_name,
    }));

    return {
      data: formattedData,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1,
      },
      filters: {
        applied: conditions,
        search,
        sortBy: validatedSortBy,
        sortOrder: validatedSortOrder.toLowerCase(),
      },
    };
  }

  /**
   * Create user with enhanced validation and audit logging
   */
  async createUserEnhanced(userData: CreateUserData, createdBy: { userId: string; role: UserRole }): Promise<User> {
    console.log('Creating user with data:', userData);
    return this.executeTransaction(async client => {
      // Validate email uniqueness
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password if provided
      let passwordHash = userData.passwordHash;
      if (userData.password && !passwordHash) {
        passwordHash = await hashPassword(userData.password);
      }

        // let academicYearId: string | null = null;

        // if (userData.courseId && userData.yearOfStudy) {
        //   const academicYear = await academicYearRepository.findByYearNameAndCourse(
        //     userData.yearOfStudy,   
        //     userData.courseId       
        //   );
        
        //   academicYearId = academicYear ? academicYear.id : null;
        // }

      // Prepare user data with proper field mapping
      const createData = {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        role: userData.role,
        phone: userData.phone || null,
        status: userData.status || ('pending' as UserStatus),
        college_id: userData.collegeId || null,
        department_id: userData.departmentId || null,
        course_id: userData.courseId || null,
        class_in_charge: userData.classInCharge || null,
        class: userData.class || null,
        semester: userData.semester || null,
        roll_number: userData.rollNumber || null,
        profile_image_url: userData.profileImageUrl || null,
        qualification: userData.qualification || null,
        experience: userData.experience || null,
        employee_id: userData.employeeId || null,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
        year_of_study: userData.yearOfStudy || null,
        section_id: userData.sectionId || null,
        academic_year_id: userData.academicYearId || null,
      };

      const fields = Object.keys(createData).join(', ');
      const placeholders = Object.keys(createData)
        .map((_, index) => `$${index + 1}`)
        .join(', ');
      const values = Object.values(createData);

      const query = `
        INSERT INTO users (${fields})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await client.query(query, values);
      const newUser = result.rows[0];

      // Log user creation
      appLogger.info('User created successfully', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdBy: createdBy.userId,
        createdByRole: createdBy.role,
      });

      return newUser;
    });
  }

  /**
   * Update user with enhanced validation and audit logging
   */
  async updateUserEnhanced(
    id: string,
    updateData: UpdateUserData,
    updatedBy: { userId: string; role: UserRole }
  ): Promise<User | null> {
    return this.executeTransaction(async client => {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validate email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.findByEmail(updateData.email);
        if (emailExists) {
          throw new Error('Email already exists');
        }
        updateData.email = updateData.email.toLowerCase();
      }

      // Prepare update data with proper field mapping
      const mappedUpdateData: any = {};

      // Map camelCase to snake_case for database fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          let dbField = key;
          // Handle specific field mappings
          switch (key) {
            case 'collegeId':
              dbField = 'college_id';
              break;
            case 'departmentId':
              dbField = 'department_id';
              break;
            case 'courseId':
              dbField = 'course_id';
              break;
            case 'classInCharge':
              dbField = 'class_in_charge';
              break;
            case 'rollNumber':
              dbField = 'roll_number';
              break;
            case 'profileImageUrl':
              dbField = 'profile_image_url';
              break;
            case 'emailVerified':
              dbField = 'email_verified';
              break;
            case 'lastLogin':
              dbField = 'last_login';
              break;
            case 'employeeId':
              dbField = 'employee_id';
              break;
            default:
              // Keep the field name as is for other fields
              dbField = key;
          }
          mappedUpdateData[dbField] = value;
        }
      });

      const finalUpdateData = {
        ...mappedUpdateData,
        updated_at: new Date(),
      };

      const fields = Object.keys(finalUpdateData);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(finalUpdateData)];

      const query = `
        UPDATE users
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      const updatedUser = result.rows[0];

      // Log user update
      appLogger.info('User updated successfully', {
        userId: id,
        updatedFields: fields,
        updatedBy: updatedBy.userId,
        updatedByRole: updatedBy.role,
      });

      return updatedUser;
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.query<User>(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Find user by roll number and department
   */
  async findByRollNumberAndDepartment(rollNumber: string, departmentId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE roll_number = $1 AND department_id = $2';
    const result = await this.query<User>(query, [rollNumber, departmentId]);
    return result.rows[0] || null;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await this.query(query, [userId]);
  }

  
  async userExist(
    id: string,
    currentYear: number
  ): Promise<{
    id: string;
    academic_year_id: string;
    start_year: string;
    end_year: string;
    current_year: string;
    images_this_year: number;
    // image_upload_approval: boolean;
  } | null> {
    const query = `
    SELECT 
      u.id,
      u.academic_year_id,
      substring(ay.year_name, 1, 4) AS start_year,
      substring(ay.year_name, 8, 4) AS end_year,
      substring(current_date::varchar, 1, 4) AS current_year,
      (
        SELECT COUNT(*) 
        FROM resource_media ti
        WHERE ti.student_id = u.id
          AND substring(ti.upload_date::varchar, 1, 4) = $2
      ) AS images_this_year
    FROM users u
    JOIN academic_years ay ON ay.id = u.academic_year_id
    WHERE u.id = $1
    LIMIT 1
  `;

    const result = await this.db.query<{
      id: string;
      academic_year_id: string;
      start_year: string;
      end_year: string;
      current_year: string;
      images_this_year: number;
      // image_upload_approval: boolean;
    }>(query, [id, currentYear.toString()]);

    console.log("result",result);
    

    return result.rows[0] || null;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<UserStatus, number>;
    recentRegistrations: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM users',
      'SELECT role, COUNT(*) as count FROM users GROUP BY role',
      'SELECT status, COUNT(*) as count FROM users GROUP BY status',
      "SELECT COUNT(*) as recent FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
    ];

    const [totalResult, roleResult, statusResult, recentResult] = await Promise.all(
      queries.map(query => this.query(query))
    );

    const byRole = {} as Record<UserRole, number>;
    roleResult.rows.forEach((row: any) => {
      byRole[row.role as UserRole] = parseInt(row.count);
    });

    const byStatus = {} as Record<UserStatus, number>;
    statusResult.rows.forEach((row: any) => {
      byStatus[row.status as UserStatus] = parseInt(row.count);
    });

    return {
      total: parseInt((totalResult.rows[0] as any)?.total || '0'),
      byRole,
      byStatus,
      recentRegistrations: parseInt((recentResult.rows[0] as any)?.recent || '0'),
    };
  }

  /**
   * Find users with resource assignment details for Student resource Assignment Management screen
   */
  async findUsersWithresourceAssignments(
    filters: UserFilterOptions = {},
    userContext: { role: string; collegeId?: string; departmentId?: string },
    options: EnhancedPaginationOptions = {}
  ): Promise<EnhancedPaginatedResult<UserWithresourceAssignment>> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);
    const validatedSortBy = this.allowedSortFields.includes(sortBy) ? sortBy : this.defaultSortField;
    const validatedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const offset = (validatedPage - 1) * validatedLimit;

    // Build WHERE conditions based on filters and user context
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    // Role-based access control
    if (userContext.role === 'hod' && userContext.departmentId) {
      conditions.push(`u.department_id = $${paramIndex}`);
      params.push(userContext.departmentId);
      paramIndex++;
    } else if (userContext.role === 'staff' && userContext.departmentId) {
      conditions.push(`u.department_id = $${paramIndex}`);
      params.push(userContext.departmentId);
      paramIndex++;
    } else if (userContext.role === 'principal' && userContext.collegeId) {
      conditions.push(`u.college_id = $${paramIndex}`);
      params.push(userContext.collegeId);
      paramIndex++;
    }

    // Apply filters
    if (filters.role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(filters.role);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.departmentId) {
      conditions.push(`u.department_id = $${paramIndex}`);
      params.push(filters.departmentId);
      paramIndex++;
    }

    if (filters.courseId) {
      conditions.push(`u.course_id = $${paramIndex}`);
      params.push(filters.courseId);
      paramIndex++;
    }

    if (filters.academicYearId) {
      conditions.push(`u.academic_year_id = $${paramIndex}`);
      params.push(filters.academicYearId);
      paramIndex++;
    }

    if (filters.section) {
      conditions.push(`s.name ILIKE $${paramIndex}`);
      params.push(`%${filters.section}%`);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        u.name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.roll_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Assignment status filter
    if (filters.assignmentStatus === 'assigned') {
      conditions.push(`t.id IS NOT NULL`);
    } else if (filters.assignmentStatus === 'unassigned') {
      conditions.push(`t.id IS NULL`);
    }

    // Unassigned filter (legacy support)
    if (filters.unassigned === true) {
      conditions.push(`t.id IS NULL`);
    }

    const whereClause = conditions.join(' AND ');

    // Count total records
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN courses co ON u.course_id = co.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      LEFT JOIN learning_resources t ON u.id = t.assigned_student_id
      WHERE ${whereClause}
    `;

    const countResult = await this.query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any)?.total || '0', 10);

    // Fetch paginated data with resource assignment details
    const dataQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.college_id,
        u.department_id,
        u.course_id,
        u.section_id,
        u.academic_year_id,
        u.phone,
        u.roll_number,
        u.profile_image_url,
        u.email_verified,
        u.last_login,
        u.created_at,
        u.updated_at,
        u.year_of_study,
        c.name as college_name,
        d.name as department_name,
        co.name as course_name,
        s.name as section_name,
        ay.year_name as academic_year_name,
        t.id as resource_id,
        t.resource_code,
        t.category as resource_category,
        t.location_description as resource_location_description,
        t.assignment_date as resource_started_date,
        t.status as resource_status,
        t.assigned_date as resource_assigned_date
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN courses co ON u.course_id = co.id
      LEFT JOIN sections s ON u.section_id = s.id
      LEFT JOIN academic_years ay ON u.academic_year_id = ay.id
      LEFT JOIN learning_resources t ON u.id = t.assigned_student_id
      WHERE ${whereClause}
      ORDER BY u.${validatedSortBy} ${validatedSortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.query(dataQuery, [...params, validatedLimit, offset]);
    const totalPages = Math.ceil(total / validatedLimit);

    // Format results with resource assignment data
    const formattedData: UserWithresourceAssignment[] = dataResult.rows.map((row: any) => {
      // Create resource assignment object if resource data exists
      const resourceAssignment = row.resource_id ? {
        id: row.resource_id,
        resourceCode: row.resource_code,
        category: row.resource_category,
        locationDescription: row.resource_location_description,
        startedDate: row.resource_started_date,
        status: row.resource_status,
        assignedDate: row.resource_assigned_date
      } : null;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        college_id: row.college_id,
        department_id: row.department_id,
        course_id: row.course_id,
        section_id: row.section_id,
        academic_year_id: row.academic_year_id,
        phone: row.phone,
        roll_number: row.roll_number,
        profile_image_url: row.profile_image_url,
        email_verified: row.email_verified,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
        password_hash: '', // Not included for security
        year_of_study: row.year_of_study,
        collegeName: row.college_name,
        departmentName: row.department_name,
        courseName: row.course_name,
        sectionName: row.section_name,
        academicYearName: row.academic_year_name,
        resourceAssignment: resourceAssignment
      };
    });

    return {
      data: formattedData,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1
      }
    };
  }
}

// Export singleton instance
export const enhancedUserRepository = new EnhancedUserRepository();
