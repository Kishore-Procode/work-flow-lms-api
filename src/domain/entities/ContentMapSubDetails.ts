/**
 * ContentMapSubDetails Domain Entity
 * 
 * Core business entity representing subject-level mapping details
 * linking ACT subjects to LMS learning resources in the Student-ACT LMS system.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';
import { ContentMappingStatus } from './ContentMapMaster';

export interface ContentMapSubDetailsProps {
  id: string;
  contentMapSemDetailsId: string;
  actSubjectId: string;
  actSubjectCode: string;
  actSubjectName: string;
  actSubjectCredits: number;
  lmsLearningResourceId?: string;
  mappedAt?: Date;
  mappedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  status: ContentMappingStatus;
}

export class ContentMapSubDetails extends DomainEntity<ContentMapSubDetailsProps> {
  private constructor(props: ContentMapSubDetailsProps) {
    super(props);
  }

  /**
   * Factory method to create a new ContentMapSubDetails
   */
  public static create(
    props: Omit<ContentMapSubDetailsProps, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'mappedAt' | 'mappedBy' | 'lmsLearningResourceId'>
  ): ContentMapSubDetails {
    const now = new Date();
    
    // Validate required fields
    this.validateContentMapSemDetailsId(props.contentMapSemDetailsId);
    this.validateActSubjectId(props.actSubjectId);
    this.validateActSubjectCode(props.actSubjectCode);
    this.validateActSubjectName(props.actSubjectName);
    this.validateActSubjectCredits(props.actSubjectCredits);
    
    const subDetailsProps: ContentMapSubDetailsProps = {
      ...props,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      status: 'pending', // Initially not mapped
    };

    return new ContentMapSubDetails(subDetailsProps);
  }

  /**
   * Factory method to reconstruct from persistence
   */
  public static fromPersistence(props: ContentMapSubDetailsProps): ContentMapSubDetails {
    return new ContentMapSubDetails(props);
  }

  /**
   * Get the entity's unique identifier
   */
  public getId(): string {
    return this.props.id;
  }

  /**
   * Get content map semester details ID
   */
  public getContentMapSemDetailsId(): string {
    return this.props.contentMapSemDetailsId;
  }

  /**
   * Get ACT subject ID
   */
  public getActSubjectId(): string {
    return this.props.actSubjectId;
  }

  /**
   * Get ACT subject code
   */
  public getActSubjectCode(): string {
    return this.props.actSubjectCode;
  }

  /**
   * Get ACT subject name
   */
  public getActSubjectName(): string {
    return this.props.actSubjectName;
  }

  /**
   * Get ACT subject credits
   */
  public getActSubjectCredits(): number {
    return this.props.actSubjectCredits;
  }

  /**
   * Get LMS learning resource ID
   */
  public getLmsLearningResourceId(): string | undefined {
    return this.props.lmsLearningResourceId;
  }

  /**
   * Get mapped at date
   */
  public getMappedAt(): Date | undefined {
    return this.props.mappedAt;
  }

  /**
   * Get mapped by user ID
   */
  public getMappedBy(): string | undefined {
    return this.props.mappedBy;
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
   * Map subject to LMS learning resource
   * In the new workflow, lmsLearningResourceId is optional (can be undefined)
   */
  public mapToLearningResource(lmsLearningResourceId: string | undefined, mappedBy: string): void {
    if (!mappedBy || mappedBy.trim() === '') {
      throw new DomainError('Mapped by user ID is required');
    }

    const now = new Date();

    this.props.lmsLearningResourceId = lmsLearningResourceId;
    this.props.mappedAt = now;
    this.props.mappedBy = mappedBy;
    this.props.status = lmsLearningResourceId ? 'completed' : 'in_progress';
    this.props.updatedAt = now;
  }

  /**
   * Unmap subject from LMS learning resource
   */
  public unmapFromLearningResource(): void {
    this.props.lmsLearningResourceId = undefined;
    this.props.mappedAt = undefined;
    this.props.mappedBy = undefined;
    this.props.status = 'pending';
    this.props.updatedAt = new Date();
  }

  /**
   * Update mapping to different learning resource
   */
  public updateMapping(lmsLearningResourceId: string | undefined, mappedBy: string): void {
    if (!this.isMapped()) {
      throw new DomainError('Cannot update mapping for unmapped subject');
    }

    this.mapToLearningResource(lmsLearningResourceId, mappedBy);
  }

  /**
   * Check if subject is mapped
   */
  public isMapped(): boolean {
    return !!this.props.lmsLearningResourceId && this.props.status === 'completed';
  }

  /**
   * Check if subject is not mapped
   */
  public isNotMapped(): boolean {
    return !this.props.lmsLearningResourceId && this.props.status === 'pending';
  }

  /**
   * Get mapping display text
   */
  public getMappingDisplayText(): string {
    if (this.isMapped()) {
      return 'Mapped';
    }
    return 'Not Mapped';
  }

  /**
   * Get subject display text
   */
  public getSubjectDisplayText(): string {
    return `${this.props.actSubjectCode} - ${this.props.actSubjectName}`;
  }

  /**
   * Get subject with credits display text
   */
  public getSubjectWithCreditsDisplayText(): string {
    return `${this.getSubjectDisplayText()} (${this.props.actSubjectCredits} credits)`;
  }

  /**
   * Update ACT subject information
   */
  public updateActSubjectInfo(
    actSubjectCode: string,
    actSubjectName: string,
    actSubjectCredits: number
  ): void {
    ContentMapSubDetails.validateActSubjectCode(actSubjectCode);
    ContentMapSubDetails.validateActSubjectName(actSubjectName);
    ContentMapSubDetails.validateActSubjectCredits(actSubjectCredits);
    
    this.props.actSubjectCode = actSubjectCode;
    this.props.actSubjectName = actSubjectName;
    this.props.actSubjectCredits = actSubjectCredits;
    this.props.updatedAt = new Date();
  }

  /**
   * Get all properties for persistence
   */
  public toPersistence(): ContentMapSubDetailsProps {
    return this.getProps();
  }

  /**
   * Validate content map semester details ID
   */
  private static validateContentMapSemDetailsId(contentMapSemDetailsId: string): void {
    if (!contentMapSemDetailsId || contentMapSemDetailsId.trim() === '') {
      throw new DomainError('Content map semester details ID is required');
    }
  }

  /**
   * Validate ACT subject ID
   */
  private static validateActSubjectId(actSubjectId: string): void {
    if (!actSubjectId || actSubjectId.trim() === '') {
      throw new DomainError('ACT subject ID is required');
    }
  }

  /**
   * Validate ACT subject code
   */
  private static validateActSubjectCode(actSubjectCode: string): void {
    if (!actSubjectCode || actSubjectCode.trim() === '') {
      throw new DomainError('ACT subject code is required');
    }
    
    if (actSubjectCode.length > 20) {
      throw new DomainError('ACT subject code cannot exceed 20 characters');
    }
  }

  /**
   * Validate ACT subject name
   */
  private static validateActSubjectName(actSubjectName: string): void {
    if (!actSubjectName || actSubjectName.trim() === '') {
      throw new DomainError('ACT subject name is required');
    }
    
    if (actSubjectName.length > 255) {
      throw new DomainError('ACT subject name cannot exceed 255 characters');
    }
  }

  /**
   * Validate ACT subject credits
   */
  private static validateActSubjectCredits(actSubjectCredits: number): void {
    if (!Number.isInteger(actSubjectCredits) || actSubjectCredits < 0) {
      throw new DomainError('ACT subject credits must be a non-negative integer');
    }
  }
}
