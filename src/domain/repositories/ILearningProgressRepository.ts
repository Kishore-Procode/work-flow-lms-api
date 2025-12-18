/**
 * Learning Progress Repository Interface
 * 
 * Domain layer interface defining data access operations for LearningProgress entity.
 * Infrastructure layer will implement this interface.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { LearningProgress, ProgressStatus, TrackingType } from '../entities/LearningProgress';

export interface LearningProgressFilter {
  resourceId?: string;
  userId?: string;
  progressStatus?: ProgressStatus;
  trackingType?: TrackingType;
  verified?: boolean;
  verifiedBy?: string;
  trackingDateFrom?: Date;
  trackingDateTo?: Date;
  completionPercentageMin?: number;
  completionPercentageMax?: number;
  hasMedia?: boolean;
  hasLocation?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedLearningProgressResult {
  data: LearningProgress[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LearningProgressStatistics {
  total: number;
  verified: number;
  unverified: number;
  byStatus: Record<ProgressStatus, number>;
  byTrackingType: Record<TrackingType, number>;
  averageCompletion: number;
  averageTimeSpent: number;
  strugglingStudents: number;
  completedResources: number;
}

export interface StudentProgressSummary {
  userId: string;
  totalResources: number;
  completedResources: number;
  averageCompletion: number;
  totalTimeSpent: number;
  strugglingResources: number;
  lastActivity: Date;
}

export interface ResourceProgressSummary {
  resourceId: string;
  totalStudents: number;
  averageCompletion: number;
  completedStudents: number;
  strugglingStudents: number;
  averageTimeSpent: number;
  lastActivity: Date;
}

export interface ILearningProgressRepository {
  /**
   * Find learning progress by ID
   */
  findById(id: string): Promise<LearningProgress | null>;

  /**
   * Find progress records with filters and pagination
   */
  findWithFilters(filter: LearningProgressFilter): Promise<PaginatedLearningProgressResult>;

  /**
   * Find progress by resource
   */
  findByResource(resourceId: string, page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find progress by user
   */
  findByUser(userId: string, page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find progress by user and resource
   */
  findByUserAndResource(userId: string, resourceId: string): Promise<LearningProgress[]>;

  /**
   * Find latest progress for user and resource
   */
  findLatestByUserAndResource(userId: string, resourceId: string): Promise<LearningProgress | null>;

  /**
   * Find progress by status
   */
  findByStatus(status: ProgressStatus, page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find struggling students
   */
  findStrugglingStudents(resourceId?: string): Promise<LearningProgress[]>;

  /**
   * Find verified progress
   */
  findVerified(verifierId?: string, page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find unverified progress
   */
  findUnverified(page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find progress with media
   */
  findWithMedia(page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Find progress within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<LearningProgress[]>;

  /**
   * Find recent progress (last N days)
   */
  findRecent(days: number, page?: number, limit?: number): Promise<PaginatedLearningProgressResult>;

  /**
   * Save new progress record
   */
  save(progress: LearningProgress): Promise<LearningProgress>;

  /**
   * Update existing progress record
   */
  update(progress: LearningProgress): Promise<LearningProgress>;

  /**
   * Delete progress record
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total progress records
   */
  count(): Promise<number>;

  /**
   * Count progress by resource
   */
  countByResource(resourceId: string): Promise<number>;

  /**
   * Count progress by user
   */
  countByUser(userId: string): Promise<number>;

  /**
   * Count progress by status
   */
  countByStatus(status: ProgressStatus): Promise<number>;

  /**
   * Count verified progress
   */
  countVerified(): Promise<number>;

  /**
   * Count struggling students
   */
  countStrugglingStudents(): Promise<number>;

  /**
   * Get progress statistics
   */
  getStatistics(resourceId?: string, userId?: string): Promise<LearningProgressStatistics>;

  /**
   * Get student progress summary
   */
  getStudentProgressSummary(userId: string): Promise<StudentProgressSummary>;

  /**
   * Get resource progress summary
   */
  getResourceProgressSummary(resourceId: string): Promise<ResourceProgressSummary>;

  /**
   * Get completion rate for resource
   */
  getResourceCompletionRate(resourceId: string): Promise<number>;

  /**
   * Get average completion time for resource
   */
  getAverageCompletionTime(resourceId: string): Promise<number>;

  /**
   * Get student engagement score
   */
  getStudentEngagementScore(userId: string): Promise<number>;

  /**
   * Find students who haven't updated progress recently
   */
  findInactiveStudents(days: number, resourceId?: string): Promise<string[]>;

  /**
   * Get progress trend for student (last N records)
   */
  getStudentProgressTrend(userId: string, limit?: number): Promise<LearningProgress[]>;

  /**
   * Get progress trend for resource (last N records)
   */
  getResourceProgressTrend(resourceId: string, limit?: number): Promise<LearningProgress[]>;

  /**
   * Bulk save progress records
   */
  saveMany(progressRecords: LearningProgress[]): Promise<LearningProgress[]>;

  /**
   * Bulk update progress records
   */
  updateMany(progressRecords: LearningProgress[]): Promise<LearningProgress[]>;

  /**
   * Bulk verify progress records
   */
  bulkVerify(progressIds: string[], verifierId: string): Promise<boolean>;

  /**
   * Bulk delete progress records
   */
  deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Execute operations within a transaction
   */
  withTransaction<T>(operation: (repository: ILearningProgressRepository) => Promise<T>): Promise<T>;
}
