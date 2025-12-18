/**
 * Get Users Response DTO
 * 
 * Data Transfer Object for get users use case output.
 * Defines the structure of data returned when retrieving users.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export interface UserResponseData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  collegeId?: string;
  departmentId?: string;
  rollNumber?: string;
  year?: number;
  section?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class GetUsersResponse {
  public readonly users: UserResponseData[];
  public readonly pagination: PaginationData;

  constructor(data: {
    users: UserResponseData[];
    pagination: PaginationData;
  }) {
    this.users = data.users;
    this.pagination = data.pagination;
  }

  /**
   * Convert to API response format (matching current system)
   */
  public toApiResponse(): any {
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: this.users,
      pagination: this.pagination,
    };
  }

  /**
   * Get total count of users
   */
  public getTotalCount(): number {
    return this.pagination.total;
  }

  /**
   * Check if there are more pages
   */
  public hasMorePages(): boolean {
    return this.pagination.page < this.pagination.totalPages;
  }

  /**
   * Get users by role
   */
  public getUsersByRole(role: string): UserResponseData[] {
    return this.users.filter(user => user.role === role);
  }

  /**
   * Get users by status
   */
  public getUsersByStatus(status: string): UserResponseData[] {
    return this.users.filter(user => user.status === status);
  }

  /**
   * Get users by college
   */
  public getUsersByCollege(collegeId: string): UserResponseData[] {
    return this.users.filter(user => user.collegeId === collegeId);
  }

  /**
   * Get users by department
   */
  public getUsersByDepartment(departmentId: string): UserResponseData[] {
    return this.users.filter(user => user.departmentId === departmentId);
  }

  /**
   * Get summary statistics
   */
  public getStatistics(): {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    this.users.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      byStatus[user.status] = (byStatus[user.status] || 0) + 1;
    });

    return {
      total: this.users.length,
      byRole,
      byStatus,
    };
  }
}
