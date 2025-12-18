/**
 * Assign Learning Resource Request DTO
 * 
 * Input DTO for assigning a learning resource to a student.
 * Handles validation and conversion from HTTP requests.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class AssignLearningResourceRequest {
  public readonly resourceId: string;
  public readonly studentId: string;
  public readonly assignmentDate?: Date;
  public readonly notes?: string;
  public readonly requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };

  private constructor(data: {
    resourceId: string;
    studentId: string;
    assignmentDate?: Date;
    notes?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }) {
    this.resourceId = data.resourceId;
    this.studentId = data.studentId;
    this.assignmentDate = data.assignmentDate;
    this.notes = data.notes;
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
  ): AssignLearningResourceRequest {
    return new AssignLearningResourceRequest({
      resourceId: body.resourceId,
      studentId: body.studentId,
      assignmentDate: body.assignmentDate ? new Date(body.assignmentDate) : undefined,
      notes: body.notes,
      requestingUser,
    });
  }

  /**
   * Create from plain object
   */
  public static fromPlainObject(data: {
    resourceId: string;
    studentId: string;
    assignmentDate?: Date;
    notes?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }): AssignLearningResourceRequest {
    return new AssignLearningResourceRequest(data);
  }

  /**
   * Validate the request
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!this.resourceId?.trim()) {
      errors.push('Resource ID is required');
    }

    if (!this.studentId?.trim()) {
      errors.push('Student ID is required');
    }

    if (!this.requestingUser?.id?.trim()) {
      errors.push('Requesting user ID is required');
    }

    if (!this.requestingUser?.role?.trim()) {
      errors.push('Requesting user role is required');
    }

    // Validate UUID format for IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (this.resourceId && !uuidRegex.test(this.resourceId)) {
      errors.push('Invalid resource ID format');
    }

    if (this.studentId && !uuidRegex.test(this.studentId)) {
      errors.push('Invalid student ID format');
    }

    if (this.requestingUser?.id && !uuidRegex.test(this.requestingUser.id)) {
      errors.push('Invalid requesting user ID format');
    }

    // Validate assignment date
    if (this.assignmentDate) {
      const now = new Date();
      const maxFutureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      if (this.assignmentDate > maxFutureDate) {
        errors.push('Assignment date cannot be more than 30 days in the future');
      }

      // Allow past dates for backdating assignments
      const minPastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      if (this.assignmentDate < minPastDate) {
        errors.push('Assignment date cannot be more than 1 year in the past');
      }
    }

    // Validate notes length
    if (this.notes && this.notes.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }

    // Validate authorization
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff'];
    if (!allowedRoles.includes(this.requestingUser.role)) {
      errors.push('Only admin, principal, HOD, or staff can assign learning resources');
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
   * Get effective assignment date
   */
  public getEffectiveAssignmentDate(): Date {
    return this.assignmentDate || new Date();
  }

  /**
   * Check if requesting user can assign resources
   */
  public canAssignResource(): boolean {
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff'];
    return allowedRoles.includes(this.requestingUser.role);
  }

  /**
   * Check if assignment is being backdated
   */
  public isBackdated(): boolean {
    if (!this.assignmentDate) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const assignmentDay = new Date(
      this.assignmentDate.getFullYear(),
      this.assignmentDate.getMonth(),
      this.assignmentDate.getDate()
    );
    
    return assignmentDay < today;
  }

  /**
   * Check if assignment is scheduled for future
   */
  public isFutureScheduled(): boolean {
    if (!this.assignmentDate) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const assignmentDay = new Date(
      this.assignmentDate.getFullYear(),
      this.assignmentDate.getMonth(),
      this.assignmentDate.getDate()
    );
    
    return assignmentDay > today;
  }

  /**
   * Get assignment priority based on role and timing
   */
  public getAssignmentPriority(): number {
    let priority = 50; // Base priority

    // Role-based priority adjustment
    switch (this.requestingUser.role) {
      case 'super_admin':
        priority += 30;
        break;
      case 'admin':
        priority += 25;
        break;
      case 'principal':
        priority += 20;
        break;
      case 'hod':
        priority += 15;
        break;
      case 'staff':
        priority += 10;
        break;
    }

    // Timing-based priority adjustment
    if (this.isBackdated()) {
      priority -= 10; // Lower priority for backdated assignments
    } else if (this.isFutureScheduled()) {
      priority -= 5; // Slightly lower priority for future assignments
    }

    return Math.max(0, Math.min(100, priority));
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      resourceId: this.resourceId,
      studentId: this.studentId,
      assignmentDate: this.assignmentDate?.toISOString(),
      notes: this.notes,
      requestingUser: this.requestingUser,
    };
  }
}
