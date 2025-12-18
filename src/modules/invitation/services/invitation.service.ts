import { invitationRepository, CreateInvitationData, UpdateInvitationData } from '../repositories/invitation.repository';
import { Invitation, InvitationFilter, InvitationStatus } from '../../../types';
import { PaginatedResult } from '../../../models/base.repository';
import { generateInvitationToken } from '../../../utils/auth.utils';

export class InvitationService {
  /**
   * Get invitations with filtering and pagination
   */
  async getInvitations(
    filters: InvitationFilter = {},
    context: { role: string; collegeId?: string; departmentId?: string; userId: string }
  ): Promise<PaginatedResult<Invitation>> {
    // Apply role-based filtering
    const queryFilters: any = { ...filters };

    // Principal can only see invitations for their college
    if (context.role === 'principal' && context.collegeId) {
      queryFilters.collegeId = context.collegeId;
    }

    // HOD can only see invitations for their department
    if (context.role === 'hod' && context.departmentId) {
      queryFilters.departmentId = context.departmentId;
    }

    // Staff can only see invitations they sent
    if (context.role === 'staff') {
      queryFilters.sentBy = context.userId;
    }

    return await invitationRepository.findAllWithDetails(queryFilters);
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(id: string): Promise<Invitation | null> {
    return await invitationRepository.findByIdWithDetails(id);
  }

  /**
   * Create new invitation
   */
  async createInvitation(data: CreateInvitationData, sentBy: string): Promise<Invitation> {
    const invitationData = {
      ...data,
      sentBy,
      invitationToken: generateInvitationToken(),
      status: 'pending' as InvitationStatus,
      sentAt: new Date(),
    };

    return await invitationRepository.createInvitation(invitationData);
  }

  /**
   * Update invitation
   */
  async updateInvitation(id: string, data: UpdateInvitationData): Promise<Invitation | null> {
    return await invitationRepository.updateInvitation(id, data);
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(id: string): Promise<Invitation | null> {
    const updateData: UpdateInvitationData = {
      status: 'accepted',
      acceptedAt: new Date(),
    };

    return await invitationRepository.updateInvitation(id, updateData);
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(id: string): Promise<Invitation | null> {
    const updateData: UpdateInvitationData = {
      status: 'rejected',
      rejectedAt: new Date(),
    };

    return await invitationRepository.updateInvitation(id, updateData);
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(id: string): Promise<boolean> {
    return await invitationRepository.delete(id);
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return await invitationRepository.findByToken(token);
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStatistics(): Promise<any> {
    return await invitationRepository.getStatistics();
  }
}
