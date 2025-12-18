import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import * as progressTrackingController from '../controllers/progress-tracking.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// POST /api/v1/progress-tracking - Create monitoring record
router.post('/', progressTrackingController.createMonitoringRecord);

// GET /api/v1/progress-tracking/my-records - Get current user's monitoring records
router.get('/my-records', progressTrackingController.getMyMonitoringRecords);

// GET /api/v1/progress-tracking/stats - Get monitoring statistics
router.get('/stats', progressTrackingController.getMonitoringStats);

// GET /api/v1/progress-tracking/recent - Get recent uploads from all students
router.get('/recent', progressTrackingController.getRecentUploads);

// GET /api/v1/progress-tracking - Get monitoring records with filters
router.get('/', progressTrackingController.getMonitoringRecords);

// GET /api/v1/progress-tracking/resource/:resourceId - Get monitoring records for specific resource
router.get('/resource/:resourceId', progressTrackingController.getMonitoringRecordsByresource);

// GET /api/v1/progress-tracking/:id - Get specific monitoring record
router.get('/:id', progressTrackingController.getMonitoringRecord);

// PUT /api/v1/progress-tracking/:id - Update monitoring record
router.put('/:id', progressTrackingController.updateMonitoringRecord);

// DELETE /api/v1/progress-tracking/:id - Delete monitoring record
router.delete('/:id', progressTrackingController.deleteMonitoringRecord);

// POST /api/v1/progress-tracking/:id/verify - Verify monitoring record
router.post('/:id/verify', progressTrackingController.verifyMonitoringRecord);

export default router;
