import { Router } from 'express';
import * as departmentController from '../controllers/department.controller';
import * as departmentSummaryController from '../controllers/department-summary.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../../middleware/validation.middleware';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  paginationSchema,
  uuidSchema,
} from '../../../utils/validation.schemas';
import Joi from 'joi';

const router = Router();

// Parameter validation schemas
const departmentIdParamSchema = Joi.object({
  departmentId: uuidSchema,
});

const collegeIdParamSchema = Joi.object({
  collegeId: uuidSchema,
});

// ==================== PUBLIC ROUTES (no auth required) ====================

/**
 * @swagger
 * /api/v1/departments/public:
 *   get:
 *     summary: Get all departments (public endpoint for registration)
 *     tags: [Department Management]
 */
router.get('/public', departmentController.getDepartmentsPublic);

/**
 * @swagger
 * /api/v1/departments/public/college/{collegeId}:
 *   get:
 *     summary: Get departments by college (public endpoint for registration)
 *     tags: [Department Management]
 */
router.get('/public/college/:collegeId', validateParams(collegeIdParamSchema), departmentController.getDepartmentsByCollegePublic);

/**
 * @swagger
 * /api/v1/departments/public/classes/{collegeId}/{departmentId}:
 *   get:
 *     summary: Get classes by college and department (public endpoint for registration)
 *     tags: [Department Management]
 */
router.get('/public/classes/:collegeId/:departmentId', departmentController.getClassesByDepartmentPublic);

// ==================== AUTHENTICATED ROUTES ====================
// IMPORTANT: Specific path routes must come BEFORE parameterized routes like /:departmentId

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: Get all departments with pagination
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, validateQuery(paginationSchema), departmentController.getDepartments);

/**
 * @swagger
 * /api/v1/departments/college/{collegeId}:
 *   get:
 *     summary: Get departments by college
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/college/:collegeId', authenticate, validateParams(collegeIdParamSchema), validateQuery(paginationSchema), departmentController.getDepartmentsByCollege);

/**
 * @swagger
 * /api/v1/departments/comparison:
 *   get:
 *     summary: Get department comparison data (Principal only)
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/comparison', authenticate, authorize('principal'), departmentSummaryController.getDepartmentComparison);

/**
 * @swagger
 * /api/v1/departments:
 *   post:
 *     summary: Create new department
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('admin', 'principal'), validateBody(createDepartmentSchema), departmentController.createDepartment);

// ==================== PARAMETERIZED ROUTES (must come AFTER specific paths) ====================

/**
 * @swagger
 * /api/v1/departments/{departmentId}/summary:
 *   get:
 *     summary: Get comprehensive department summary (HOD/Principal only)
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:departmentId/summary', authenticate, authorize('hod'), validateParams(departmentIdParamSchema), departmentSummaryController.getDepartmentSummary);

/**
 * @swagger
 * /api/v1/departments/{departmentId}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:departmentId', authenticate, validateParams(departmentIdParamSchema), departmentController.getDepartmentById);

/**
 * @swagger
 * /api/v1/departments/{departmentId}:
 *   put:
 *     summary: Update department
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:departmentId', authenticate, authorize('admin', 'principal', 'hod'), validateParams(departmentIdParamSchema), validateBody(updateDepartmentSchema), departmentController.updateDepartment);

/**
 * @swagger
 * /api/v1/departments/{departmentId}:
 *   delete:
 *     summary: Delete department (Admin only)
 *     tags: [Department Management]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:departmentId', authenticate, authorize('admin'), validateParams(departmentIdParamSchema), departmentController.deleteDepartment);

export default router;

