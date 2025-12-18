import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';

const router = Router();

// Public routes (no authentication required)
// GET /api/v1/invitations/validate/:token - Validate invitation token
router.get('/validate/:token', invitationController.validateInvitationToken);

// POST /api/v1/invitations/accept-public - Accept invitation and create user account
router.post('/accept-public', invitationController.acceptInvitationPublic);

// Apply authentication middleware to protected routes
router.use(authenticate);

// GET /api/v1/invitations - Only admin, principal, hod, staff can view invitations
router.get('/', authorize('admin', 'principal', 'hod', 'staff'), invitationController.getInvitations);

// POST /api/v1/invitations - Only admin, principal, hod, staff can create invitations
router.post('/', authorize('admin', 'principal', 'hod', 'staff'), invitationController.createInvitation);

// PUT /api/v1/invitations/:id - Only admin, principal, hod, staff can update invitations
router.put('/:id', authorize('admin', 'principal', 'hod', 'staff'), invitationController.updateInvitation);

// DELETE /api/v1/invitations/:id - Only admin, principal, hod, staff can delete invitations
router.delete('/:id', authorize('admin', 'principal', 'hod', 'staff'), invitationController.deleteInvitation);

// POST /api/v1/invitations/:id/accept
router.post('/:id/accept', invitationController.acceptInvitation);

// POST /api/v1/invitations/:id/reject
router.post('/:id/reject', invitationController.rejectInvitation);

// POST /api/v1/invitations/:id/resend - Only admin, principal, hod, staff can resend invitations
router.post('/:id/resend', authorize('admin', 'principal', 'hod', 'staff'), invitationController.resendInvitation);

export default router;
