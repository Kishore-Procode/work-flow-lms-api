/**
 * Get Departments Response DTO
 * 
 * Output DTO for departments retrieval with pagination.
 * Formats response data for API consumers.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Department } from '../../../domain/entities/Department';

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  collegeId: string;
  courseId?: string;
  hodId?: string;
  totalStudents: number;
  totalStaff: number;
  established?: string;
  isActive: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export class GetDepartmentsResponse {
  public readonly departments: DepartmentSummary[];
  public readonly pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  private constructor(
    departments: Department[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ) {
    this.departments = departments.map(dept => ({
      id: dept.getId(),
      name: dept.getName(),
      code: dept.getCode(),
      collegeId: dept.getCollegeId(),
      courseId: dept.getCourseId(),
      hodId: dept.getHodId(),
      totalStudents: dept.getTotalStudents(),
      totalStaff: dept.getTotalStaff(),
      established: dept.getEstablished(),
      isActive: dept.isActiveDepartment(),
      isCustom: dept.isCustomDepartment(),
      createdAt: dept.getCreatedAt().toISOString(),
      updatedAt: dept.getUpdatedAt().toISOString(),
    }));
    this.pagination = pagination;
  }

  /**
   * Create from domain entities and pagination info
   */
  public static fromDomain(
    departments: Department[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): GetDepartmentsResponse {
    return new GetDepartmentsResponse(departments, pagination);
  }

  /**
   * Convert to API response format
   */
  public toApiResponse(): {
    success: boolean;
    message: string;
    data: DepartmentSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    return {
      success: true,
      message: 'Departments retrieved successfully',
      data: this.departments,
      pagination: this.pagination,
    };
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      departments: this.departments,
      pagination: this.pagination,
    };
  }

  /**
   * Get departments count
   */
  public getCount(): number {
    return this.departments.length;
  }

  /**
   * Check if there are more pages
   */
  public hasMorePages(): boolean {
    return this.pagination.page < this.pagination.totalPages;
  }

  /**
   * Get departments by status
   */
  public getDepartmentsByStatus(isActive: boolean): DepartmentSummary[] {
    return this.departments.filter(dept => dept.isActive === isActive);
  }

  /**
   * Get departments with HOD
   */
  public getDepartmentsWithHod(): DepartmentSummary[] {
    return this.departments.filter(dept => dept.hodId);
  }

  /**
   * Get departments without HOD
   */
  public getDepartmentsWithoutHod(): DepartmentSummary[] {
    return this.departments.filter(dept => !dept.hodId);
  }

  /**
   * Get departments by college
   */
  public getDepartmentsByCollege(collegeId: string): DepartmentSummary[] {
    return this.departments.filter(dept => dept.collegeId === collegeId);
  }

  /**
   * Get departments by course
   */
  public getDepartmentsByCourse(courseId: string): DepartmentSummary[] {
    return this.departments.filter(dept => dept.courseId === courseId);
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    total: number;
    active: number;
    inactive: number;
    withHod: number;
    withoutHod: number;
    totalStudents: number;
    totalStaff: number;
    averageStudentsPerDepartment: number;
    averageStaffPerDepartment: number;
  } {
    const active = this.getDepartmentsByStatus(true).length;
    const withHod = this.getDepartmentsWithHod().length;
    const totalStudents = this.departments.reduce((sum, dept) => sum + dept.totalStudents, 0);
    const totalStaff = this.departments.reduce((sum, dept) => sum + dept.totalStaff, 0);

    return {
      total: this.departments.length,
      active,
      inactive: this.departments.length - active,
      withHod,
      withoutHod: this.departments.length - withHod,
      totalStudents,
      totalStaff,
      averageStudentsPerDepartment: this.departments.length > 0 ? totalStudents / this.departments.length : 0,
      averageStaffPerDepartment: this.departments.length > 0 ? totalStaff / this.departments.length : 0,
    };
  }

  /**
   * Get departments grouped by college
   */
  public getDepartmentsGroupedByCollege(): Record<string, DepartmentSummary[]> {
    const grouped: Record<string, DepartmentSummary[]> = {};
    
    for (const dept of this.departments) {
      if (!grouped[dept.collegeId]) {
        grouped[dept.collegeId] = [];
      }
      grouped[dept.collegeId].push(dept);
    }
    
    return grouped;
  }

  /**
   * Get departments for dropdown/select options
   */
  public getSelectOptions(): Array<{ value: string; label: string; disabled?: boolean }> {
    return this.departments.map(dept => ({
      value: dept.id,
      label: `${dept.name} (${dept.code})`,
      disabled: !dept.isActive,
    }));
  }

  /**
   * Filter departments by search term
   */
  public filterBySearch(searchTerm: string): DepartmentSummary[] {
    const term = searchTerm.toLowerCase();
    return this.departments.filter(dept =>
      dept.name.toLowerCase().includes(term) ||
      dept.code.toLowerCase().includes(term)
    );
  }

  /**
   * Sort departments by field
   */
  public sortBy(field: keyof DepartmentSummary, order: 'asc' | 'desc' = 'asc'): DepartmentSummary[] {
    return [...this.departments].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return order === 'asc' ? 1 : -1;
      if (bValue === undefined) return order === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
