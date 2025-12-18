/**
 * Department Repository Interface
 * 
 * Domain layer interface defining data access operations for Department entity.
 * Infrastructure layer will implement this interface.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Department } from '../entities/Department';

export interface DepartmentFilter {
  collegeId?: string;
  courseId?: string;
  hodId?: string;
  isActive?: boolean;
  isCustom?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDepartmentResult {
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DepartmentStatistics {
  total: number;
  active: number;
  inactive: number;
  withHod: number;
  withoutHod: number;
  totalStudents: number;
  totalStaff: number;
  byCollege: Record<string, number>;
  byCourse: Record<string, number>;
}

export interface IDepartmentRepository {
  /**
   * Find department by ID
   */
  findById(id: string): Promise<Department | null>;

  /**
   * Find department by code within a college
   */
  findByCode(code: string, collegeId: string): Promise<Department | null>;

  /**
   * Find departments with filters and pagination
   */
  findWithFilters(filter: DepartmentFilter): Promise<PaginatedDepartmentResult>;

  /**
   * Find departments with simple filters (for use cases)
   */
  findWithSimpleFilters(
    filter: {
      collegeId?: string;
      courseId?: string;
      hodId?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: {
      page: number;
      limit: number;
      offset: number;
    }
  ): Promise<Department[]>;

  /**
   * Count departments with filters
   */
  countWithFilters(filter: {
    collegeId?: string;
    courseId?: string;
    hodId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<number>;

  /**
   * Find departments by college
   */
  findByCollege(collegeId: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult>;

  /**
   * Find departments by course
   */
  findByCourse(courseId: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult>;

  /**
   * Find departments by HOD
   */
  findByHod(hodId: string): Promise<Department[]>;

  /**
   * Find active departments
   */
  findActive(page?: number, limit?: number): Promise<PaginatedDepartmentResult>;

  /**
   * Find departments without HOD
   */
  findWithoutHod(collegeId?: string): Promise<Department[]>;

  /**
   * Check if department code exists in college
   */
  existsByCode(code: string, collegeId: string, excludeId?: string): Promise<boolean>;

  /**
   * Check if department name exists in college
   */
  existsByName(name: string, collegeId: string, excludeId?: string): Promise<boolean>;

  /**
   * Save new department
   */
  save(department: Department): Promise<Department>;

  /**
   * Update existing department
   */
  update(department: Department): Promise<Department>;

  /**
   * Delete department (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total departments
   */
  count(): Promise<number>;

  /**
   * Count departments by college
   */
  countByCollege(collegeId: string): Promise<number>;

  /**
   * Count departments by course
   */
  countByCourse(courseId: string): Promise<number>;

  /**
   * Count active departments
   */
  countActive(): Promise<number>;

  /**
   * Count departments with HOD
   */
  countWithHod(): Promise<number>;

  /**
   * Search departments by name or code
   */
  search(query: string, collegeId?: string, page?: number, limit?: number): Promise<PaginatedDepartmentResult>;

  /**
   * Get department statistics
   */
  getStatistics(collegeId?: string): Promise<DepartmentStatistics>;

  /**
   * Find departments created within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Department[]>;

  /**
   * Bulk save departments
   */
  saveMany(departments: Department[]): Promise<Department[]>;

  /**
   * Bulk update departments
   */
  updateMany(departments: Department[]): Promise<Department[]>;

  /**
   * Bulk delete departments
   */
  deleteMany(ids: string[]): Promise<boolean>;

  /**
   * Execute operations within a transaction
   */
  withTransaction<T>(operation: (repository: IDepartmentRepository) => Promise<T>): Promise<T>;
}
