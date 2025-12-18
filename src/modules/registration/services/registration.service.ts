import { registrationRepository, CreateRegistrationRequestData, UpdateRegistrationRequestData } from '../repositories/registration.repository';
import { RegistrationRequest, RegistrationRequestFilter, RegistrationRequestStatus } from '../../../types';
import { PaginatedResult } from '../../../models/base.repository';

export class RegistrationService {
  /**
   * Get registration requests with filtering and pagination
   */
  async getRegistrationRequests(
    filters: RegistrationRequestFilter = {},
    context: { role: string; collegeId?: string; departmentId?: string }
  ): Promise<PaginatedResult<RegistrationRequest>> {
    // Apply role-based filtering
    const queryFilters: any = { ...filters };

    // Principal can only see requests for their college
    if (context.role === 'principal' && context.collegeId) {
      queryFilters.collegeId = context.collegeId;
    }

    // HOD can only see requests for their department
    if (context.role === 'hod' && context.departmentId) {
      queryFilters.departmentId = context.departmentId;
    }

    return await registrationRepository.findAllWithDetails(queryFilters);
  }

  /**
   * Get registration request by ID
   */
  async getRegistrationRequestById(id: string): Promise<RegistrationRequest | null> {
    return await registrationRepository.findByIdWithDetails(id);
  }

  /**
   * Create new registration request
   */
  async createRegistrationRequest(data: CreateRegistrationRequestData): Promise<RegistrationRequest> {
    const requestData = {
      ...data,
      status: 'pending' as RegistrationRequestStatus,
      requestedAt: new Date(),
    };

    return await registrationRepository.createRegistrationRequest(requestData);
  }

  /**
   * Update registration request
   */
  async updateRegistrationRequest(id: string, data: UpdateRegistrationRequestData): Promise<RegistrationRequest | null> {
    return await registrationRepository.updateRegistrationRequest(id, data);
  }

  /**
   * Approve registration request
   */
  async approveRegistrationRequest(id: string, reviewedBy: string): Promise<RegistrationRequest | null> {
    const updateData: UpdateRegistrationRequestData = {
      status: 'approved',
      reviewedBy,
      reviewedAt: new Date(),
    };

    return await registrationRepository.updateRegistrationRequest(id, updateData);
  }

  /**
   * Reject registration request
   */
  async rejectRegistrationRequest(id: string, reviewedBy: string, rejectionReason?: string): Promise<RegistrationRequest | null> {
    const updateData: UpdateRegistrationRequestData = {
      status: 'rejected',
      reviewedBy,
      reviewedAt: new Date(),
      rejectionReason,
    };

    return await registrationRepository.updateRegistrationRequest(id, updateData);
  }

  /**
   * Delete registration request
   */
  async deleteRegistrationRequest(id: string): Promise<boolean> {
    return await registrationRepository.delete(id);
  }

  /**
   * Get registration request statistics
   */
  async getRegistrationRequestStatistics(): Promise<any> {
    return await registrationRepository.getStatistics();
  }
}
