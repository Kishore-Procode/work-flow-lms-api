/**
 * Create Progress Request DTO
 * 
 * Input DTO for creating a new learning progress record.
 * Handles validation and conversion from HTTP requests.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ProgressStatus, TrackingType, MediaType } from '../../../domain/entities/LearningProgress';

export interface ProgressMediaData {
  mediaUrl: string;
  caption?: string;
  mediaType: MediaType;
  filename: string;
  fileSize: number;
  mimeType: string;
}

export class CreateProgressRequest {
  public readonly userId: string;
  public readonly resourceId: string;
  public readonly completionPercentage?: number;
  public readonly timeSpentMinutes?: number;
  public readonly progressStatus: ProgressStatus;
  public readonly trackingType: TrackingType;
  public readonly challengesFaced?: string;
  public readonly resourcesAccessed?: boolean;
  public readonly assignmentsCompleted?: boolean;
  public readonly mediaAttachments?: ProgressMediaData[];
  public readonly notes?: string;
  public readonly trackingDate?: Date;
  public readonly requestingUser: {
    id: string;
    role: string;
    collegeId?: string;
    departmentId?: string;
  };

  private constructor(data: {
    userId: string;
    resourceId: string;
    completionPercentage?: number;
    timeSpentMinutes?: number;
    progressStatus: ProgressStatus;
    trackingType: TrackingType;
    challengesFaced?: string;
    resourcesAccessed?: boolean;
    assignmentsCompleted?: boolean;
    mediaAttachments?: ProgressMediaData[];
    notes?: string;
    trackingDate?: Date;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }) {
    this.userId = data.userId;
    this.resourceId = data.resourceId;
    this.completionPercentage = data.completionPercentage;
    this.timeSpentMinutes = data.timeSpentMinutes;
    this.progressStatus = data.progressStatus;
    this.trackingType = data.trackingType;
    this.challengesFaced = data.challengesFaced;
    this.resourcesAccessed = data.resourcesAccessed;
    this.assignmentsCompleted = data.assignmentsCompleted;
    this.mediaAttachments = data.mediaAttachments;
    this.notes = data.notes;
    this.trackingDate = data.trackingDate;
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
  ): CreateProgressRequest {
    return new CreateProgressRequest({
      userId: body.userId,
      resourceId: body.resourceId,
      completionPercentage: body.completionPercentage ? parseFloat(body.completionPercentage) : undefined,
      timeSpentMinutes: body.timeSpentMinutes ? parseInt(body.timeSpentMinutes, 10) : undefined,
      progressStatus: body.progressStatus || 'excellent',
      trackingType: body.trackingType || 'learning',
      challengesFaced: body.challengesFaced,
      resourcesAccessed: body.resourcesAccessed,
      assignmentsCompleted: body.assignmentsCompleted,
      mediaAttachments: body.mediaAttachments,
      notes: body.notes,
      trackingDate: body.trackingDate ? new Date(body.trackingDate) : undefined,
      requestingUser,
    });
  }

  /**
   * Create from plain object
   */
  public static fromPlainObject(data: {
    userId: string;
    resourceId: string;
    completionPercentage?: number;
    timeSpentMinutes?: number;
    progressStatus?: ProgressStatus;
    trackingType?: TrackingType;
    challengesFaced?: string;
    resourcesAccessed?: boolean;
    assignmentsCompleted?: boolean;
    mediaAttachments?: ProgressMediaData[];
    notes?: string;
    trackingDate?: Date;
    requestingUser: {
      id: string;
      role: string;
      collegeId?: string;
      departmentId?: string;
    };
  }): CreateProgressRequest {
    return new CreateProgressRequest({
      ...data,
      progressStatus: data.progressStatus || 'excellent',
      trackingType: data.trackingType || 'learning',
    });
  }

  /**
   * Validate the request
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!this.userId?.trim()) {
      errors.push('User ID is required');
    }

    if (!this.resourceId?.trim()) {
      errors.push('Resource ID is required');
    }

    if (!this.requestingUser?.id?.trim()) {
      errors.push('Requesting user ID is required');
    }

    if (!this.requestingUser?.role?.trim()) {
      errors.push('Requesting user role is required');
    }

    // Validate UUID format for IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (this.userId && !uuidRegex.test(this.userId)) {
      errors.push('Invalid user ID format');
    }

    if (this.resourceId && !uuidRegex.test(this.resourceId)) {
      errors.push('Invalid resource ID format');
    }

    if (this.requestingUser?.id && !uuidRegex.test(this.requestingUser.id)) {
      errors.push('Invalid requesting user ID format');
    }

    // Validate completion percentage
    if (this.completionPercentage !== undefined) {
      if (this.completionPercentage < 0 || this.completionPercentage > 100) {
        errors.push('Completion percentage must be between 0 and 100');
      }
    }

    // Validate time spent
    if (this.timeSpentMinutes !== undefined) {
      if (this.timeSpentMinutes < 0 || this.timeSpentMinutes > 1440) { // Max 24 hours
        errors.push('Time spent must be between 0 and 1440 minutes (24 hours)');
      }
    }

    // Validate progress status
    const validProgressStatuses: ProgressStatus[] = ['excellent', 'struggling', 'needs_help', 'blocked', 'improving'];
    if (!validProgressStatuses.includes(this.progressStatus)) {
      errors.push('Invalid progress status');
    }

    // Validate tracking type
    const validTrackingTypes: TrackingType[] = ['learning', 'assessment', 'assignment', 'project'];
    if (!validTrackingTypes.includes(this.trackingType)) {
      errors.push('Invalid tracking type');
    }

    // Validate tracking date
    if (this.trackingDate) {
      const now = new Date();
      const maxFutureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

      if (this.trackingDate > maxFutureDate) {
        errors.push('Tracking date cannot be more than 1 day in the future');
      }

      const minPastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      if (this.trackingDate < minPastDate) {
        errors.push('Tracking date cannot be more than 1 year in the past');
      }
    }

    // Validate text field lengths
    if (this.challengesFaced && this.challengesFaced.length > 1000) {
      errors.push('Challenges faced cannot exceed 1000 characters');
    }

    if (this.notes && this.notes.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }

    // Validate media attachments
    if (this.mediaAttachments) {
      if (this.mediaAttachments.length > 10) {
        errors.push('Cannot attach more than 10 media files');
      }

      for (let i = 0; i < this.mediaAttachments.length; i++) {
        const media = this.mediaAttachments[i];
        
        if (!media.mediaUrl?.trim()) {
          errors.push(`Media attachment ${i + 1}: URL is required`);
        }

        if (!media.filename?.trim()) {
          errors.push(`Media attachment ${i + 1}: Filename is required`);
        }

        if (!media.mimeType?.trim()) {
          errors.push(`Media attachment ${i + 1}: MIME type is required`);
        }

        if (media.fileSize <= 0 || media.fileSize > 50 * 1024 * 1024) { // Max 50MB
          errors.push(`Media attachment ${i + 1}: File size must be between 1 byte and 50MB`);
        }

        const validMediaTypes: MediaType[] = ['milestone', 'photo', 'video', 'document'];
        if (!validMediaTypes.includes(media.mediaType)) {
          errors.push(`Media attachment ${i + 1}: Invalid media type`);
        }

        if (media.caption && media.caption.length > 255) {
          errors.push(`Media attachment ${i + 1}: Caption cannot exceed 255 characters`);
        }
      }
    }

    // Validate authorization
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff', 'student'];
    if (!allowedRoles.includes(this.requestingUser.role)) {
      errors.push('Invalid user role for progress tracking');
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
   * Get effective tracking date
   */
  public getEffectiveTrackingDate(): Date {
    return this.trackingDate || new Date();
  }

  /**
   * Check if requesting user can create progress for this user
   */
  public canCreateProgressForUser(): boolean {
    // Users can create progress for themselves
    if (this.requestingUser.id === this.userId) {
      return true;
    }

    // Staff and above can create progress for students
    const allowedRoles = ['super_admin', 'admin', 'principal', 'hod', 'staff'];
    return allowedRoles.includes(this.requestingUser.role);
  }

  /**
   * Check if progress indicates struggling
   */
  public isStruggling(): boolean {
    return ['struggling', 'needs_help', 'blocked'].includes(this.progressStatus);
  }

  /**
   * Check if progress is complete
   */
  public isComplete(): boolean {
    return this.completionPercentage === 100;
  }

  /**
   * Get engagement score based on provided data
   */
  public calculateEngagementScore(): number {
    let score = 50; // Base score

    // Time spent contribution (0-30 points)
    if (this.timeSpentMinutes) {
      if (this.timeSpentMinutes >= 60) score += 30;
      else if (this.timeSpentMinutes >= 30) score += 20;
      else if (this.timeSpentMinutes >= 15) score += 10;
    }

    // Resource access contribution (0-20 points)
    if (this.resourcesAccessed) score += 20;

    // Assignment completion contribution (0-20 points)
    if (this.assignmentsCompleted) score += 20;

    // Media attachments contribution (0-10 points)
    if (this.mediaAttachments && this.mediaAttachments.length > 0) {
      score += Math.min(10, this.mediaAttachments.length * 2);
    }

    // Progress status adjustment (-20 to +10 points)
    switch (this.progressStatus) {
      case 'excellent':
        score += 10;
        break;
      case 'improving':
        score += 5;
        break;
      case 'struggling':
        score -= 10;
        break;
      case 'needs_help':
        score -= 15;
        break;
      case 'blocked':
        score -= 20;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      userId: this.userId,
      resourceId: this.resourceId,
      completionPercentage: this.completionPercentage,
      timeSpentMinutes: this.timeSpentMinutes,
      progressStatus: this.progressStatus,
      trackingType: this.trackingType,
      challengesFaced: this.challengesFaced,
      resourcesAccessed: this.resourcesAccessed,
      assignmentsCompleted: this.assignmentsCompleted,
      mediaAttachments: this.mediaAttachments,
      notes: this.notes,
      trackingDate: this.trackingDate?.toISOString(),
      requestingUser: this.requestingUser,
    };
  }
}
