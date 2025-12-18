/**
 * SubjectStaffAssignment Domain Entity
 * 
 * Represents a staff assignment to a subject for teaching.
 * 
 * Business Rules:
 * - A staff can have multiple subjects
 * - A subject can only have ONE staff assigned at a time (active)
 * - Only HOD can assign staff to subjects in their department
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

export interface SubjectStaffAssignmentProps {
  id?: string;
  contentMapSubDetailsId: string;
  staffId: string;
  departmentId: string;
  semesterNumber: number;
  academicYearId: string;
  assignedBy: string;
  assignedAt?: Date;
  isActive?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SubjectStaffAssignment {
  private constructor(private props: SubjectStaffAssignmentProps) {
    this.props.id = props.id || uuidv4();
    this.props.assignedAt = props.assignedAt || new Date();
    this.props.isActive = props.isActive ?? true;
    this.props.createdAt = props.createdAt || new Date();
    this.props.updatedAt = props.updatedAt || new Date();
  }

  public static create(props: SubjectStaffAssignmentProps): SubjectStaffAssignment {
    // Validate required fields
    if (!props.contentMapSubDetailsId) {
      throw new Error('Content Map Subject Details ID is required');
    }
    if (!props.staffId) {
      throw new Error('Staff ID is required');
    }
    if (!props.departmentId) {
      throw new Error('Department ID is required');
    }
    if (!props.semesterNumber || props.semesterNumber < 1 || props.semesterNumber > 10) {
      throw new Error('Semester number must be between 1 and 10');
    }
    if (!props.academicYearId) {
      throw new Error('Academic Year ID is required');
    }
    if (!props.assignedBy) {
      throw new Error('Assigned By user ID is required');
    }

    return new SubjectStaffAssignment(props);
  }

  // Getters
  public getId(): string {
    return this.props.id!;
  }

  public getContentMapSubDetailsId(): string {
    return this.props.contentMapSubDetailsId;
  }

  public getStaffId(): string {
    return this.props.staffId;
  }

  public getDepartmentId(): string {
    return this.props.departmentId;
  }

  public getSemesterNumber(): number {
    return this.props.semesterNumber;
  }

  public getAcademicYearId(): string {
    return this.props.academicYearId;
  }

  public getAssignedBy(): string {
    return this.props.assignedBy;
  }

  public getAssignedAt(): Date {
    return this.props.assignedAt!;
  }

  public getIsActive(): boolean {
    return this.props.isActive ?? true;
  }

  public getNotes(): string | undefined {
    return this.props.notes;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt!;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods
  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  public updateStaff(newStaffId: string, updatedBy: string): void {
    this.props.staffId = newStaffId;
    this.props.assignedBy = updatedBy;
    this.props.assignedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public updateNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  // Convert to plain object
  public toObject(): SubjectStaffAssignmentProps {
    return { ...this.props };
  }
}
