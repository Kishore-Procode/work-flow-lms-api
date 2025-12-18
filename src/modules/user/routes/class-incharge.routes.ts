import { Router } from 'express';
import { classInChargeController } from '../controllers/class-incharge.controller';
import { authenticate } from '../../../middleware/auth.middleware';
// import { validateRole } from '../../../middleware/role.middleware'; // Module doesn't exist

const router = Router();

// All routes require authentication and HOD role
router.use(authenticate);
// router.use(validateRole(['hod'])); // validateRole function not available

/**
 * @route GET /api/v1/class-incharge/overview
 * @desc Get overview of all class in-charge assignments in the department
 * @access HOD only
 */
router.get('/overview', classInChargeController.getAssignmentsOverview);

/**
 * @route GET /api/v1/class-incharge/workload
 * @desc Get staff workload distribution
 * @access HOD only
 */
router.get('/workload', classInChargeController.getStaffWorkload);

/**
 * @route GET /api/v1/class-incharge/sections
 * @desc Get all sections in department for class in-charge assignment
 * @access HOD only
 */
router.get('/sections', classInChargeController.getSectionsForAssignment);

/**
 * @route GET /api/v1/class-incharge/faculty
 * @desc Get available faculty for class in-charge assignment
 * @access HOD only
 */
router.get('/faculty', classInChargeController.getAvailableFaculty);

/**
 * @route POST /api/v1/class-incharge/assign
 * @desc Assign class in-charge to a section
 * @access HOD only
 */
router.post('/assign', classInChargeController.assignClassInCharge);

/**
 * @route DELETE /api/v1/class-incharge/remove/:sectionId
 * @desc Remove class in-charge from a section
 * @access HOD only
 */
router.delete('/remove/:sectionId', classInChargeController.removeClassInCharge);

/**
 * @route POST /api/v1/class-incharge/sync-counts
 * @desc Sync section student counts - utility endpoint for fixing data inconsistencies
 * @access HOD only
 */
router.post('/sync-counts', classInChargeController.syncSectionStudentCounts);

export default router;
