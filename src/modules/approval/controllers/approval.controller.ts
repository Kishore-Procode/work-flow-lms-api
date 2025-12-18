import { Request, Response } from 'express';
import { approvalWorkflowRepository } from '../repositories/approval-workflow.repository';
import { registrationRequestRepository } from '../../registration/repositories/registration-request.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { emailService } from '../../../utils/email.service';

/**
 * Get pending approvals for current user
 */
export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only staff and above can approve requests
    if (!['staff', 'hod', 'principal', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view approvals',
      });
      return;
    }

    const pendingApprovals = await approvalWorkflowRepository.getPendingApprovalsByRole(req.user.role, req.user.id);

    res.status(200).json({
      success: true,
      data: pendingApprovals
    });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending approvals',
    });
  }
};

/**
 * Approve or reject a request
 */
export const processApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { workflowId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"',
      });
      return;
    }

    if (action === 'reject' && !rejectionReason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a request',
      });
      return;
    }

    // Get workflow
    const workflow = await approvalWorkflowRepository.getWorkflowById(workflowId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        message: 'Approval workflow not found',
      });
      return;
    }

    // Check if user has permission to approve this request
    if (workflow.currentApproverRole !== req.user.role || 
        (workflow.currentApproverId && workflow.currentApproverId !== req.user.id)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to process this approval',
      });
      return;
    }

    if (action === 'approve') {
      // Process approval
      const result = await approvalWorkflowRepository.approveRequest(workflowId, req.user.id);
      
      // If this was the final approval, activate the user account
      if (result.isFinalApproval) {
        await registrationRequestRepository.updateStatus(workflow.requestId, 'approved');

        // Create user account from registration request
        const registrationRequest = await registrationRequestRepository.findById(workflow.requestId);
        if (registrationRequest) {
          const { user: newUser, tempPassword } = await userRepository.createUserFromRegistration(registrationRequest);

          // Send welcome email with credentials
          try {
            const emailOptions = emailService.generateWelcomeEmail(
              newUser.name,
              newUser.email,
              tempPassword,
              newUser.role
            );

            await emailService.sendEmail(emailOptions);
            console.log('✅ Welcome email sent to new user:', newUser.email);
          } catch (emailError) {
            console.error('⚠️  Failed to send welcome email:', emailError);
          }
        }
      } else {
        // Send notification to next approver
        try {
          if (result.nextWorkflow?.currentApproverId) {
            const nextApprover = await userRepository.findById(result.nextWorkflow.currentApproverId);
            const registrationRequest = await registrationRequestRepository.findById(workflow.requestId);

            if (nextApprover && registrationRequest) {
              const emailOptions = emailService.generateApprovalNotificationEmail(
                nextApprover.name,
                nextApprover.email,
                registrationRequest.name,
                registrationRequest.role,
                result.nextWorkflow.id
              );

              await emailService.sendEmail(emailOptions);
              console.log('✅ Approval notification sent to:', nextApprover.email);
            }
          }
        } catch (emailError) {
          console.error('⚠️  Failed to send approval notification:', emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: result.isFinalApproval ? 'Request approved and user account created' : 'Request approved and forwarded to next level',
        data: result
      });

    } else {
      // Process rejection
      await approvalWorkflowRepository.rejectRequest(workflowId, req.user.id, rejectionReason);
      await registrationRequestRepository.updateStatus(workflow.requestId, 'rejected');

      res.status(200).json({
        success: true,
        message: 'Request rejected successfully'
      });
    }

  } catch (error) {
    console.error('Process approval error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process approval',
    });
  }
};

/**
 * Get approval history
 */
export const getApprovalHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { requestId } = req.params;

    const history = await approvalWorkflowRepository.getApprovalHistory(requestId);

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Get approval history error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approval history',
    });
  }
};

/**
 * Get approval statistics
 */
export const getApprovalStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin and above can view statistics
    if (!['principal', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view statistics',
      });
      return;
    }

    const filters: any = {};
    
    // Apply role-based filtering
    if (req.user.role === 'principal') {
      filters.collegeId = req.user.collegeId;
    }

    const statistics = await approvalWorkflowRepository.getApprovalStatistics(filters);

    res.status(200).json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Get approval statistics error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approval statistics',
    });
  }
};
