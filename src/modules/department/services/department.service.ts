import { departmentRepository, CreateDepartmentData, UpdateDepartmentData } from '../repositories/department.repository';
import { Department, DepartmentFilter } from '../../../types';
import { PaginatedResult } from '../../../models/base.repository';

export class DepartmentService {
  /**
   * Get departments with filtering and pagination
   */
  async getDepartments(
    filters: DepartmentFilter = {},
    context: { role: string; collegeId?: string; departmentId?: string }
  ): Promise<PaginatedResult<Department>> {
    // Apply role-based filtering
    const queryFilters: any = { ...filters };

    // Principal can only see departments in their college
    if (context.role === 'principal' && context.collegeId) {
      queryFilters.collegeId = context.collegeId;
    }

    // HOD can only see their own department
    if (context.role === 'hod' && context.departmentId) {
      queryFilters.id = context.departmentId;
    }

    return await departmentRepository.findAllWithDetails(queryFilters);
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department | null> {
    return await departmentRepository.findByIdWithDetails(id);
  }

  /**
   * Create new department
   */
  async createDepartment(data: CreateDepartmentData): Promise<Department> {
    return await departmentRepository.createDepartment(data);
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department | null> {
    return await departmentRepository.updateDepartment(id, data);
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string): Promise<boolean> {
    return await departmentRepository.delete(id);
  }

  /**
   * Get departments by college
   */
  async getDepartmentsByCollege(collegeId: string): Promise<Department[]> {
    const result = await departmentRepository.findByCollege(collegeId, { limit: 100 });
    return result.data;
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(): Promise<any> {
    return await departmentRepository.getStatistics();
  }
}
