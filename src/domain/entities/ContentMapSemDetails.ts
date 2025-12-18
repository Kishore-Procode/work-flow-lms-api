/**
 * ContentMapSemDetails Domain Entity
 * 
 * Core business entity representing semester-level mapping details
 * in the Student-ACT LMS content mapping system.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';
import { ContentMappingStatus } from './ContentMapMaster';

export interface ContentMapSemDetailsProps {
  id: string;
  contentMapMasterId: string;
  semesterNumber: number;
  semesterName: string;
  totalSubjects: number;
  mappedSubjects: number;
  createdAt: Date;
  updatedAt: Date;
  status: ContentMappingStatus;
}

export class ContentMapSemDetails extends DomainEntity<ContentMapSemDetailsProps> {
  private constructor(props: ContentMapSemDetailsProps) {
    super(props);
  }

  /**
   * Factory method to create a new ContentMapSemDetails
   */
  public static create(
    props: Omit<ContentMapSemDetailsProps, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'mappedSubjects'>
  ): ContentMapSemDetails {
    const now = new Date();
    
    // Validate required fields
    this.validateSemesterNumber(props.semesterNumber);
    this.validateSemesterName(props.semesterName);
    this.validateTotalSubjects(props.totalSubjects);
    this.validateContentMapMasterId(props.contentMapMasterId);
    
    const semDetailsProps: ContentMapSemDetailsProps = {
      ...props,
      id: this.generateId(),
      mappedSubjects: 0, // Initially no subjects are mapped
      createdAt: now,
      updatedAt: now,
      status: 'pending',
    };

    return new ContentMapSemDetails(semDetailsProps);
  }

  /**
   * Factory method to reconstruct from persistence
   */
  public static fromPersistence(props: ContentMapSemDetailsProps): ContentMapSemDetails {
    return new ContentMapSemDetails(props);
  }

  /**
   * Get the entity's unique identifier
   */
  public getId(): string {
    return this.props.id;
  }

  /**
   * Get content map master ID
   */
  public getContentMapMasterId(): string {
    return this.props.contentMapMasterId;
  }

  /**
   * Get semester number
   */
  public getSemesterNumber(): number {
    return this.props.semesterNumber;
  }

  /**
   * Get semester name
   */
  public getSemesterName(): string {
    return this.props.semesterName;
  }

  /**
   * Get total subjects count
   */
  public getTotalSubjects(): number {
    return this.props.totalSubjects;
  }

  /**
   * Get mapped subjects count
   */
  public getMappedSubjects(): number {
    return this.props.mappedSubjects;
  }

  /**
   * Get current status
   */
  public getStatus(): ContentMappingStatus {
    return this.props.status;
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
   * Update total subjects count
   */
  public updateTotalSubjects(totalSubjects: number): void {
    ContentMapSemDetails.validateTotalSubjects(totalSubjects);

    this.props.totalSubjects = totalSubjects;
    this.props.updatedAt = new Date();

    // Recalculate status based on new total
    this.recalculateStatus();
  }

  /**
   * Update mapped subjects count
   */
  public updateMappedSubjects(mappedSubjects: number): void {
    if (mappedSubjects < 0) {
      throw new DomainError('Mapped subjects count cannot be negative');
    }
    
    if (mappedSubjects > this.props.totalSubjects) {
      throw new DomainError('Mapped subjects cannot exceed total subjects');
    }
    
    this.props.mappedSubjects = mappedSubjects;
    this.props.updatedAt = new Date();
    
    // Recalculate status based on mapping progress
    this.recalculateStatus();
  }

  /**
   * Increment mapped subjects count
   */
  public incrementMappedSubjects(): void {
    if (this.props.mappedSubjects >= this.props.totalSubjects) {
      throw new DomainError('Cannot increment mapped subjects beyond total subjects');
    }
    
    this.updateMappedSubjects(this.props.mappedSubjects + 1);
  }

  /**
   * Decrement mapped subjects count
   */
  public decrementMappedSubjects(): void {
    if (this.props.mappedSubjects <= 0) {
      throw new DomainError('Cannot decrement mapped subjects below zero');
    }
    
    this.updateMappedSubjects(this.props.mappedSubjects - 1);
  }

  /**
   * Get mapping progress percentage
   */
  public getMappingProgress(): number {
    if (this.props.totalSubjects === 0) {
      return 0;
    }
    
    return Math.round((this.props.mappedSubjects / this.props.totalSubjects) * 100);
  }

  /**
   * Check if all subjects are mapped
   */
  public isFullyMapped(): boolean {
    return this.props.mappedSubjects === this.props.totalSubjects && this.props.totalSubjects > 0;
  }

  /**
   * Check if partially mapped
   */
  public isPartiallyMapped(): boolean {
    return this.props.mappedSubjects > 0 && this.props.mappedSubjects < this.props.totalSubjects;
  }

  /**
   * Check if no subjects are mapped
   */
  public isNotMapped(): boolean {
    return this.props.mappedSubjects === 0;
  }

  /**
   * Get mapping status display text
   */
  public getMappingStatusText(): string {
    return `${this.props.mappedSubjects}/${this.props.totalSubjects}`;
  }

  /**
   * Get all properties for persistence
   */
  public toPersistence(): ContentMapSemDetailsProps {
    return this.getProps();
  }

  /**
   * Recalculate status based on mapping progress
   */
  private recalculateStatus(): void {
    if (this.isNotMapped()) {
      this.props.status = 'pending';
    } else if (this.isFullyMapped()) {
      this.props.status = 'completed';
    } else {
      this.props.status = 'in_progress';
    }
  }

  /**
   * Validate semester number
   */
  private static validateSemesterNumber(semesterNumber: number): void {
    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 10) {
      throw new DomainError('Semester number must be an integer between 1 and 10');
    }
  }

  /**
   * Validate semester name
   */
  private static validateSemesterName(semesterName: string): void {
    if (!semesterName || semesterName.trim() === '') {
      throw new DomainError('Semester name is required');
    }
    
    if (semesterName.length > 50) {
      throw new DomainError('Semester name cannot exceed 50 characters');
    }
  }

  /**
   * Validate total subjects count
   */
  private static validateTotalSubjects(totalSubjects: number): void {
    if (!Number.isInteger(totalSubjects) || totalSubjects < 0) {
      throw new DomainError('Total subjects must be a non-negative integer');
    }
  }

  /**
   * Validate content map master ID
   */
  private static validateContentMapMasterId(contentMapMasterId: string): void {
    if (!contentMapMasterId || contentMapMasterId.trim() === '') {
      throw new DomainError('Content map master ID is required');
    }
  }
}
