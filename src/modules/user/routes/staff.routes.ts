/**
 * Staff Management Routes
 * 
 * Dedicated routes for staff management with role-based access control
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { validateQuery, validateBody, validateParams } from '../../../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const staffFilterSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional(),
  role: Joi.string().valid('staff', 'hod').optional(),
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  departmentId: Joi.string().uuid().optional(),
  sortBy: Joi.string().valid('name', 'email', 'role', 'status', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const createStaffSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  role: Joi.string().valid('staff', 'hod').required(),
  status: Joi.string().valid('active', 'inactive', 'pending').default('active'),
  departmentId: Joi.string().uuid().empty('').optional(), // Optional for HOD role - can be assigned later
  courseId: Joi.string().uuid().empty('').optional(),
  classInCharge: Joi.string().max(100).optional(),
  qualification: Joi.string().max(200).optional(),
  experience: Joi.string().max(100).optional(),
  employeeId: Joi.string().max(50).optional(),
  password: Joi.string().min(6).optional()
});

const updateStaffSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  departmentId: Joi.string().uuid().optional(),
  courseId: Joi.string().uuid().empty('').optional(),
  classInCharge: Joi.string().max(100).optional(),
  qualification: Joi.string().max(200).optional(),
  experience: Joi.string().max(100).optional(),
  employeeId: Joi.string().max(50).optional()
});

const uuidSchema = Joi.object({
  id: Joi.string().uuid().required()
});

/**
 * @swagger
 * /api/v1/staff:
 *   get:
 *     summary: Get staff members with role-based filtering
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [staff, hod]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff members retrieved successfully
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/',
  authenticate,
  (req, res, next) => {
    const user = req.user as any;
    if (!user || !['principal', 'hod'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and HODs can access staff management.',
        required: ['principal', 'hod'],
        current: user?.role
      });
    }
    next();
  },
  validateQuery(staffFilterSchema),
  staffController.getStaff
);

/**
 * @swagger
 * /api/v1/staff:
 *   post:
 *     summary: Create new staff member
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, hod]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *                 default: active
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional for HOD role - can be assigned later via Department Management
 *               courseId:
 *                 type: string
 *                 format: uuid
 *               classInCharge:
 *                 type: string
 *               qualification:
 *                 type: string
 *               experience:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Staff member created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post('/',
  authenticate,
  authorize('principal', 'hod'),
  validateBody(createStaffSchema),
  staffController.createStaff
);

/**
 * @swagger
 * /api/v1/staff/{id}:
 *   put:
 *     summary: Update staff member
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               courseId:
 *                 type: string
 *                 format: uuid
 *               classInCharge:
 *                 type: string
 *               qualification:
 *                 type: string
 *               experience:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.put('/:id',
  authenticate,
  authorize('principal', 'hod'),
  validateParams(uuidSchema),
  validateBody(updateStaffSchema),
  staffController.updateStaff
);

/**
 * @swagger
 * /api/v1/staff/{id}:
 *   delete:
 *     summary: Delete staff member
 *     tags: [Staff Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff member deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */
router.delete('/:id',
  authenticate,
  authorize('principal', 'hod'),
  validateParams(uuidSchema),
  staffController.deleteStaff
);

export default router;
