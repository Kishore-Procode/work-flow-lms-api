/**
 * Course Domain Entity
 * 
 * Represents an academic course/program offered by a college.
 * Contains business rules for course management and validation.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export type CourseType = 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate' | 'professional';

export interface CourseProps {
  id: string;
  name: string;
  code: string;
  durationYears?: number;
  collegeId: string;
  departmentId?: string;
  type?: CourseType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Course extends DomainEntity<CourseProps> {
  private constructor(props: CourseProps) {
    super(props);
  }

  /**
   * Create a new course
   */
  public static create(props: Omit<CourseProps, 'id' | 'createdAt' | 'updatedAt'>): Course {
    // Validate required fields
    if (!props.name?.trim()) {
      throw DomainError.validation('Course name is required');
    }

    if (!props.code?.trim()) {
      throw DomainError.validation('Course code is required');
    }

    if (!props.collegeId?.trim()) {
      throw DomainError.validation('College ID is required');
    }

    // Validate course code format (2-10 characters, alphanumeric)
    if (!/^[A-Z0-9]{2,10}$/.test(props.code.toUpperCase())) {
      throw DomainError.validation('Course code must be 2-10 alphanumeric characters');
    }

    // Validate name length
    if (props.name.length > 255) {
      throw DomainError.validation('Course name cannot exceed 255 characters');
    }

    // Validate duration
    if (props.durationYears !== undefined) {
      if (props.durationYears < 1 || props.durationYears > 10) {
        throw DomainError.validation('Course duration must be between 1 and 10 years');
      }
    }

    // Validate description length
    if (props.description && props.description.length > 1000) {
      throw DomainError.validation('Course description cannot exceed 1000 characters');
    }

    const now = new Date();
    const courseProps: CourseProps = {
      id: this.generateId(),
      name: props.name.trim(),
      code: props.code.toUpperCase().trim(),
      durationYears: props.durationYears,
      collegeId: props.collegeId,
      departmentId: props.departmentId,
      type: props.type,
      description: props.description?.trim(),
      isActive: props.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    return new Course(courseProps);
  }

  /**
   * Create course from persistence data
   */
  public static fromPersistence(props: CourseProps): Course {
    return new Course(props);
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public getName(): string {
    return this.props.name;
  }

  public getCode(): string {
    return this.props.code;
  }

  public getDurationYears(): number | undefined {
    return this.props.durationYears;
  }

  public getCollegeId(): string {
    return this.props.collegeId;
  }

  public getDepartmentId(): string | undefined {
    return this.props.departmentId;
  }

  public getType(): CourseType | undefined {
    return this.props.type;
  }

  public getDescription(): string | undefined {
    return this.props.description;
  }

  public isActiveCourse(): boolean {
    return this.props.isActive;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  /**
   * Change course name
   */
  public changeName(newName: string): void {
    if (!newName?.trim()) {
      throw DomainError.validation('Course name is required');
    }

    if (newName.length > 255) {
      throw DomainError.validation('Course name cannot exceed 255 characters');
    }

    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Change course code
   */
  public changeCode(newCode: string): void {
    if (!newCode?.trim()) {
      throw DomainError.validation('Course code is required');
    }

    if (!/^[A-Z0-9]{2,10}$/.test(newCode.toUpperCase())) {
      throw DomainError.validation('Course code must be 2-10 alphanumeric characters');
    }

    this.props.code = newCode.toUpperCase().trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update course duration
   */
  public updateDuration(years: number): void {
    if (years < 1 || years > 10) {
      throw DomainError.validation('Course duration must be between 1 and 10 years');
    }

    this.props.durationYears = years;
    this.props.updatedAt = new Date();
  }

  /**
   * Update course description
   */
  public updateDescription(description: string): void {
    if (description && description.length > 1000) {
      throw DomainError.validation('Course description cannot exceed 1000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Set course type
   */
  public setType(type: CourseType): void {
    this.props.type = type;
    this.props.updatedAt = new Date();
  }

  /**
   * Associate with department
   */
  public associateWithDepartment(departmentId: string): void {
    if (!departmentId?.trim()) {
      throw DomainError.validation('Department ID is required');
    }

    this.props.departmentId = departmentId;
    this.props.updatedAt = new Date();
  }

  /**
   * Remove department association
   */
  public removeDepartmentAssociation(): void {
    this.props.departmentId = undefined;
    this.props.updatedAt = new Date();
  }

  /**
   * Activate course
   */
  public activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Deactivate course
   */
  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Check if course is undergraduate
   */
  public isUndergraduate(): boolean {
    return this.props.type === 'undergraduate';
  }

  /**
   * Check if course is postgraduate
   */
  public isPostgraduate(): boolean {
    return this.props.type === 'postgraduate';
  }

  /**
   * Check if course has department association
   */
  public hasAssociatedDepartment(): boolean {
    return !!this.props.departmentId;
  }

  /**
   * Get course duration in semesters (assuming 2 semesters per year)
   */
  public getDurationInSemesters(): number | undefined {
    return this.props.durationYears ? this.props.durationYears * 2 : undefined;
  }

  /**
   * Check if course can be deleted
   */
  public canBeDeleted(): boolean {
    // Course can be deleted if it's inactive
    // Additional business rules can be added here
    return !this.props.isActive;
  }

  /**
   * Get course summary
   */
  public getSummary(): {
    name: string;
    code: string;
    type?: CourseType;
    duration?: number;
    isActive: boolean;
    hasDepartment: boolean;
  } {
    return {
      name: this.props.name,
      code: this.props.code,
      type: this.props.type,
      duration: this.props.durationYears,
      isActive: this.props.isActive,
      hasDepartment: this.hasAssociatedDepartment(),
    };
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): any {
    return {
      id: this.props.id,
      name: this.props.name,
      code: this.props.code,
      duration_years: this.props.durationYears,
      college_id: this.props.collegeId,
      department_id: this.props.departmentId,
      type: this.props.type,
      description: this.props.description,
      is_active: this.props.isActive,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }

  /**
   * Convert to plain object for API responses
   */
  public toPlainObject(): any {
    return {
      id: this.props.id,
      name: this.props.name,
      code: this.props.code,
      durationYears: this.props.durationYears,
      collegeId: this.props.collegeId,
      departmentId: this.props.departmentId,
      type: this.props.type,
      description: this.props.description,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
