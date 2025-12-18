/**
 * Get Departments Request DTO
 * 
 * Input DTO for retrieving departments with filters and pagination.
 * Handles validation and conversion from HTTP requests.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class GetDepartmentsRequest {
  public readonly collegeId?: string;
  public readonly courseId?: string;
  public readonly hodId?: string;
  public readonly isActive?: boolean;
  public readonly search?: string;
  public readonly page: number;
  public readonly limit: number;
  public readonly requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };

  private constructor(data: {
    collegeId?: string;
    courseId?: string;
    hodId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }) {
    this.collegeId = data.collegeId;
    this.courseId = data.courseId;
    this.hodId = data.hodId;
    this.isActive = data.isActive;
    this.search = data.search;
    this.page = Math.max(1, data.page || 1);
    this.limit = Math.min(100, Math.max(1, data.limit || 25));
    this.requestingUser = data.requestingUser;
  }

  /**
   * Create from HTTP request
   */
  public static fromHttpRequest(
    query: any,
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    }
  ): GetDepartmentsRequest {
    return new GetDepartmentsRequest({
      collegeId: query.collegeId,
      courseId: query.courseId,
      hodId: query.hodId,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      requestingUser,
    });
  }

  /**
   * Create from plain object
   */
  public static fromPlainObject(data: {
    collegeId?: string;
    courseId?: string;
    hodId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }): GetDepartmentsRequest {
    return new GetDepartmentsRequest(data);
  }

  /**
   * Validate the request
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Validate requesting user
    if (!this.requestingUser?.id?.trim()) {
      errors.push('Requesting user ID is required');
    }

    if (!this.requestingUser?.role?.trim()) {
      errors.push('Requesting user role is required');
    }

    // Validate UUID format for IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (this.collegeId && !uuidRegex.test(this.collegeId)) {
      errors.push('Invalid college ID format');
    }

    if (this.courseId && !uuidRegex.test(this.courseId)) {
      errors.push('Invalid course ID format');
    }

    if (this.hodId && !uuidRegex.test(this.hodId)) {
      errors.push('Invalid HOD ID format');
    }

    if (this.requestingUser?.id && !uuidRegex.test(this.requestingUser.id)) {
      errors.push('Invalid requesting user ID format');
    }

    // Validate pagination
    if (this.page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (this.limit < 1 || this.limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }

    // Validate search length
    if (this.search && this.search.length > 255) {
      errors.push('Search term cannot exceed 255 characters');
    }

    return errors;
  }

  /**
   * Check if request is valid
   */
  public isValid(): boolean {
    return this.validate().length === 0;
  }

  /**
   * Apply role-based filtering
   */
  public applyRoleBasedFiltering(): {
    collegeId?: string;
    courseId?: string;
    hodId?: string;
    isActive?: boolean;
    search?: string;
  } {
    const filter: any = {
      courseId: this.courseId,
      hodId: this.hodId,
      isActive: this.isActive,
      search: this.search,
    };

    // Apply role-based college filtering
    if (this.requestingUser.role === 'super_admin' || this.requestingUser.role === 'admin') {
      // Super admin and admin can see all departments
      filter.collegeId = this.collegeId;
    } else if (this.requestingUser.role === 'principal') {
      // Principal can only see departments in their college
      filter.collegeId = this.requestingUser.collegeId;
    } else if (this.requestingUser.role === 'hod') {
      // HOD can see departments in their college, with preference for their own
      filter.collegeId = this.requestingUser.collegeId;
    } else if (this.requestingUser.role === 'staff') {
      // Staff can see departments in their college
      filter.collegeId = this.requestingUser.collegeId;
    } else if (this.requestingUser.role === 'student') {
      // Students can see departments in their college
      filter.collegeId = this.requestingUser.collegeId;
      // Students can only see active departments
      filter.isActive = true;
    }

    return filter;
  }

  /**
   * Get effective page number
   */
  public getEffectivePage(): number {
    return this.page;
  }

  /**
   * Get effective limit
   */
  public getEffectiveLimit(): number {
    return this.limit;
  }

  /**
   * Check if user can access all colleges
   */
  public canAccessAllColleges(): boolean {
    return ['super_admin', 'admin'].includes(this.requestingUser.role);
  }

  /**
   * Check if user can see inactive departments
   */
  public canSeeInactiveDepartments(): boolean {
    return ['super_admin', 'admin', 'principal', 'hod'].includes(this.requestingUser.role);
  }

  /**
   * Get user's college constraint
   */
  public getUserCollegeConstraint(): string | undefined {
    if (this.canAccessAllColleges()) {
      return this.collegeId; // Use requested college or none
    }
    return this.requestingUser.collegeId; // Use user's college
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      collegeId: this.collegeId,
      courseId: this.courseId,
      hodId: this.hodId,
      isActive: this.isActive,
      search: this.search,
      page: this.page,
      limit: this.limit,
      requestingUser: this.requestingUser,
    };
  }
}
