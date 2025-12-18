/**
 * Create Department Response DTO
 * 
 * Output DTO for department creation result.
 * Formats response data for API consumers.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Department } from '../../../domain/entities/Department';

export class CreateDepartmentResponse {
  public readonly department: {
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
  };

  private constructor(department: Department) {
    this.department = {
      id: department.getId(),
      name: department.getName(),
      code: department.getCode(),
      collegeId: department.getCollegeId(),
      courseId: department.getCourseId(),
      hodId: department.getHodId(),
      totalStudents: department.getTotalStudents(),
      totalStaff: department.getTotalStaff(),
      established: department.getEstablished(),
      isActive: department.isActiveDepartment(),
      isCustom: department.isCustomDepartment(),
      createdAt: department.getCreatedAt().toISOString(),
      updatedAt: department.getUpdatedAt().toISOString(),
    };
  }

  /**
   * Create from domain entity
   */
  public static fromDomain(department: Department): CreateDepartmentResponse {
    return new CreateDepartmentResponse(department);
  }

  /**
   * Convert to API response format
   */
  public toApiResponse(): {
    success: boolean;
    message: string;
    data: any;
  } {
    return {
      success: true,
      message: 'Department created successfully',
      data: {
        id: this.department.id,
        name: this.department.name,
        code: this.department.code,
        collegeId: this.department.collegeId,
        courseId: this.department.courseId,
        hodId: this.department.hodId,
        totalStudents: this.department.totalStudents,
        totalStaff: this.department.totalStaff,
        established: this.department.established,
        isActive: this.department.isActive,
        isCustom: this.department.isCustom,
        createdAt: this.department.createdAt,
        updatedAt: this.department.updatedAt,
      },
    };
  }

  /**
   * Convert to plain object
   */
  public toPlainObject(): any {
    return {
      department: this.department,
    };
  }

  /**
   * Get department summary
   */
  public getDepartmentSummary(): {
    id: string;
    name: string;
    code: string;
    hasHod: boolean;
    studentCount: number;
    staffCount: number;
    isActive: boolean;
  } {
    return {
      id: this.department.id,
      name: this.department.name,
      code: this.department.code,
      hasHod: !!this.department.hodId,
      studentCount: this.department.totalStudents,
      staffCount: this.department.totalStaff,
      isActive: this.department.isActive,
    };
  }
}
