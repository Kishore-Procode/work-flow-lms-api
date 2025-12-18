/**
 * Learning Resource Repository Interface
 * 
 * Domain layer interface defining data access operations for LearningResource entity.
 * Infrastructure layer will implement this interface.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { LearningResource, ResourceStatus } from '../entities/LearningResource';

export interface LearningResourceFilter {
  collegeId?: string;
  departmentId?: string;
  assignedStudentId?: string;
  status?: ResourceStatus;
  category?: string;
  search?: string;
  hasLocation?: boolean;
  assignmentDateFrom?: Date;
  assignmentDateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedLearningResourceResult {
  data: LearningResource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LearningResourceStatistics {
  total: number;
  available: number;
  assigned: number;
  completed: number;
  archived: number;
  byCategory: Record<string, number>;
  byCollege: Record<string, number>;
  byDepartment: Record<string, number>;
  assignmentRate: number;
  completionRate: number;
}

export interface ILearningResourceRepository {
  /**
   * Find learning resource by ID
   */
  findById(id: string): Promise<LearningResource | null>;

  /**
   * Find learning resource by resource code
   */
  findByResourceCode(resourceCode: string): Promise<LearningResource | null>;

  /**
   * Find learning resources with filters and pagination
   */
  findWithFilters(filter: LearningResourceFilter): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources by college
   */
  findByCollege(collegeId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources by department
   */
  findByDepartment(departmentId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources by status
   */
  findByStatus(status: ResourceStatus, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources by category
   */
  findByCategory(category: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources assigned to student
   */
  findByAssignedStudent(studentId: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find available resources for assignment
   */
  findAvailable(collegeId?: string, departmentId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources with location data
   */
  findWithLocation(collegeId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Find resources assigned within date range
   */
  findAssignedInDateRange(startDate: Date, endDate: Date): Promise<LearningResource[]>;

  /**
   * Find overdue resources (assigned but not started)
   */
  findOverdue(days: number): Promise<LearningResource[]>;

  /**
   * Check if resource code exists
   */
  existsByResourceCode(resourceCode: string, excludeId?: string): Promise<boolean>;

  /**
   * Save new learning resource
   */
  save(resource: LearningResource): Promise<LearningResource>;

  /**
   * Update existing learning resource
   */
  update(resource: LearningResource): Promise<LearningResource>;

  /**
   * Delete learning resource (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total learning resources
   */
  count(): Promise<number>;

  /**
   * Count resources by status
   */
  countByStatus(status: ResourceStatus): Promise<number>;

  /**
   * Count resources by college
   */
  countByCollege(collegeId: string): Promise<number>;

  /**
   * Count resources by department
   */
  countByDepartment(departmentId: string): Promise<number>;

  /**
   * Count resources by category
   */
  countByCategory(category: string): Promise<number>;

  /**
   * Count assigned resources for student
   */
  countByAssignedStudent(studentId: string): Promise<number>;

  /**
   * Search resources by code, category, or context
   */
  search(query: string, collegeId?: string, page?: number, limit?: number): Promise<PaginatedLearningResourceResult>;

  /**
   * Get learning resource statistics
   */
  getStatistics(collegeId?: string, departmentId?: string): Promise<LearningResourceStatistics>;

  /**
   * Get categories used in the system
   */
  getCategories(collegeId?: string): Promise<string[]>;

  /**
   * Get resources near location (within radius in km)
   */
  findNearLocation(latitude: number, longitude: number, radiusKm: number): Promise<LearningResource[]>;

  /**
   * Bulk assign resources to students
   */
  bulkAssign(assignments: Array<{ resourceId: string; studentId: string; assignmentDate?: Date }>): Promise<boolean>;

  /**
   * Bulk unassign resources
   */
  bulkUnassign(resourceIds: string[]): Promise<boolean>;

  /**
   * Bulk update status
   */
  bulkUpdateStatus(resourceIds: string[], status: ResourceStatus): Promise<boolean>;

  /**
   * Bulk save resources
   */
  saveMany(resources: LearningResource[]): Promise<LearningResource[]>;

  /**
   * Bulk update resources
   */
  updateMany(resources: LearningResource[]): Promise<LearningResource[]>;

  /**
   * Bulk delete resources
   */
  deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Execute operations within a transaction
   */
  withTransaction<T>(operation: (repository: ILearningResourceRepository) => Promise<T>): Promise<T>;
}
