import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  userFilterSchema,
  uuidSchema,
} from '../../../utils/validation.schemas';
import Joi from 'joi';

const router = Router();

// Parameter validation schemas
const userIdParamSchema = Joi.object({
  userId: uuidSchema,
});

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, validateQuery(userFilterSchema), userController.getUsers);

/**
 * @swagger
 * /api/v1/users/all:
 *   get:
 *     summary: Get all users (alias for dashboard)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/all', authenticate, userController.getUsers);

/**
 * @swagger
 * /api/v1/users/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', authenticate, authorize('admin', 'principal'), userController.getUserStatistics);

/**
 * @swagger
 * /api/v1/users/with-resource-assignments:
 *   get:
 *     summary: Get users with resource assignment details for Student resource Assignment Management
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/with-resource-assignments', authenticate, authorize('admin', 'principal', 'hod', 'staff'), validateQuery(userFilterSchema), userController.getUsersWithresourceAssignments);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:userId', authenticate, validateParams(userIdParamSchema), userController.getUserById);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create new user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('admin', 'principal', 'hod', 'staff'), validateBody(createUserSchema), userController.createUser);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:userId', authenticate, validateParams(userIdParamSchema), validateBody(updateUserSchema), userController.updateUser);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:userId', authenticate, authorize('admin'), validateParams(userIdParamSchema), userController.deleteUser);

export default router;
