import { Router } from 'express';
import * as resourceController from '../controllers/tree.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.middleware';
import {
  createresourceschema,
  updateresourceschema,
  resourceFilterSchema,
  uuidSchema,
} from '../../../utils/validation.schemas';
import Joi from 'joi';

const router = Router();

// Parameter validation schemas
const resourceIdParamSchema = Joi.object({
  resourceId: uuidSchema,
});

const assignresourceschema = Joi.object({
  studentId: uuidSchema,
});

const createAndAssignresourceschema = Joi.object({
  studentId: uuidSchema,
  resourceData: Joi.object({
    category: Joi.string().required(),
    locationDescription: Joi.string().allow('').optional(),
    startedDate: Joi.date().iso().optional(),
    status: Joi.string().valid('healthy', 'needs_attention', 'deceased', 'replaced').optional()
  }).required()
});

/**
 * @swagger
 * /api/v1/resources:
 *   get:
 *     summary: Get all resources with filtering and pagination
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, validateQuery(resourceFilterSchema), resourceController.getresources);

/**
 * @swagger
 * /api/v1/resources/all:
 *   get:
 *     summary: Get all resources (alias for dashboard)
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/all', authenticate, resourceController.getresources);

/**
 * @swagger
 * /api/v1/resources/my-resource:
 *   get:
 *     summary: Get student's assigned resource
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-resource', authenticate, authorize('student'), resourceController.getMyresource);

/**
 * @swagger
 * /api/v1/resources/student/{studentId}:
 *   get:
 *     summary: Get resource assigned to specific student
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/student/:studentId', authenticate, resourceController.getStudentresource);

/**
 * @swagger
 * /api/v1/resources/statistics:
 *   get:
 *     summary: Get resource statistics
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', authenticate, authorize('admin', 'principal'), resourceController.getresourcestatistics);

/**
 * @swagger
 * /api/v1/resources/unassigned:
 *   get:
 *     summary: Get unassigned resources
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unassigned', authenticate, resourceController.getUnassignedresources);

/**
 * @swagger
 * /api/v1/resources/available:
 *   get:
 *     summary: Get available resources for student selection
 *     tags: [resource Selection]
 *     security:
 *       - bearerAuth: []
 */
router.get('/available', authenticate, authorize('student'), resourceController.getAvailableresources);

/**
 * @swagger
 * /api/v1/resources/{resourceId}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:resourceId', authenticate, validateParams(resourceIdParamSchema), resourceController.getresourceById);

/**
 * @swagger
 * /api/v1/resources:
 *   post:
 *     summary: Create new resource
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('admin', 'principal', 'hod', 'staff'), validateBody(createresourceschema), resourceController.createresource);

/**
 * @swagger
 * /api/v1/resources/{resourceId}:
 *   put:
 *     summary: Update resource
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:resourceId', authenticate, validateParams(resourceIdParamSchema), validateBody(updateresourceschema), resourceController.updateresource);

/**
 * @swagger
 * /api/v1/resources/{resourceId}:
 *   delete:
 *     summary: Delete resource (Admin only)
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:resourceId', authenticate, authorize('admin'), validateParams(resourceIdParamSchema), resourceController.deleteresource);

/**
 * @swagger
 * /api/v1/resources/{resourceId}/assign:
 *   post:
 *     summary: Assign resource to student
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:resourceId/assign', authenticate, authorize('admin', 'principal', 'hod', 'staff'), validateParams(resourceIdParamSchema), validateBody(assignresourceschema), resourceController.assignresourceToStudent);

/**
 * @swagger
 * /api/v1/resources/create-and-assign:
 *   post:
 *     summary: Create a new resource and assign it to a student
 *     tags: [resource Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/create-and-assign', authenticate, authorize('admin', 'principal', 'hod', 'staff', 'student'), validateBody(createAndAssignresourceschema), resourceController.createresourceAndAssignToStudent);

export default router;
