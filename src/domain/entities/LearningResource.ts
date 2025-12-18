/**
 * Learning Resource Domain Entity
 * 
 * Represents a learning resource (course/module/lesson) that can be assigned to students.
 * Contains business rules for resource management and assignment.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export type ResourceStatus = 'available' | 'assigned' | 'completed' | 'archived';

export interface LearningResourceProps {
  id: string;
  resourceCode: string;
  category: string;
  learningContext?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignmentDate?: Date;
  startDate?: Date;
  status: ResourceStatus;
  collegeId: string;
  departmentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningResource extends DomainEntity<LearningResourceProps> {
  private constructor(props: LearningResourceProps) {
    super(props);
  }

  /**
   * Create a new learning resource
   */
  public static create(props: Omit<LearningResourceProps, 'id' | 'createdAt' | 'updatedAt'>): LearningResource {
    // Validate required fields
    if (!props.resourceCode?.trim()) {
      throw DomainError.validation('Resource code is required');
    }

    if (!props.category?.trim()) {
      throw DomainError.validation('Resource category is required');
    }

    if (!props.collegeId?.trim()) {
      throw DomainError.validation('College ID is required');
    }

    // Validate resource code format (alphanumeric, 3-50 characters)
    if (!/^[A-Z0-9]{3,50}$/.test(props.resourceCode.toUpperCase())) {
      throw DomainError.validation('Resource code must be 3-50 alphanumeric characters');
    }

    // Validate category length
    if (props.category.length > 255) {
      throw DomainError.validation('Category cannot exceed 255 characters');
    }

    // Validate learning context length
    if (props.learningContext && props.learningContext.length > 1000) {
      throw DomainError.validation('Learning context cannot exceed 1000 characters');
    }

    // Validate coordinates if provided
    if (props.latitude !== undefined) {
      if (props.latitude < -90 || props.latitude > 90) {
        throw DomainError.validation('Latitude must be between -90 and 90');
      }
    }

    if (props.longitude !== undefined) {
      if (props.longitude < -180 || props.longitude > 180) {
        throw DomainError.validation('Longitude must be between -180 and 180');
      }
    }

    // Validate assignment logic
    if (props.assignedStudentId && !props.assignmentDate) {
      throw DomainError.validation('Assignment date is required when student is assigned');
    }

    if (props.assignedStudentId && props.status === 'available') {
      throw DomainError.validation('Status cannot be available when student is assigned');
    }

    const now = new Date();
    const resourceProps: LearningResourceProps = {
      id: this.generateId(),
      resourceCode: props.resourceCode.toUpperCase().trim(),
      category: props.category.trim(),
      learningContext: props.learningContext?.trim(),
      latitude: props.latitude,
      longitude: props.longitude,
      assignedStudentId: props.assignedStudentId,
      assignmentDate: props.assignmentDate,
      startDate: props.startDate,
      status: props.status || 'available',
      collegeId: props.collegeId,
      departmentId: props.departmentId,
      notes: props.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    return new LearningResource(resourceProps);
  }

  /**
   * Create learning resource from persistence data
   */
  public static fromPersistence(props: LearningResourceProps): LearningResource {
    return new LearningResource(props);
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public getResourceCode(): string {
    return this.props.resourceCode;
  }

  public getCategory(): string {
    return this.props.category;
  }

  public getLearningContext(): string | undefined {
    return this.props.learningContext;
  }

  public getLocation(): { latitude?: number; longitude?: number } {
    return {
      latitude: this.props.latitude,
      longitude: this.props.longitude,
    };
  }

  public getAssignedStudentId(): string | undefined {
    return this.props.assignedStudentId;
  }

  public getAssignmentDate(): Date | undefined {
    return this.props.assignmentDate;
  }

  public getStartDate(): Date | undefined {
    return this.props.startDate;
  }

  public getStatus(): ResourceStatus {
    return this.props.status;
  }

  public getCollegeId(): string {
    return this.props.collegeId;
  }

  public getDepartmentId(): string | undefined {
    return this.props.departmentId;
  }

  public getNotes(): string | undefined {
    return this.props.notes;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  /**
   * Assign resource to a student
   */
  public assignToStudent(studentId: string, assignmentDate?: Date): void {
    if (!studentId?.trim()) {
      throw DomainError.validation('Student ID is required');
    }

    if (this.props.status === 'completed') {
      throw DomainError.businessRule('Cannot assign completed resource');
    }

    if (this.props.status === 'archived') {
      throw DomainError.businessRule('Cannot assign archived resource');
    }

    if (this.props.assignedStudentId) {
      throw DomainError.businessRule('Resource is already assigned to another student');
    }

    this.props.assignedStudentId = studentId;
    this.props.assignmentDate = assignmentDate || new Date();
    this.props.status = 'assigned';
    this.props.updatedAt = new Date();
  }

  /**
   * Unassign resource from student
   */
  public unassignFromStudent(): void {
    if (!this.props.assignedStudentId) {
      throw DomainError.businessRule('Resource is not assigned to any student');
    }

    if (this.props.status === 'completed') {
      throw DomainError.businessRule('Cannot unassign completed resource');
    }

    this.props.assignedStudentId = undefined;
    this.props.assignmentDate = undefined;
    this.props.startDate = undefined;
    this.props.status = 'available';
    this.props.updatedAt = new Date();
  }

  /**
   * Start learning resource
   */
  public startLearning(startDate?: Date): void {
    if (!this.props.assignedStudentId) {
      throw DomainError.businessRule('Resource must be assigned before starting');
    }

    if (this.props.status === 'completed') {
      throw DomainError.businessRule('Resource is already completed');
    }

    this.props.startDate = startDate || new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Mark resource as completed
   */
  public markAsCompleted(): void {
    if (!this.props.assignedStudentId) {
      throw DomainError.businessRule('Resource must be assigned before completion');
    }

    if (this.props.status === 'completed') {
      throw DomainError.businessRule('Resource is already completed');
    }

    this.props.status = 'completed';
    this.props.updatedAt = new Date();
  }

  /**
   * Archive resource
   */
  public archive(): void {
    if (this.props.assignedStudentId && this.props.status !== 'completed') {
      throw DomainError.businessRule('Cannot archive assigned incomplete resource');
    }

    this.props.status = 'archived';
    this.props.updatedAt = new Date();
  }

  /**
   * Restore archived resource
   */
  public restore(): void {
    if (this.props.status !== 'archived') {
      throw DomainError.businessRule('Only archived resources can be restored');
    }

    this.props.status = this.props.assignedStudentId ? 'assigned' : 'available';
    this.props.updatedAt = new Date();
  }

  /**
   * Update learning context
   */
  public updateLearningContext(context: string): void {
    if (context && context.length > 1000) {
      throw DomainError.validation('Learning context cannot exceed 1000 characters');
    }

    this.props.learningContext = context?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update location coordinates
   */
  public updateLocation(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw DomainError.validation('Latitude must be between -90 and 90');
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw DomainError.validation('Longitude must be between -180 and 180');
    }

    this.props.latitude = latitude;
    this.props.longitude = longitude;
    this.props.updatedAt = new Date();
  }

  /**
   * Update notes
   */
  public updateNotes(notes: string): void {
    this.props.notes = notes?.trim();
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

  // Query methods
  /**
   * Check if resource is available for assignment
   */
  public isAvailable(): boolean {
    return this.props.status === 'available' && !this.props.assignedStudentId;
  }

  /**
   * Check if resource is assigned
   */
  public isAssigned(): boolean {
    return !!this.props.assignedStudentId && this.props.status === 'assigned';
  }

  /**
   * Check if resource is completed
   */
  public isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  /**
   * Check if resource is archived
   */
  public isArchived(): boolean {
    return this.props.status === 'archived';
  }

  /**
   * Check if resource has location data
   */
  public hasLocation(): boolean {
    return this.props.latitude !== undefined && this.props.longitude !== undefined;
  }

  /**
   * Check if learning has started
   */
  public hasStarted(): boolean {
    return !!this.props.startDate;
  }

  /**
   * Get assignment duration in days
   */
  public getAssignmentDurationDays(): number | null {
    if (!this.props.assignmentDate) {
      return null;
    }

    const now = new Date();
    const diffTime = now.getTime() - this.props.assignmentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): any {
    return {
      id: this.props.id,
      resource_code: this.props.resourceCode,
      category: this.props.category,
      learning_context: this.props.learningContext,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      assigned_student_id: this.props.assignedStudentId,
      assignment_date: this.props.assignmentDate,
      start_date: this.props.startDate,
      status: this.props.status,
      college_id: this.props.collegeId,
      department_id: this.props.departmentId,
      notes: this.props.notes,
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
      resourceCode: this.props.resourceCode,
      category: this.props.category,
      learningContext: this.props.learningContext,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      assignedStudentId: this.props.assignedStudentId,
      assignmentDate: this.props.assignmentDate?.toISOString(),
      startDate: this.props.startDate?.toISOString(),
      status: this.props.status,
      collegeId: this.props.collegeId,
      departmentId: this.props.departmentId,
      notes: this.props.notes,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
