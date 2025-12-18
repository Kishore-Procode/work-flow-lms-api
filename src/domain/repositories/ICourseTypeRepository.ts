/**
 * Course Type Repository Interface
 * 
 * Domain layer interface for course type data access.
 * Defines the contract for retrieving course type configurations.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export interface CourseType {
  id: string;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseTypeRepository {
  /**
   * Find all active course types
   * @returns Promise<CourseType[]> Array of active course types ordered by display_order
   */
  findAllActive(): Promise<CourseType[]>;

  /**
   * Find course type by code
   * @param code Course type code (e.g., 'UG', 'PG')
   * @returns Promise<CourseType | null> Course type or null if not found
   */
  findByCode(code: string): Promise<CourseType | null>;

  /**
   * Find course type by ID
   * @param id Course type ID
   * @returns Promise<CourseType | null> Course type or null if not found
   */
  findById(id: string): Promise<CourseType | null>;

  /**
   * Find all course types (including inactive)
   * @returns Promise<CourseType[]> Array of all course types ordered by display_order
   */
  findAll(): Promise<CourseType[]>;
}

