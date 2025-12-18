/**
 * Login User Request DTO
 * 
 * Data Transfer Object for login user use case input.
 * Defines the structure of data required for user authentication.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class LoginUserRequest {
  public readonly email: string;
  public readonly password: string;
  public readonly selectedRole?: string;
  public readonly allowedRoles?: string[];

  constructor(data: {
    email: string;
    password: string;
    selectedRole?: string;
    allowedRoles?: string[];
  }) {
    this.email = data.email;
    this.password = data.password;
    this.selectedRole = data.selectedRole;
    this.allowedRoles = data.allowedRoles;
  }

  /**
   * Create from plain object (e.g., HTTP request body)
   */
  public static fromPlainObject(data: any): LoginUserRequest {
    return new LoginUserRequest({
      email: data.email,
      password: data.password,
      selectedRole: data.selectedRole,
      allowedRoles: data.allowedRoles,
    });
  }

  /**
   * Validate the request data
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.email) {
      errors.push('Email is required');
    } else if (typeof this.email !== 'string') {
      errors.push('Email must be a string');
    } else if (this.email.trim().length === 0) {
      errors.push('Email cannot be empty');
    }

    if (!this.password) {
      errors.push('Password is required');
    } else if (typeof this.password !== 'string') {
      errors.push('Password must be a string');
    } else if (this.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (this.selectedRole && typeof this.selectedRole !== 'string') {
      errors.push('Selected role must be a string');
    }

    if (this.allowedRoles && !Array.isArray(this.allowedRoles)) {
      errors.push('Allowed roles must be an array');
    }

    return errors;
  }

  /**
   * Check if the request is valid
   */
  public isValid(): boolean {
    return this.validate().length === 0;
  }
}
