import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { 
  getPendingApprovals,
  processApproval,
  getApprovalHistory,
  getApprovalStatistics
} from '../controllers/approval.controller';

const router = Router();

// Get pending approvals for current user
router.get('/pending', authenticate, getPendingApprovals);

// Process approval (approve/reject)
router.put('/:workflowId/process', authenticate, processApproval);

// Get approval history for a request
router.get('/history/:requestId', authenticate, getApprovalHistory);

// Get approval statistics
router.get('/statistics', authenticate, getApprovalStatistics);

export default router;
