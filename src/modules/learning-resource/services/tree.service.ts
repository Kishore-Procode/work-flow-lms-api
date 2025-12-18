import { learningResourceRepository, CreateresourceData, UpdateresourceData } from '../repositories/learning-resource.repository';
import { resource, resourceFilter, resourcestatus } from '../../../types';
import { PaginatedResult } from '../../../models/base.repository';

export class resourceservice {
  /**
   * Get resources with filtering and pagination
   */
  async getresources(
    filters: resourceFilter = {},
    context: { role: string; collegeId?: string; departmentId?: string; userId?: string }
  ): Promise<PaginatedResult<resource>> {
    // Apply role-based filtering
    const queryFilters: any = { ...filters };

    // Principal can only see resources in their college
    if (context.role === 'principal' && context.collegeId) {
      queryFilters.collegeId = context.collegeId;
    }

    // HOD can only see resources in their department
    if (context.role === 'hod' && context.departmentId) {
      queryFilters.departmentId = context.departmentId;
    }

    // Staff can see resources in their department
    if (context.role === 'staff' && context.departmentId) {
      queryFilters.departmentId = context.departmentId;
    }

    // Students can only see their assigned resources
    if (context.role === 'student' && context.userId) {
      queryFilters.assignedStudentId = context.userId;
    }

    return await learningResourceRepository.findWithFilters(queryFilters);
  }

  /**
   * Get resource by ID
   */
  async getresourceById(id: string): Promise<resource | null> {
    return await learningResourceRepository.findByIdWithDetails(id);
  }

  /**
   * Create new resource
   */
  async createresource(data: CreateresourceData): Promise<resource> {
    const resourceData = {
      ...data,
      status: data.status || 'started' as resourcestatus,
      startedDate: data.startedDate || new Date(),
    };

    return await learningResourceRepository.createresource(resourceData);
  }

  /**
   * Update resource
   */
  async updateresource(id: string, data: UpdateresourceData): Promise<resource | null> {
    return await learningResourceRepository.updateresource(id, data);
  }

  /**
   * Delete resource
   */
  async deleteresource(id: string): Promise<boolean> {
    return await learningResourceRepository.delete(id);
  }

  /**
   * Assign resource to student
   */
  async assignresourceToStudent(resourceId: string, studentId: string): Promise<resource | null> {
    const updateData: UpdateresourceData = {
      assignedStudentId: studentId,
      assignedDate: new Date(),
    };

    return await learningResourceRepository.updateresource(resourceId, updateData);
  }

  /**
   * Unassign resource from student
   */
  async unassignresourceFromStudent(resourceId: string): Promise<resource | null> {
    const updateData: UpdateresourceData = {
      assignedStudentId: null,
      assignedDate: null,
    };

    return await learningResourceRepository.updateresource(resourceId, updateData);
  }

  /**
   * Get resources by student
   */
  async getresourcesByStudent(studentId: string): Promise<resource[]> {
    const result = await learningResourceRepository.findWithFilters({ assignedStudentId: studentId, limit: 100 });
    return result.data;
  }

  /**
   * Get resources by college
   */
  async getresourcesByCollege(collegeId: string): Promise<resource[]> {
    const result = await learningResourceRepository.findWithFilters({ collegeId, limit: 1000 });
    return result.data;
  }

  /**
   * Get resources by department
   */
  async getresourcesByDepartment(departmentId: string): Promise<resource[]> {
    const result = await learningResourceRepository.findWithFilters({ departmentId, limit: 1000 });
    return result.data;
  }

  /**
   * Update resource status
   */
  async updateresourcestatus(resourceId: string, status: resourcestatus, notes?: string): Promise<resource | null> {
    const updateData: UpdateresourceData = {
      status,
      notes: notes || undefined,
    };

    return await learningResourceRepository.updateresource(resourceId, updateData);
  }

  /**
   * Get resource statistics
   */
  async getresourcestatistics(): Promise<any> {
    return await learningResourceRepository.getStatistics();
  }

  /**
   * Get resource statistics by college
   */
  async getresourcestatisticsByCollege(collegeId: string): Promise<any> {
    return await learningResourceRepository.getStatistics();
  }

  /**
   * Get resource statistics by department
   */
  async getresourcestatisticsByDepartment(departmentId: string): Promise<any> {
    return await learningResourceRepository.getStatistics();
  }
}
