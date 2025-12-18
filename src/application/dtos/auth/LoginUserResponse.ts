/**
 * Login User Response DTO
 * 
 * Data Transfer Object for login user use case output.
 * Defines the structure of data returned after successful authentication.
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

export class LoginUserResponse {
  public readonly user: UserResponseData;
  public readonly token: string;
  public readonly refreshToken: string;

  constructor(data: {
    user: UserResponseData;
    token: string;
    refreshToken: string;
  }) {
    this.user = data.user;
    this.token = data.token;
    this.refreshToken = data.refreshToken;
  }

  /**
   * Convert to plain object for API response
   */
  public toPlainObject(): any {
    return {
      user: this.user,
      token: this.token,
      refreshToken: this.refreshToken,
    };
  }

  /**
   * Convert to API response format (matching current system)
   */
  public toApiResponse(): any {
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: this.user,
        token: this.token,
        refreshToken: this.refreshToken,
      },
    };
  }

  /**
   * Get user summary for logging/auditing
   */
  public getUserSummary(): string {
    return `User ${this.user.name} (${this.user.email}) logged in with role ${this.user.role}`;
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: string): boolean {
    return this.user.role === role;
  }

  /**
   * Check if user belongs to specific college
   */
  public belongsToCollege(collegeId: string): boolean {
    return this.user.collegeId === collegeId;
  }

  /**
   * Check if user belongs to specific department
   */
  public belongsToDepartment(departmentId: string): boolean {
    return this.user.departmentId === departmentId;
  }
}
