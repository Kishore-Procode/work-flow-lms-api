import { BaseRepository, PaginatedResult, PaginationOptions } from '../../../models/base.repository';
import { College, CollegeStatus,State,District} from '../../../types';

export interface CreateCollegeData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  established?: string;
  principalId?: string;
  status?: CollegeStatus;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  total_students?: number;
  total_faculty?: number;
  college_type?: string;
  affiliated_university?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UpdateCollegeData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  established?: string;
  principalId?: string;
  status?: CollegeStatus;
}

export interface CollegeWithPrincipal extends College {
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
}

export class CollegeRepository extends BaseRepository<College> {
  constructor() {
    super('colleges');
  }

  /**
   * Override base findAll to return properly mapped columns
   */
  async findAll(options: any = {}): Promise<any> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM colleges`;
    const countResult = await this.query(countQuery);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with proper column mapping
    const dataQuery = `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        website,
        established,
        status,
        principal_id as "principalId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM colleges
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    const dataResult = await this.query<College>(dataQuery, [limit, offset]);

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
   * Find college by email
   */
  async findByEmail(email: string): Promise<College | null> {
    const query = 'SELECT * FROM colleges WHERE email = $1';
    const result = await this.query<College>(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find college by name
   */
  async findByName(name: string): Promise<College | null> {
    const query = 'SELECT * FROM colleges WHERE name = $1';
    const result = await this.query<College>(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Find college by code
   */
  async findByCode(code: string): Promise<College | null> {
    const query = 'SELECT * FROM colleges WHERE code = $1';
    const result = await this.query<College>(query, [code.toUpperCase()]);
    return result.rows[0] || null;
  }

  /**
   * Find colleges by status
   */
  async findByStatus(status: CollegeStatus, options: PaginationOptions = {}): Promise<PaginatedResult<College>> {
    return this.findWhere('status = $1', [status], options);
  }

  /**
   * Find college with principal details
   */
  async findByIdWithPrincipal(id: string): Promise<CollegeWithPrincipal | null> {
    const query = `
      SELECT 
        c.*,
        u.name as principal_name,
        u.email as principal_email,
        u.phone as principal_phone
      FROM colleges c
      LEFT JOIN users u ON c.principal_id = u.id
      WHERE c.id = $1
    `;

    const result = await this.query<CollegeWithPrincipal>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all colleges with principal details
   */
  async findAllWithPrincipal(options: PaginationOptions & { status?: string; search?: string } = {}): Promise<PaginatedResult<CollegeWithPrincipal>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      search
    } = options;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM colleges c ${whereClause}`;
    const countResult = await this.query(countQuery, queryParams);
    const total = parseInt((countResult.rows[0] as any)?.count || '0', 10);

    // Fetch paginated data with principal details
    // Convert camelCase to snake_case for database columns
    const dbSortBy = sortBy === 'createdAt' ? 'created_at' :
                     sortBy === 'updatedAt' ? 'updated_at' :
                     sortBy === 'principalId' ? 'principal_id' :
                     sortBy;

    const dataQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.website,
        c.established,
        c.status,
        c.principal_id as "principalId",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        u.name as principal_name,
        u.email as principal_email,
        u.phone as principal_phone
      FROM colleges c
      LEFT JOIN users u ON c.principal_id = u.id
      ${whereClause}
      ORDER BY c.${dbSortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...queryParams, limit, offset];
    const dataResult = await this.query<CollegeWithPrincipal>(dataQuery, dataParams);

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
   * Find all active colleges for dropdown use
   */
  async findActiveColleges(): Promise<College[]> {
    const query = `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        website,
        established,
        status,
        principal_id as "principalId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM colleges
      WHERE status = 'active'
      ORDER BY name ASC
    `;

    const result = await this.query<College>(query);
    return result.rows;
  }

  /**
   * Create a new college
   */
  async createCollege(collegeData: CreateCollegeData): Promise<College> {
    const query = `
      INSERT INTO colleges (
        name, address, phone, email, website, established, principal_id, status,
        principal_name, principal_email, principal_phone, total_students, total_faculty,
        college_type, affiliated_university, city, state, pincode
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      collegeData.name,
      collegeData.address,
      collegeData.phone,
      collegeData.email,
      collegeData.website || null,
      collegeData.established || null,
      collegeData.principalId || null,
      collegeData.status || 'active',
      collegeData.principal_name || null,
      collegeData.principal_email || null,
      collegeData.principal_phone || null,
      collegeData.total_students || null,
      collegeData.total_faculty || null,
      collegeData.college_type || null,
      collegeData.affiliated_university || null,
      collegeData.city || null,
      collegeData.state || null,
      collegeData.pincode || null,
    ];

    const result = await this.query<College>(query, values);
    return result.rows[0];
  }

  /**
   * Update college data
   */
  async updateCollege(id: string, collegeData: UpdateCollegeData): Promise<College | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 2; // Start from 2 because $1 is the ID

    // Build dynamic update query
    Object.entries(collegeData).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id); // No updates, return current college
    }

    const query = `
      UPDATE colleges
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query<College>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Assign principal to college
   */
  async assignPrincipal(collegeId: string, principalId: string): Promise<boolean> {
    const query = `
      UPDATE colleges
      SET principal_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [collegeId, principalId]);
    return result.rowCount > 0;
  }

  /**
   * Find college by principal ID
   */
  async findByPrincipalId(principalId: string): Promise<College | null> {
    const query = 'SELECT * FROM colleges WHERE principal_id = $1';
    const result = await this.query<College>(query, [principalId]);
    return result.rows[0] || null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM colleges WHERE email = $1';
    const params: any[] = [email];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Check if college name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT 1 FROM colleges WHERE name = $1';
    const params: any[] = [name];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Get college statistics
   */
  async getStatistics(): Promise<{
    totalColleges: number;
    collegesByStatus: Record<CollegeStatus, number>;
    collegesWithPrincipal: number;
    collegesWithoutPrincipal: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM colleges',
      'SELECT status, COUNT(*) as count FROM colleges GROUP BY status',
      'SELECT COUNT(*) as count FROM colleges WHERE principal_id IS NOT NULL',
      'SELECT COUNT(*) as count FROM colleges WHERE principal_id IS NULL',
    ];

    const [totalResult, statusResult, withPrincipalResult, withoutPrincipalResult] = await Promise.all(
      queries.map(query => this.query(query))
    );

    const collegesByStatus = {} as Record<CollegeStatus, number>;

    statusResult.rows.forEach(row => {
      collegesByStatus[row.status as CollegeStatus] = parseInt((row as any).count, 10);
    });

    return {
      totalColleges: parseInt((totalResult.rows[0] as any)?.total || '0', 10),
      collegesByStatus,
      collegesWithPrincipal: parseInt((withPrincipalResult.rows[0] as any)?.count || '0', 10),
      collegesWithoutPrincipal: parseInt((withoutPrincipalResult.rows[0] as any)?.count || '0', 10),
    };
  }

  async getstate(): Promise<State[]> {
    const query = `
      SELECT
        id,
        name
      FROM states
      ORDER BY name ASC
    `;
    
    const result = await this.query<State>(query);
    console.log("result",result);
    
    return result.rows;
  }

  async getDistricts(): Promise<District[]>{

    const query=`
      SELECT
      id,
      name,
      state_id
      FROM districts
      ORDER BY name ASC
    `;

    const result =  await this.query<District>(query);
    console.log(result);

    return result.rows
    

  }

  // async findActiveColleges(): Promise<College[]> {
  //   const query = `
  //     SELECT
  //       id,
  //       name,
  //       email,
  //       phone,
  //       address,
  //       website,
  //       established,
  //       status,
  //       principal_id as "principalId",
  //       created_at as "createdAt",
  //       updated_at as "updatedAt"
  //     FROM colleges
  //     WHERE status = 'active'
  //     ORDER BY name ASC
  //   `;

  //   const result = await this.query<College>(query);
  //   return result.rows;
  // }
}



// Create singleton instance
export const collegeRepository = new CollegeRepository();
