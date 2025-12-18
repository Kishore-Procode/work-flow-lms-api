import { Router } from 'express';
import * as collegeController from '../controllers/college.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.middleware';
import {
  createCollegeSchema,
  updateCollegeSchema,
  createCollegeRegistrationSchema,
  paginationSchema,
  uuidSchema,
} from '../../../utils/validation.schemas';
import Joi from 'joi';

const router = Router();

// Parameter validation schemas
const collegeIdParamSchema = Joi.object({
  collegeId: uuidSchema,
});

/**
 * @swagger
 * /api/v1/colleges/public:
 *   get:
 *     summary: Get all colleges (public endpoint for registration)
 *     tags: [College Management]
 */
router.get('/public', collegeController.getCollegesPublic);
router.get('/state',collegeController.state)
router.get('/district',collegeController.district)

/**
 * @swagger
 * /api/v1/colleges/register:
 *   post:
 *     summary: Public college registration (no auth required)
 *     tags: [College Management]
 */
router.post('/register', validateBody(createCollegeRegistrationSchema), collegeController.registerCollege);

/**
 * @swagger
 * /api/v1/colleges:
 *   get:
 *     summary: Get all colleges with pagination
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, validateQuery(paginationSchema), collegeController.getColleges);

/**
 * @swagger
 * /api/v1/colleges/{collegeId}:
 *   get:
 *     summary: Get college by ID
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:collegeId', authenticate, validateParams(collegeIdParamSchema), collegeController.getCollegeById);

/**
 * @swagger
 * /api/v1/colleges:
 *   post:
 *     summary: Create new college (Admin only)
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('admin'), validateBody(createCollegeSchema), collegeController.createCollege);

/**
 * @swagger
 * /api/v1/colleges/{collegeId}:
 *   put:
 *     summary: Update college
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:collegeId', authenticate, validateParams(collegeIdParamSchema), validateBody(updateCollegeSchema), collegeController.updateCollege);

/**
 * @swagger
 * /api/v1/colleges/{collegeId}:
 *   delete:
 *     summary: Delete college (Admin only)
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:collegeId', authenticate, authorize('admin'), validateParams(collegeIdParamSchema), collegeController.deleteCollege);

/**
 * @swagger
 * /api/v1/colleges/statistics:
 *   get:
 *     summary: Get college statistics (Admin only)
 *     tags: [College Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', authenticate, authorize('admin'), collegeController.getCollegeStatistics);

export default router;
