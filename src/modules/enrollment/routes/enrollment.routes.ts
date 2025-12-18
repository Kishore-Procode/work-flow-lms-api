import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import {
  getAvailableresources,
  selectresource,
  getStudentresourceselection,
  markresourceAsstarted,
  getresourceselections,
  getSelectionStatus
} from '../controllers/tree-selection.controller';

const router = Router();

// Get available resources for selection (students only)
router.get('/available', authenticate, getAvailableresources);

// Select a resource (students only)
router.post('/select', authenticate, selectresource);

// Get student's resource selection status (simple boolean check)
router.get('/status', authenticate, getSelectionStatus);

// Get student's detailed resource selection
router.get('/my-selection', authenticate, getStudentresourceselection);

// Get student's resource selection
router.get('/my-selection', authenticate, getStudentresourceselection);
router.get('/student/:studentId', authenticate, getStudentresourceselection);

// Mark resource as started
router.put('/mark-started', authenticate, markresourceAsstarted);

// Get resource progress for student
router.get('/progress', authenticate, getStudentresourceselection);
router.get('/my-progress', authenticate, getStudentresourceselection);

// Get all resource selections (staff and above)
router.get('/', authenticate, getresourceselections);

export default router;
