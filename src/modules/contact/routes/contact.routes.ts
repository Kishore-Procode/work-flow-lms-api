import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { authorize } from '../../../middleware/auth.middleware';

const router = Router();

// Public route for sending contact messages (no authentication required)
router.post('/send-message', (req, res) => contactController.sendMessage(req, res));

// Protected routes (authentication required)
router.use(authenticate);

// Admin-only routes for managing contact messages
router.get('/messages', authorize('admin'), (req, res) => contactController.getMessages(req, res));
router.put('/messages/:id/status', authorize('admin'), (req, res) => contactController.updateMessageStatus(req, res));

export default router;
