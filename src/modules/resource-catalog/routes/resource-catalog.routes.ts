import { Router } from 'express';
import * as resourceCatalogController from '../controllers/resource-catalog.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const uuidSchema = Joi.string().uuid().required();

const createInventorySchema = Joi.object({
  resourceType: Joi.string().required().trim().min(1).max(255),
  totalCount: Joi.number().integer().min(0).required(),
  departmentId: uuidSchema,
  collegeId: uuidSchema,
  notes: Joi.string().optional().allow('', null),
});

const updateInventorySchema = Joi.object({
  resourceType: Joi.string().optional().trim().min(1).max(255),
  totalCount: Joi.number().integer().min(0).optional(),
  notes: Joi.string().optional().allow('', null),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  departmentId: Joi.string().uuid().optional(),
  collegeId: Joi.string().uuid().optional(),
  resourceType: Joi.string().optional(),
  search: Joi.string().allow('').optional(),
});

const inventoryIdParamSchema = Joi.object({
  inventoryId: uuidSchema,
});

const departmentIdParamSchema = Joi.object({
  departmentId: uuidSchema,
});

const assignedresourcesQuerySchema = Joi.object({
  resourceType: Joi.string().required(),
  departmentId: uuidSchema,
});

/**
 * @swagger
 * /api/v1/resource-inventory:
 *   get:
 *     summary: Get resource inventory with filters and pagination
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  authenticate,
  validateQuery(paginationSchema),
  resourceCatalogController.getresourceInventory
);

/**
 * @swagger
 * /api/v1/resource-inventory/{inventoryId}:
 *   get:
 *     summary: Get resource inventory by ID
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:inventoryId',
  authenticate,
  validateParams(inventoryIdParamSchema),
  resourceCatalogController.getresourceInventoryById
);

/**
 * @swagger
 * /api/v1/resource-inventory:
 *   post:
 *     summary: Create resource inventory
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'principal', 'hod', 'staff'),
  validateBody(createInventorySchema),
  resourceCatalogController.createresourceInventory
);

/**
 * @swagger
 * /api/v1/resource-inventory/{inventoryId}:
 *   put:
 *     summary: Update resource inventory
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:inventoryId',
  authenticate,
  authorize('admin', 'principal', 'hod', 'staff'),
  validateParams(inventoryIdParamSchema),
  validateBody(updateInventorySchema),
  resourceCatalogController.updateresourceInventory
);

/**
 * @swagger
 * /api/v1/resource-inventory/{inventoryId}:
 *   delete:
 *     summary: Delete resource inventory
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:inventoryId',
  authenticate,
  authorize('admin'),
  validateParams(inventoryIdParamSchema),
  resourceCatalogController.deleteresourceInventory
);

/**
 * @swagger
 * /api/v1/resource-inventory/department/{departmentId}/summary:
 *   get:
 *     summary: Get inventory summary for a department
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/department/:departmentId/summary',
  authenticate,
  validateParams(departmentIdParamSchema),
  resourceCatalogController.getInventorySummary
);

/**
 * @swagger
 * /api/v1/resource-inventory/assigned-resources:
 *   get:
 *     summary: Get assigned resources by type
 *     tags: [resource Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/assigned-resources',
  authenticate,
  validateQuery(assignedresourcesQuerySchema),
  resourceCatalogController.getAssignedresourcesByType
);

export default router;

