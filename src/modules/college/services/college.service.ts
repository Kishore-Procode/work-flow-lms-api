import { collegeRepository } from '../repositories/college.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { CollegeModel, CreateCollegeRequest, UpdateCollegeRequest, CollegeWithDetails } from '../models/college.model';
import { College, UserRole } from '../../../types';
import { PaginatedResult } from '../../../models/base.repository';

export class CollegeService {
  /**
   * Get colleges with role-based access
   */
  async getColleges(
    options: any,
    requestingUser: { role: UserRole; collegeId?: string }
  ): Promise<PaginatedResult<CollegeWithDetails>> {
    if (requestingUser.role === 'principal' && requestingUser.collegeId) {
      // Principal can only see their own college
      const college = await collegeRepository.findByIdWithPrincipal(requestingUser.collegeId);
      if (!college) {
        throw new Error('College not found');
      }

      return {
        data: [college],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      };
    }

    // Admin can see all colleges
    return await collegeRepository.findAllWithPrincipal(options);
  }

  /**
   * Get college by ID with access control
   */
  async getCollegeById(
    collegeId: string,
    requestingUser: { role: UserRole; collegeId?: string }
  ): Promise<CollegeWithDetails | null> {
    // Check permissions
    if (requestingUser.role !== 'admin' && requestingUser.collegeId !== collegeId) {
      throw new Error('Access denied to this college');
    }

    return await collegeRepository.findByIdWithPrincipal(collegeId);
  }

  /**
   * Create new college
   */
  async createCollege(
    collegeData: CreateCollegeRequest,
    createdBy: { role: UserRole }
  ): Promise<College> {
    // Only admin can create colleges
    if (createdBy.role !== 'admin') {
      throw new Error('Only administrators can create colleges');
    }

    // Validate input
    if (!CollegeModel.validateCreateCollegeRequest(collegeData)) {
      throw new Error('Invalid college data');
    }

    // Check if email already exists
    const existingCollege = await collegeRepository.findByEmail(collegeData.email);
    if (existingCollege) {
      throw new Error('College email already exists');
    }

    // Validate phone number
    if (!CollegeModel.isValidPhone(collegeData.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate website if provided
    if (collegeData.website && !CollegeModel.isValidWebsite(collegeData.website)) {
      throw new Error('Invalid website URL');
    }

    // Validate establishment year if provided
    if (collegeData.established && !CollegeModel.isValidEstablishmentYear(collegeData.established)) {
      throw new Error('Invalid establishment year');
    }

    // Validate principal if provided
    if (collegeData.principalId) {
      const principal = await userRepository.findById(collegeData.principalId);
      if (!principal) {
        throw new Error('Principal not found');
      }

      if (principal.role !== 'principal') {
        throw new Error('User is not a principal');
      }

      // Check if principal is already assigned to another college
      const existingAssignment = await collegeRepository.findByPrincipalId(collegeData.principalId);
      if (existingAssignment) {
        throw new Error('Principal is already assigned to another college');
      }
    }

    const newCollege = await collegeRepository.createCollege({
      ...collegeData,
      email: collegeData.email.toLowerCase(),
    });

    // Update principal's college assignment if provided
    if (collegeData.principalId) {
      await userRepository.updateUser(collegeData.principalId, {
        collegeId: newCollege.id,
      });
    }

    return newCollege;
  }

  /**
   * Update college
   */
  async updateCollege(
    collegeId: string,
    updateData: UpdateCollegeRequest,
    updatedBy: { role: UserRole; collegeId?: string }
  ): Promise<College> {
    // Check permissions
    if (updatedBy.role !== 'admin' && updatedBy.collegeId !== collegeId) {
      throw new Error('Access denied to update this college');
    }

    // Principal can only update limited fields
    if (updatedBy.role === 'principal') {
      const allowedFields = ['name', 'address', 'phone', 'website'];
      const updateFields = Object.keys(updateData);
      const hasUnallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasUnallowedFields) {
        throw new Error('Principals can only update name, address, phone, and website');
      }
    }

    // Validate input
    if (!CollegeModel.validateUpdateCollegeRequest(updateData)) {
      throw new Error('Invalid update data');
    }

    // Check if email is being changed and if it already exists
    if (updateData.email) {
      const existingCollege = await collegeRepository.findByEmail(updateData.email);
      if (existingCollege && existingCollege.id !== collegeId) {
        throw new Error('College email already exists');
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Validate phone if being updated
    if (updateData.phone && !CollegeModel.isValidPhone(updateData.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Validate website if being updated
    if (updateData.website && !CollegeModel.isValidWebsite(updateData.website)) {
      throw new Error('Invalid website URL');
    }

    // Validate establishment year if being updated
    if (updateData.established && !CollegeModel.isValidEstablishmentYear(updateData.established)) {
      throw new Error('Invalid establishment year');
    }

    // Validate principal if being updated
    if (updateData.principalId) {
      const principal = await userRepository.findById(updateData.principalId);
      if (!principal) {
        throw new Error('Principal not found');
      }

      if (principal.role !== 'principal') {
        throw new Error('User is not a principal');
      }

      // Check if principal is already assigned to another college
      const existingAssignment = await collegeRepository.findByPrincipalId(updateData.principalId);
      if (existingAssignment && existingAssignment.id !== collegeId) {
        throw new Error('Principal is already assigned to another college');
      }
    }

    const updatedCollege = await collegeRepository.updateCollege(collegeId, updateData);
    if (!updatedCollege) {
      throw new Error('College not found');
    }

    // Update principal's college assignment if changed
    if (updateData.principalId) {
      await userRepository.updateUser(updateData.principalId, {
        collegeId: collegeId,
      });
    }

    return updatedCollege;
  }

  /**
   * Delete college
   */
  async deleteCollege(collegeId: string, deletedBy: { role: UserRole }): Promise<void> {
    // Only admin can delete colleges
    if (deletedBy.role !== 'admin') {
      throw new Error('Only administrators can delete colleges');
    }

    // Check if college has departments or students
    // This would require additional queries to department and user repositories
    // For now, we'll allow deletion and let database constraints handle it

    const deleted = await collegeRepository.delete(collegeId);
    if (!deleted) {
      throw new Error('College not found');
    }
  }

  /**
   * Assign principal to college
   */
  async assignPrincipal(
    collegeId: string,
    principalId: string,
    assignedBy: { role: UserRole }
  ): Promise<void> {
    // Only admin can assign principals
    if (assignedBy.role !== 'admin') {
      throw new Error('Only administrators can assign principals');
    }

    // Validate principal
    const principal = await userRepository.findById(principalId);
    if (!principal) {
      throw new Error('Principal not found');
    }

    if (principal.role !== 'principal') {
      throw new Error('User is not a principal');
    }

    // Check if principal is already assigned to another college
    const existingAssignment = await collegeRepository.findByPrincipalId(principalId);
    if (existingAssignment && existingAssignment.id !== collegeId) {
      throw new Error('Principal is already assigned to another college');
    }

    // Assign principal to college
    const success = await collegeRepository.assignPrincipal(collegeId, principalId);
    if (!success) {
      throw new Error('College not found');
    }

    // Update principal's college assignment
    await userRepository.updateUser(principalId, {
      collegeId: collegeId,
    });
  }

  /**
   * Get college statistics
   */
  async getCollegeStatistics(): Promise<any> {
    return await collegeRepository.getStatistics();
  }

  /**
   * Search colleges
   */
  async searchColleges(query: string): Promise<College[]> {
    // This would require implementing search in the repository
    // For now, return empty array
    return [];
  }

  /**
   * Get colleges without principal
   */
  async getCollegesWithoutPrincipal(): Promise<College[]> {
    const allColleges = await collegeRepository.findAllWithPrincipal({ limit: 1000 });
    return allColleges.data.filter(college => !college.principalId);
  }
}
