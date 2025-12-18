/**
 * Create Department Request DTO
 * 
 * Input DTO for creating a new department.
 * Handles validation and conversion from HTTP requests.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class CreateDepartmentRequest {
  public readonly name: string;
  public readonly code: string;
  public readonly collegeId: string;
  public readonly courseId?: string;
  public readonly hodId?: string;
  public readonly established?: string;
  public readonly requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };

  private constructor(data: {
    name: string;
    code: string;
    collegeId: string;
    courseId?: string;
    hodId?: string;
    established?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }) {
    this.name = data.name;
    this.code = data.code;
    this.collegeId = data.collegeId;
    this.courseId = data.courseId;
    this.hodId = data.hodId;
    this.established = data.established;
    this.requestingUser = data.requestingUser;
  }

  /**
   * Create from HTTP request
   */
  public static fromHttpRequest(
    body: any,
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    }
  ): CreateDepartmentRequest {
    return new CreateDepartmentRequest({
      name: body.name,
      code: body.code,
      collegeId: body.collegeId,
      courseId: body.courseId,
      hodId: body.hodId,
      established: body.established,
      requestingUser,
    });
  }

  /**
   * Create from plain object
   */
  public static fromPlainObject(data: {
    name: string;
    code: string;
    collegeId: string;
    courseId?: string;
    hodId?: string;
    established?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }): CreateDepartmentRequest {
    return new CreateDepartmentRequest(data);
  }

  /**
   * Validate the request
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!this.name?.trim()) {
      errors.push('Department name is required');
    }

    if (!this.code?.trim()) {
      errors.push('Department code is required');
    }

    if (!this.collegeId?.trim()) {
      errors.push('College ID is required');
    }

    if (!this.requestingUser?.id?.trim()) {
      errors.push('Requesting user ID is required');
    }

    if (!this.requestingUser?.role?.trim()) {
      errors.push('Requesting user role is required');
    }

    // Validate field formats
    if (this.name && this.name.length > 255) {
      errors.push('Department name cannot exceed 255 characters');
    }

    if (this.code && !/^[A-Z0-9]{2,10}$/.test(this.code.toUpperCase())) {
      errors.push('Department code must be 2-10 alphanumeric characters');
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

    // Validate established year
    if (this.established) {
      const year = parseInt(this.established, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        errors.push('Established year must be between 1800 and current year');
      }
    }

    // Validate authorization
    const allowedRoles = ['super_admin', 'admin', 'principal'];
    if (!allowedRoles.includes(this.requestingUser.role)) {
      errors.push('Only super admin, admin, or principal can create departments');
    }

    // Validate college association for principal
    if (this.requestingUser.role === 'principal') {
      if (!this.requestingUser.collegeId) {
        errors.push('Principal must be associated with a college');
      }
      if (this.requestingUser.collegeId !== this.collegeId) {
        errors.push('Principal can only create departments in their own college');
      }
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
   * Get normalized department code
   */
  public getNormalizedCode(): string {
    return this.code.toUpperCase().trim();
  }

  /**
   * Get normalized department name
   */
  public getNormalizedName(): string {
    return this.name.trim();
  }

  /**
   * Check if requesting user can create in this college
   */
  public canCreateInCollege(): boolean {
    const allowedRoles = ['super_admin', 'admin'];
    if (allowedRoles.includes(this.requestingUser.role)) {
      return true;
    }

    if (this.requestingUser.role === 'principal') {
      return this.requestingUser.collegeId === this.collegeId;
    }

    return false;
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      name: this.name,
      code: this.code,
      collegeId: this.collegeId,
      courseId: this.courseId,
      hodId: this.hodId,
      established: this.established,
      requestingUser: this.requestingUser,
    };
  }
}
