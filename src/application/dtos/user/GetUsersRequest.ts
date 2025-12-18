/**
 * Get Users Request DTO
 * 
 * Data Transfer Object for get users use case input.
 * Defines the structure of data required for user retrieval with filters.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export interface RequestingUser {
  id: string;
  role: string;
  collegeId?: string;
  departmentId?: string;
}

export class GetUsersRequest {
  public readonly requestingUser: RequestingUser;
  public readonly role?: string;
  public readonly status?: string;
  public readonly collegeId?: string;
  public readonly departmentId?: string;
  public readonly search?: string;
  public readonly page?: number;
  public readonly limit?: number;

  constructor(data: {
    requestingUser: RequestingUser;
    role?: string;
    status?: string;
    collegeId?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    this.requestingUser = data.requestingUser;
    this.role = data.role;
    this.status = data.status;
    this.collegeId = data.collegeId;
    this.departmentId = data.departmentId;
    this.search = data.search;
    this.page = data.page;
    this.limit = data.limit;
  }

  /**
   * Create from HTTP request (query params and user context)
   */
  public static fromHttpRequest(query: any, requestingUser: RequestingUser): GetUsersRequest {
    return new GetUsersRequest({
      requestingUser,
      role: query.role,
      status: query.status,
      collegeId: query.collegeId,
      departmentId: query.departmentId,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  /**
   * Validate the request data
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.requestingUser) {
      errors.push('Requesting user is required');
    } else {
      if (!this.requestingUser.id) {
        errors.push('Requesting user ID is required');
      }
      if (!this.requestingUser.role) {
        errors.push('Requesting user role is required');
      }
    }

    if (this.page && (this.page < 1 || !Number.isInteger(this.page))) {
      errors.push('Page must be a positive integer');
    }

    if (this.limit && (this.limit < 1 || this.limit > 100 || !Number.isInteger(this.limit))) {
      errors.push('Limit must be an integer between 1 and 100');
    }

    if (this.role && typeof this.role !== 'string') {
      errors.push('Role must be a string');
    }

    if (this.status && typeof this.status !== 'string') {
      errors.push('Status must be a string');
    }

    if (this.search && typeof this.search !== 'string') {
      errors.push('Search must be a string');
    }

    return errors;
  }

  /**
   * Check if the request is valid
   */
  public isValid(): boolean {
    return this.validate().length === 0;
  }

  /**
   * Get effective page (default to 1)
   */
  public getEffectivePage(): number {
    return this.page || 1;
  }

  /**
   * Get effective limit (default to 25)
   */
  public getEffectiveLimit(): number {
    return this.limit || 25;
  }
}
