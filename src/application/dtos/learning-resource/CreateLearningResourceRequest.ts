/**
 * Create Learning Resource Request DTO
 * 
 * Input DTO for creating a new learning resource.
 * Handles validation and conversion from HTTP requests.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ResourceCode } from '../../../domain/value-objects/ResourceCode';
import { Location } from '../../../domain/value-objects/Location';

export class CreateLearningResourceRequest {
  public readonly resourceCode: string;
  public readonly title: string;
  public readonly description?: string;
  public readonly category: string;
  public readonly location?: string;
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly notes?: string;
  public readonly requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };

  private constructor(data: {
    resourceCode: string;
    title: string;
    description?: string;
    category: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }) {
    this.resourceCode = data.resourceCode;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.location = data.location;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
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
  ): CreateLearningResourceRequest {
    return new CreateLearningResourceRequest({
      resourceCode: body.resourceCode,
      title: body.title,
      description: body.description,
      category: body.category,
      location: body.location,
      latitude: body.latitude ? parseFloat(body.latitude) : undefined,
      longitude: body.longitude ? parseFloat(body.longitude) : undefined,
      notes: body.notes,
      requestingUser,
    });
  }

  /**
   * Create from plain object
   */
  public static fromPlainObject(data: {
    resourceCode: string;
    title: string;
    description?: string;
    category: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }): CreateLearningResourceRequest {
    return new CreateLearningResourceRequest(data);
  }

  /**
   * Validate the request
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!this.resourceCode?.trim()) {
      errors.push('Resource code is required');
    }

    if (!this.title?.trim()) {
      errors.push('Title is required');
    }

    if (!this.category?.trim()) {
      errors.push('Category is required');
    }

    if (!this.requestingUser?.id?.trim()) {
      errors.push('Requesting user ID is required');
    }

    if (!this.requestingUser?.role?.trim()) {
      errors.push('Requesting user role is required');
    }

    // Validate field lengths
    if (this.title && this.title.length > 255) {
      errors.push('Title cannot exceed 255 characters');
    }

    if (this.description && this.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    if (this.category && this.category.length > 100) {
      errors.push('Category cannot exceed 100 characters');
    }

    if (this.location && this.location.length > 500) {
      errors.push('Location cannot exceed 500 characters');
    }

    if (this.notes && this.notes.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }

    // Validate resource code format
    if (this.resourceCode) {
      try {
        ResourceCode.create(this.resourceCode);
      } catch (error) {
        errors.push('Invalid resource code format');
      }
    }

    // Validate coordinates if provided
    if (this.latitude !== undefined || this.longitude !== undefined) {
      if (this.latitude === undefined || this.longitude === undefined) {
        errors.push('Both latitude and longitude must be provided together');
      } else {
        try {
          Location.create(this.latitude, this.longitude);
        } catch (error) {
          errors.push('Invalid latitude or longitude values');
        }
      }
    }

    // Validate UUID format for user ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (this.requestingUser?.id && !uuidRegex.test(this.requestingUser.id)) {
      errors.push('Invalid requesting user ID format');
    }

    // Validate authorization
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff'];
    if (!allowedRoles.includes(this.requestingUser.role)) {
      errors.push('Only admin, principal, HOD, or staff can create learning resources');
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
   * Get normalized resource code
   */
  public getNormalizedResourceCode(): ResourceCode {
    return ResourceCode.create(this.resourceCode.toUpperCase().trim());
  }

  /**
   * Get normalized title
   */
  public getNormalizedTitle(): string {
    return this.title.trim();
  }

  /**
   * Get normalized category
   */
  public getNormalizedCategory(): string {
    return this.category.trim().toLowerCase();
  }

  /**
   * Get location object if coordinates provided
   */
  public getLocationObject(): Location | undefined {
    if (this.latitude !== undefined && this.longitude !== undefined) {
      return Location.create(this.latitude, this.longitude);
    }
    return undefined;
  }

  /**
   * Check if requesting user can create resources
   */
  public canCreateResource(): boolean {
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff'];
    return allowedRoles.includes(this.requestingUser.role);
  }

  /**
   * Get effective college ID for resource creation
   */
  public getEffectiveCollegeId(): string | undefined {
    // Super admin and admin can create in any college (would need college parameter)
    if (['super_admin', 'admin'].includes(this.requestingUser.role)) {
      return this.requestingUser.collegeId; // Use user's college as default
    }

    // Other roles create in their own college
    return this.requestingUser.collegeId;
  }

  /**
   * Get effective department ID for resource creation
   */
  public getEffectiveDepartmentId(): string | undefined {
    // HOD creates in their department
    if (this.requestingUser.role === 'hod') {
      return this.requestingUser.departmentId;
    }

    // Staff creates in their department
    if (this.requestingUser.role === 'staff') {
      return this.requestingUser.departmentId;
    }

    // Others can create across departments (would need department parameter)
    return undefined;
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      resourceCode: this.resourceCode,
      title: this.title,
      description: this.description,
      category: this.category,
      location: this.location,
      latitude: this.latitude,
      longitude: this.longitude,
      notes: this.notes,
      requestingUser: this.requestingUser,
    };
  }
}
