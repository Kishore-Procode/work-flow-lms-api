import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import * as hodDashboardController from '../controllers/hod-dashboard.controller';
import * as principalProgressController from '../controllers/principal-progress.controller';
import * as principalDashboardController from '../controllers/principal-dashboard.controller';
import * as staffDashboardController from '../controllers/staff-dashboard.controller';
import * as adminDashboardController from '../controllers/admin-dashboard.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                     users:
 *                       type: object
 *                     colleges:
 *                       type: object
 *                     departments:
 *                       type: object
 *                     resources:
 *                       type: object
 *       401:
 *         description: Authentication required
 */
router.get('/overview', authenticate, dashboardController.getDashboardOverview);

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authenticate, dashboardController.getDashboardStats);

/**
 * @swagger
 * /api/v1/dashboard/activity:
 *   get:
 *     summary: Get recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/activity', authenticate, dashboardController.getRecentActivity);

/**
 * @swagger
 * /api/v1/dashboard/activities:
 *   get:
 *     summary: Get recent activities
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       data:
 *                         type: object
 *       401:
 *         description: Authentication required
 */
router.get('/activities', authenticate, dashboardController.getRecentActivities);

/**
 * @swagger
 * /api/v1/dashboard/health:
 *   get:
 *     summary: Get system health status (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                     metrics:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only administrators can view system health
 */
router.get('/health', authenticate, authorize('admin'), dashboardController.getSystemHealth);

/**
 * @swagger
 * /api/v1/dashboard/hod:
 *   get:
 *     summary: Get consolidated HOD dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/hod', authenticate, authorize('hod'), hodDashboardController.getHODDashboardData);

/**
 * @swagger
 * /api/v1/dashboard/hod/progress-monitoring:
 *   get:
 *     summary: Get department progress monitoring data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/hod/progress-monitoring', authenticate, authorize('hod'), hodDashboardController.getDepartmentProgressMonitoring);

/**
 * @swagger
 * /api/v1/dashboard/hod/add-staff:
 *   post:
 *     summary: Add staff member to department
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.post('/hod/add-staff', authenticate, authorize('hod'), hodDashboardController.addDepartmentStaff);

/**
 * @swagger
 * /api/v1/dashboard/principal:
 *   get:
 *     summary: Get consolidated principal dashboard data (optimized single endpoint)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Principal dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalStudents:
 *                           type: number
 *                         totalresources:
 *                           type: number
 *                         assignedresources:
 *                           type: number
 *                         participationRate:
 *                           type: number
 *                     departmentData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           students:
 *                             type: number
 *                           participated:
 *                             type: number
 *                           availableresources:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Principal access required
 */
router.get('/principal', authenticate, authorize('principal'), principalDashboardController.getPrincipalDashboardData);

/**
 * @swagger
 * /api/v1/dashboard/principal/progress-monitoring:
 *   get:
 *     summary: Get comprehensive progress monitoring data for Principal
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/principal/progress-monitoring', authenticate, authorize('principal'), principalProgressController.getPrincipalProgressMonitoring);

/**
 * @swagger
 * /api/v1/dashboard/principal/filter-options:
 *   get:
 *     summary: Get filter options for progress monitoring
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/principal/filter-options', authenticate, authorize('principal'), principalProgressController.getProgressFilterOptions);

/**
 * @swagger
 * /api/v1/dashboard/principal/student/{studentId}/progress:
 *   get:
 *     summary: Get detailed student progress information
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/principal/student/:studentId/progress', authenticate, authorize('principal'), principalProgressController.getStudentProgressDetails);

/**
 * @swagger
 * /api/v1/dashboard/staff:
 *   get:
 *     summary: Get staff dashboard data (only assigned sections)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/staff', authenticate, authorize('staff'), staffDashboardController.getStaffDashboardData);

/**
 * @swagger
 * /api/v1/dashboard/staff/my-students:
 *   get:
 *     summary: Get students from staff's assigned sections
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/staff/my-students', authenticate, authorize('staff'), staffDashboardController.getMyStudents);

/**
 * @swagger
 * /api/v1/dashboard/staff/filter-options:
 *   get:
 *     summary: Get filter options for staff's assigned sections
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/staff/filter-options', authenticate, authorize('staff'), staffDashboardController.getStaffFilterOptions);

/**
 * @swagger
 * /api/v1/dashboard/student:
 *   get:
 *     summary: Get student dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/student', authenticate, authorize('student'), dashboardController.getDashboardOverview);

/**
 * @swagger
 * /api/v1/dashboard/admin/states:
 *   get:
 *     summary: Get all states for dropdown
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/states', authenticate, authorize('admin'), adminDashboardController.getStates);

/**
 * @swagger
 * /api/v1/dashboard/admin/districts/{stateId}:
 *   get:
 *     summary: Get districts by state for dropdown
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/districts/:stateId', authenticate, authorize('admin'), adminDashboardController.getDistrictsByState);

/**
 * @swagger
 * /api/v1/dashboard/admin/colleges:
 *   get:
 *     summary: Get college ranking data with optional filters
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stateId
 *         schema:
 *           type: string
 *         description: Filter by state ID
 *       - in: query
 *         name: districtId
 *         schema:
 *           type: string
 *         description: Filter by district ID
 */
router.get('/admin/colleges', authenticate, authorize('admin'), adminDashboardController.getCollegeRankingData);
router.get('/admin/college-ranking', authenticate, authorize('admin'), adminDashboardController.getCollegeRankingData);

export default router;
