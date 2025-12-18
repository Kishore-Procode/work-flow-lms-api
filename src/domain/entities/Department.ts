/**
 * Department Domain Entity
 * 
 * Represents an academic department within a college.
 * Contains business rules for department management and validation.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export interface DepartmentProps {
  id: string;
  name: string;
  code: string;
  collegeId: string;
  courseId?: string;
  hodId?: string;
  totalStudents: number;
  totalStaff: number;
  established?: string;
  isActive: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Department extends DomainEntity<DepartmentProps> {
  private constructor(props: DepartmentProps) {
    super(props);
  }

  /**
   * Create a new department
   */
  public static create(props: Omit<DepartmentProps, 'id' | 'createdAt' | 'updatedAt'>): Department {
    // Validate required fields
    if (!props.name?.trim()) {
      throw DomainError.validation('Department name is required');
    }

    if (!props.code?.trim()) {
      throw DomainError.validation('Department code is required');
    }

    if (!props.collegeId?.trim()) {
      throw DomainError.validation('College ID is required');
    }

    // Validate department code format (2-10 characters, alphanumeric)
    if (!/^[A-Z0-9]{2,10}$/.test(props.code.toUpperCase())) {
      throw DomainError.validation('Department code must be 2-10 alphanumeric characters');
    }

    // Validate name length
    if (props.name.length > 255) {
      throw DomainError.validation('Department name cannot exceed 255 characters');
    }

    // Validate established year if provided
    if (props.established) {
      const year = parseInt(props.established, 10);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) {
        throw DomainError.validation('Established year must be between 1800 and current year');
      }
    }

    const now = new Date();
    const departmentProps: DepartmentProps = {
      id: this.generateId(),
      name: props.name.trim(),
      code: props.code.toUpperCase().trim(),
      collegeId: props.collegeId,
      courseId: props.courseId,
      hodId: props.hodId,
      totalStudents: Math.max(0, props.totalStudents || 0),
      totalStaff: Math.max(0, props.totalStaff || 0),
      established: props.established,
      isActive: props.isActive ?? true,
      isCustom: props.isCustom ?? false,
      createdAt: now,
      updatedAt: now,
    };

    return new Department(departmentProps);
  }

  /**
   * Create department from persistence data
   */
  public static fromPersistence(props: DepartmentProps): Department {
    return new Department(props);
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

  public getCollegeId(): string {
    return this.props.collegeId;
  }

  public getCourseId(): string | undefined {
    return this.props.courseId;
  }

  public getHodId(): string | undefined {
    return this.props.hodId;
  }

  public getTotalStudents(): number {
    return this.props.totalStudents;
  }

  public getTotalStaff(): number {
    return this.props.totalStaff;
  }

  public getEstablished(): string | undefined {
    return this.props.established;
  }

  public isActiveDepartment(): boolean {
    return this.props.isActive;
  }

  public isCustomDepartment(): boolean {
    return this.props.isCustom;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  /**
   * Change department name
   */
  public changeName(newName: string): void {
    if (!newName?.trim()) {
      throw DomainError.validation('Department name is required');
    }

    if (newName.length > 255) {
      throw DomainError.validation('Department name cannot exceed 255 characters');
    }

    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Change department code
   */
  public changeCode(newCode: string): void {
    if (!newCode?.trim()) {
      throw DomainError.validation('Department code is required');
    }

    if (!/^[A-Z0-9]{2,10}$/.test(newCode.toUpperCase())) {
      throw DomainError.validation('Department code must be 2-10 alphanumeric characters');
    }

    this.props.code = newCode.toUpperCase().trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Assign Head of Department
   */
  public assignHod(hodId: string): void {
    if (!hodId?.trim()) {
      throw DomainError.validation('HOD ID is required');
    }

    this.props.hodId = hodId;
    this.props.updatedAt = new Date();
  }

  /**
   * Remove Head of Department
   */
  public removeHod(): void {
    this.props.hodId = undefined;
    this.props.updatedAt = new Date();
  }

  /**
   * Associate with course
   */
  public associateWithCourse(courseId: string): void {
    if (!courseId?.trim()) {
      throw DomainError.validation('Course ID is required');
    }

    this.props.courseId = courseId;
    this.props.updatedAt = new Date();
  }

  /**
   * Remove course association
   */
  public removeCourseAssociation(): void {
    this.props.courseId = undefined;
    this.props.updatedAt = new Date();
  }

  /**
   * Update student count
   */
  public updateStudentCount(count: number): void {
    if (count < 0) {
      throw DomainError.validation('Student count cannot be negative');
    }

    this.props.totalStudents = count;
    this.props.updatedAt = new Date();
  }

  /**
   * Update staff count
   */
  public updateStaffCount(count: number): void {
    if (count < 0) {
      throw DomainError.validation('Staff count cannot be negative');
    }

    this.props.totalStaff = count;
    this.props.updatedAt = new Date();
  }

  /**
   * Activate department
   */
  public activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Deactivate department
   */
  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Update established year
   */
  public updateEstablishedYear(year: string): void {
    if (year) {
      const yearNum = parseInt(year, 10);
      const currentYear = new Date().getFullYear();
      if (yearNum < 1800 || yearNum > currentYear) {
        throw DomainError.validation('Established year must be between 1800 and current year');
      }
    }

    this.props.established = year;
    this.props.updatedAt = new Date();
  }

  /**
   * Check if department can be deleted
   */
  public canBeDeleted(): boolean {
    // Department can be deleted if it has no students or staff
    return this.props.totalStudents === 0 && this.props.totalStaff === 0;
  }

  /**
   * Check if department has HOD assigned
   */
  public hasHod(): boolean {
    return !!this.props.hodId;
  }

  /**
   * Check if department is associated with a course
   */
  public hasAssociatedCourse(): boolean {
    return !!this.props.courseId;
  }

  /**
   * Get department capacity utilization
   */
  public getCapacityInfo(): {
    totalStudents: number;
    totalStaff: number;
    hasHod: boolean;
    isActive: boolean;
  } {
    return {
      totalStudents: this.props.totalStudents,
      totalStaff: this.props.totalStaff,
      hasHod: this.hasHod(),
      isActive: this.props.isActive,
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
      college_id: this.props.collegeId,
      course_id: this.props.courseId,
      hod_id: this.props.hodId,
      total_students: this.props.totalStudents,
      total_staff: this.props.totalStaff,
      established: this.props.established,
      is_active: this.props.isActive,
      is_custom: this.props.isCustom,
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
      collegeId: this.props.collegeId,
      courseId: this.props.courseId,
      hodId: this.props.hodId,
      totalStudents: this.props.totalStudents,
      totalStaff: this.props.totalStaff,
      established: this.props.established,
      isActive: this.props.isActive,
      isCustom: this.props.isCustom,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
