import { Router } from 'express';
import { contentController } from '../controllers/content.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';

const router = Router();

// Public routes (for students to view)
router.get('/guidelines', contentController.getGuidelines);
router.get('/resources', contentController.getResources);

// Resource download endpoint (authenticated)
router.get('/resources/download/:filename', authenticate, contentController.downloadResource);

// Admin-only routes for managing guidelines
router.post('/guidelines',
  authenticate,
  authorize('admin'),
  contentController.createGuideline
);

router.put('/guidelines/:id',
  authenticate,
  authorize('admin'),
  contentController.updateGuideline
);

router.delete('/guidelines/:id',
  authenticate,
  authorize('admin'),
  contentController.deleteGuideline
);

// Admin-only routes for managing resources
router.post('/resources',
  authenticate,
  authorize('admin'),
  contentController.createResource
);

router.put('/resources/:id',
  authenticate,
  authorize('admin'),
  contentController.updateResource
);

router.delete('/resources/:id',
  authenticate,
  authorize('admin'),
  contentController.deleteResource
);

export default router;
