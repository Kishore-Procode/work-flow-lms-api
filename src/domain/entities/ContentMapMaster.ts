/**
 * ContentMapMaster Domain Entity
 * 
 * Core business entity representing the main mapping configuration between 
 * LMS courses and ACT application courses in the Student-ACT LMS system.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export type CourseTypeMapping = 'UG' | 'PG' | 'Diploma' | 'Certificate';
export type ContentMappingStatus = 'pending' | 'in_progress' | 'completed' | 'inactive';

export interface ContentMapMasterProps {
  id: string;
  courseType: CourseTypeMapping;
  lmsCourseId: string;
  lmsDepartmentId: string;
  lmsAcademicYearId: string;
  actDepartmentId: string;
  actRegulationId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  status: ContentMappingStatus;
}

export class ContentMapMaster extends DomainEntity<ContentMapMasterProps> {
  private constructor(props: ContentMapMasterProps) {
    super(props);
  }

  /**
   * Factory method to create a new ContentMapMaster
   */
  public static create(
    props: Omit<ContentMapMasterProps, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): ContentMapMaster {
    const now = new Date();
    
    // Validate required fields
    this.validateCourseType(props.courseType);
    this.validateRequiredIds(props);
    
    const contentMapProps: ContentMapMasterProps = {
      ...props,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      status: 'pending',
    };

    return new ContentMapMaster(contentMapProps);
  }

  /**
   * Factory method to reconstruct from persistence
   */
  public static fromPersistence(props: ContentMapMasterProps): ContentMapMaster {
    return new ContentMapMaster(props);
  }

  /**
   * Get the entity's unique identifier
   */
  public getId(): string {
    return this.props.id;
  }

  /**
   * Get course type
   */
  public getCourseType(): CourseTypeMapping {
    return this.props.courseType;
  }

  /**
   * Get LMS course ID
   */
  public getLmsCourseId(): string {
    return this.props.lmsCourseId;
  }

  /**
   * Get LMS department ID
   */
  public getLmsDepartmentId(): string {
    return this.props.lmsDepartmentId;
  }

  /**
   * Get LMS academic year ID
   */
  public getLmsAcademicYearId(): string {
    return this.props.lmsAcademicYearId;
  }

  /**
   * Get ACT department ID
   */
  public getActDepartmentId(): string {
    return this.props.actDepartmentId;
  }

  /**
   * Get ACT regulation ID
   */
  public getActRegulationId(): string {
    return this.props.actRegulationId;
  }

  /**
   * Get current status
   */
  public getStatus(): ContentMappingStatus {
    return this.props.status;
  }

  /**
   * Get created by user ID
   */
  public getCreatedBy(): string {
    return this.props.createdBy;
  }

  /**
   * Get creation date
   */
  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Get last update date
   */
  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Get updated by user ID
   */
  public getUpdatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  /**
   * Update status
   */
  public updateStatus(status: ContentMappingStatus, updatedBy: string): void {
    this.validateStatus(status);
    
    this.props.status = status;
    this.props.updatedBy = updatedBy;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark as in progress
   */
  public markInProgress(updatedBy: string): void {
    if (this.props.status === 'completed') {
      throw new DomainError('Cannot mark completed mapping as in progress');
    }
    
    this.updateStatus('in_progress', updatedBy);
  }

  /**
   * Mark as completed
   */
  public markCompleted(updatedBy: string): void {
    this.updateStatus('completed', updatedBy);
  }

  /**
   * Mark as inactive
   */
  public markInactive(updatedBy: string): void {
    this.updateStatus('inactive', updatedBy);
  }

  /**
   * Check if mapping is active
   */
  public isActive(): boolean {
    return this.props.status !== 'inactive';
  }

  /**
   * Check if mapping is completed
   */
  public isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  /**
   * Get all properties for persistence
   */
  public toPersistence(): ContentMapMasterProps {
    return this.getProps();
  }

  /**
   * Validate course type
   */
  private static validateCourseType(courseType: CourseTypeMapping): void {
    const validTypes: CourseTypeMapping[] = ['UG', 'PG', 'Diploma', 'Certificate'];
    if (!validTypes.includes(courseType)) {
      throw new DomainError(`Invalid course type: ${courseType}`);
    }
  }

  /**
   * Validate required IDs
   */
  private static validateRequiredIds(props: {
    lmsCourseId: string;
    lmsDepartmentId: string;
    lmsAcademicYearId: string;
    actDepartmentId: string;
    actRegulationId: string;
    createdBy: string;
  }): void {
    const requiredFields = [
      'lmsCourseId',
      'lmsDepartmentId', 
      'lmsAcademicYearId',
      'actDepartmentId',
      'actRegulationId',
      'createdBy'
    ] as const;

    for (const field of requiredFields) {
      if (!props[field] || props[field].trim() === '') {
        throw new DomainError(`${field} is required`);
      }
    }
  }

  /**
   * Validate status
   */
  private validateStatus(status: ContentMappingStatus): void {
    const validStatuses: ContentMappingStatus[] = ['pending', 'in_progress', 'completed', 'inactive'];
    if (!validStatuses.includes(status)) {
      throw new DomainError(`Invalid status: ${status}`);
    }
  }
}
