/**
 * Learning Progress Domain Entity
 * 
 * Represents a student's progress on a learning resource.
 * Contains business rules for progress tracking and validation.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export type ProgressStatus = 'excellent' | 'struggling' | 'needs_help' | 'blocked' | 'improving';
export type MediaType = 'milestone' | 'photo' | 'video' | 'document';
export type TrackingType = 'learning' | 'assessment' | 'assignment' | 'project';

export interface LearningProgressProps {
  id: string;
  resourceId: string;
  userId: string;
  trackingDate: Date;
  completionPercentage?: number;
  timeSpentMinutes?: number;
  progressStatus: ProgressStatus;
  resourcesAccessed: boolean;
  assignmentsCompleted: boolean;
  assessmentsTaken: boolean;
  challengesFaced?: string;
  learningDifficulties?: string;
  studyNotes?: string;
  learningEnvironment?: string;
  mediaUrl?: string;
  mediaType: MediaType;
  trackingType: TrackingType;
  description?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningProgress extends DomainEntity<LearningProgressProps> {
  private constructor(props: LearningProgressProps) {
    super(props);
  }

  /**
   * Create a new learning progress record
   */
  public static create(props: Omit<LearningProgressProps, 'id' | 'createdAt' | 'updatedAt'>): LearningProgress {
    // Validate required fields
    if (!props.resourceId?.trim()) {
      throw DomainError.validation('Resource ID is required');
    }

    if (!props.userId?.trim()) {
      throw DomainError.validation('User ID is required');
    }

    if (!props.trackingDate) {
      throw DomainError.validation('Tracking date is required');
    }

    // Validate completion percentage
    if (props.completionPercentage !== undefined) {
      if (props.completionPercentage < 0 || props.completionPercentage > 100) {
        throw DomainError.validation('Completion percentage must be between 0 and 100');
      }
    }

    // Validate time spent
    if (props.timeSpentMinutes !== undefined) {
      if (props.timeSpentMinutes < 0) {
        throw DomainError.validation('Time spent cannot be negative');
      }
    }

    // Validate text field lengths
    if (props.challengesFaced && props.challengesFaced.length > 1000) {
      throw DomainError.validation('Challenges faced cannot exceed 1000 characters');
    }

    if (props.learningDifficulties && props.learningDifficulties.length > 1000) {
      throw DomainError.validation('Learning difficulties cannot exceed 1000 characters');
    }

    if (props.studyNotes && props.studyNotes.length > 2000) {
      throw DomainError.validation('Study notes cannot exceed 2000 characters');
    }

    if (props.learningEnvironment && props.learningEnvironment.length > 100) {
      throw DomainError.validation('Learning environment cannot exceed 100 characters');
    }

    if (props.description && props.description.length > 1000) {
      throw DomainError.validation('Description cannot exceed 1000 characters');
    }

    // Validate coordinates if provided
    if (props.locationLatitude !== undefined) {
      if (props.locationLatitude < -90 || props.locationLatitude > 90) {
        throw DomainError.validation('Latitude must be between -90 and 90');
      }
    }

    if (props.locationLongitude !== undefined) {
      if (props.locationLongitude < -180 || props.locationLongitude > 180) {
        throw DomainError.validation('Longitude must be between -180 and 180');
      }
    }

    // Validate verification logic
    if (props.verifiedBy && !props.verifiedAt) {
      throw DomainError.validation('Verification date is required when verifier is specified');
    }

    if (props.verified && !props.verifiedBy) {
      throw DomainError.validation('Verifier is required when progress is verified');
    }

    const now = new Date();
    const progressProps: LearningProgressProps = {
      id: this.generateId(),
      resourceId: props.resourceId,
      userId: props.userId,
      trackingDate: props.trackingDate,
      completionPercentage: props.completionPercentage,
      timeSpentMinutes: props.timeSpentMinutes,
      progressStatus: props.progressStatus || 'excellent',
      resourcesAccessed: props.resourcesAccessed || false,
      assignmentsCompleted: props.assignmentsCompleted || false,
      assessmentsTaken: props.assessmentsTaken || false,
      challengesFaced: props.challengesFaced?.trim(),
      learningDifficulties: props.learningDifficulties?.trim(),
      studyNotes: props.studyNotes?.trim(),
      learningEnvironment: props.learningEnvironment?.trim(),
      mediaUrl: props.mediaUrl?.trim(),
      mediaType: props.mediaType || 'milestone',
      trackingType: props.trackingType || 'learning',
      description: props.description?.trim(),
      locationLatitude: props.locationLatitude,
      locationLongitude: props.locationLongitude,
      verified: props.verified || false,
      verifiedBy: props.verifiedBy,
      verifiedAt: props.verifiedAt,
      createdAt: now,
      updatedAt: now,
    };

    return new LearningProgress(progressProps);
  }

  /**
   * Create learning progress from persistence data
   */
  public static fromPersistence(props: LearningProgressProps): LearningProgress {
    return new LearningProgress(props);
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public getResourceId(): string {
    return this.props.resourceId;
  }

  public getUserId(): string {
    return this.props.userId;
  }

  public getTrackingDate(): Date {
    return this.props.trackingDate;
  }

  public getCompletionPercentage(): number | undefined {
    return this.props.completionPercentage;
  }

  public getTimeSpentMinutes(): number | undefined {
    return this.props.timeSpentMinutes;
  }

  public getProgressStatus(): ProgressStatus {
    return this.props.progressStatus;
  }

  public getResourcesAccessed(): boolean {
    return this.props.resourcesAccessed;
  }

  public getAssignmentsCompleted(): boolean {
    return this.props.assignmentsCompleted;
  }

  public getAssessmentsTaken(): boolean {
    return this.props.assessmentsTaken;
  }

  public getChallengesFaced(): string | undefined {
    return this.props.challengesFaced;
  }

  public getLearningDifficulties(): string | undefined {
    return this.props.learningDifficulties;
  }

  public getStudyNotes(): string | undefined {
    return this.props.studyNotes;
  }

  public getLearningEnvironment(): string | undefined {
    return this.props.learningEnvironment;
  }

  public getMediaUrl(): string | undefined {
    return this.props.mediaUrl;
  }

  public getMediaType(): MediaType {
    return this.props.mediaType;
  }

  public getTrackingType(): TrackingType {
    return this.props.trackingType;
  }

  public getDescription(): string | undefined {
    return this.props.description;
  }

  public getLocation(): { latitude?: number; longitude?: number } {
    return {
      latitude: this.props.locationLatitude,
      longitude: this.props.locationLongitude,
    };
  }

  public isVerified(): boolean {
    return this.props.verified;
  }

  public getVerifiedBy(): string | undefined {
    return this.props.verifiedBy;
  }

  public getVerifiedAt(): Date | undefined {
    return this.props.verifiedAt;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  /**
   * Update completion percentage
   */
  public updateCompletionPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw DomainError.validation('Completion percentage must be between 0 and 100');
    }

    this.props.completionPercentage = percentage;
    this.props.updatedAt = new Date();
  }

  /**
   * Add time spent
   */
  public addTimeSpent(minutes: number): void {
    if (minutes < 0) {
      throw DomainError.validation('Time spent cannot be negative');
    }

    this.props.timeSpentMinutes = (this.props.timeSpentMinutes || 0) + minutes;
    this.props.updatedAt = new Date();
  }

  /**
   * Update progress status
   */
  public updateProgressStatus(status: ProgressStatus): void {
    this.props.progressStatus = status;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark resources as accessed
   */
  public markResourcesAccessed(): void {
    this.props.resourcesAccessed = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark assignments as completed
   */
  public markAssignmentsCompleted(): void {
    this.props.assignmentsCompleted = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark assessments as taken
   */
  public markAssessmentsTaken(): void {
    this.props.assessmentsTaken = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Update challenges faced
   */
  public updateChallengesFaced(challenges: string): void {
    if (challenges && challenges.length > 1000) {
      throw DomainError.validation('Challenges faced cannot exceed 1000 characters');
    }

    this.props.challengesFaced = challenges?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update learning difficulties
   */
  public updateLearningDifficulties(difficulties: string): void {
    if (difficulties && difficulties.length > 1000) {
      throw DomainError.validation('Learning difficulties cannot exceed 1000 characters');
    }

    this.props.learningDifficulties = difficulties?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update study notes
   */
  public updateStudyNotes(notes: string): void {
    if (notes && notes.length > 2000) {
      throw DomainError.validation('Study notes cannot exceed 2000 characters');
    }

    this.props.studyNotes = notes?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update learning environment
   */
  public updateLearningEnvironment(environment: string): void {
    if (environment && environment.length > 100) {
      throw DomainError.validation('Learning environment cannot exceed 100 characters');
    }

    this.props.learningEnvironment = environment?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Add media attachment
   */
  public addMedia(url: string, type: MediaType): void {
    if (!url?.trim()) {
      throw DomainError.validation('Media URL is required');
    }

    this.props.mediaUrl = url.trim();
    this.props.mediaType = type;
    this.props.updatedAt = new Date();
  }

  /**
   * Update description
   */
  public updateDescription(description: string): void {
    if (description && description.length > 1000) {
      throw DomainError.validation('Description cannot exceed 1000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Update location
   */
  public updateLocation(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw DomainError.validation('Latitude must be between -90 and 90');
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw DomainError.validation('Longitude must be between -180 and 180');
    }

    this.props.locationLatitude = latitude;
    this.props.locationLongitude = longitude;
    this.props.updatedAt = new Date();
  }

  /**
   * Verify progress
   */
  public verify(verifierId: string): void {
    if (!verifierId?.trim()) {
      throw DomainError.validation('Verifier ID is required');
    }

    if (this.props.verified) {
      throw DomainError.businessRule('Progress is already verified');
    }

    this.props.verified = true;
    this.props.verifiedBy = verifierId;
    this.props.verifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Unverify progress
   */
  public unverify(): void {
    if (!this.props.verified) {
      throw DomainError.businessRule('Progress is not verified');
    }

    this.props.verified = false;
    this.props.verifiedBy = undefined;
    this.props.verifiedAt = undefined;
    this.props.updatedAt = new Date();
  }

  // Query methods
  /**
   * Check if progress is complete
   */
  public isComplete(): boolean {
    return (this.props.completionPercentage || 0) >= 100;
  }

  /**
   * Check if student is struggling
   */
  public isStruggling(): boolean {
    return ['struggling', 'needs_help', 'blocked'].includes(this.props.progressStatus);
  }

  /**
   * Check if progress has media
   */
  public hasMedia(): boolean {
    return !!this.props.mediaUrl;
  }

  /**
   * Check if progress has location data
   */
  public hasLocation(): boolean {
    return this.props.locationLatitude !== undefined && this.props.locationLongitude !== undefined;
  }

  /**
   * Get overall engagement score (0-100)
   */
  public getEngagementScore(): number {
    let score = 0;
    
    if (this.props.resourcesAccessed) score += 25;
    if (this.props.assignmentsCompleted) score += 25;
    if (this.props.assessmentsTaken) score += 25;
    if ((this.props.completionPercentage || 0) > 0) score += 25;
    
    return score;
  }

  /**
   * Get time spent in hours
   */
  public getTimeSpentHours(): number {
    return (this.props.timeSpentMinutes || 0) / 60;
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): any {
    return {
      id: this.props.id,
      resource_id: this.props.resourceId,
      user_id: this.props.userId,
      tracking_date: this.props.trackingDate,
      completion_percentage: this.props.completionPercentage,
      time_spent_minutes: this.props.timeSpentMinutes,
      progress_status: this.props.progressStatus,
      resources_accessed: this.props.resourcesAccessed,
      assignments_completed: this.props.assignmentsCompleted,
      assessments_taken: this.props.assessmentsTaken,
      challenges_faced: this.props.challengesFaced,
      learning_difficulties: this.props.learningDifficulties,
      study_notes: this.props.studyNotes,
      learning_environment: this.props.learningEnvironment,
      media_url: this.props.mediaUrl,
      media_type: this.props.mediaType,
      tracking_type: this.props.trackingType,
      description: this.props.description,
      location_latitude: this.props.locationLatitude,
      location_longitude: this.props.locationLongitude,
      verified: this.props.verified,
      verified_by: this.props.verifiedBy,
      verified_at: this.props.verifiedAt,
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
      resourceId: this.props.resourceId,
      userId: this.props.userId,
      trackingDate: this.props.trackingDate.toISOString(),
      completionPercentage: this.props.completionPercentage,
      timeSpentMinutes: this.props.timeSpentMinutes,
      progressStatus: this.props.progressStatus,
      resourcesAccessed: this.props.resourcesAccessed,
      assignmentsCompleted: this.props.assignmentsCompleted,
      assessmentsTaken: this.props.assessmentsTaken,
      challengesFaced: this.props.challengesFaced,
      learningDifficulties: this.props.learningDifficulties,
      studyNotes: this.props.studyNotes,
      learningEnvironment: this.props.learningEnvironment,
      mediaUrl: this.props.mediaUrl,
      mediaType: this.props.mediaType,
      trackingType: this.props.trackingType,
      description: this.props.description,
      locationLatitude: this.props.locationLatitude,
      locationLongitude: this.props.locationLongitude,
      verified: this.props.verified,
      verifiedBy: this.props.verifiedBy,
      verifiedAt: this.props.verifiedAt?.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
