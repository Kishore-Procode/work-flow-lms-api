import { Router } from 'express';
import { StudentProgressController } from '../controllers/student-progress.controller';
import { authenticate, authorize } from '../../../middleware/auth.middleware';

const router = Router();
const studentProgressController = new StudentProgressController();

/**
 * @route GET /api/monitoring/student-progress
 * @desc Get paginated student progress data with filtering
 * @access HOD, Staff, Admin
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query departmentId - Filter by department ID
 * @query healthStatus - Filter by health status (excellent, good, fair, poor)
 * @query searchTerm - Search in name, email, roll number, resource code
 * @query sortBy - Sort column (studentName, department, resourceCode, etc.)
 * @query sortOrder - Sort order (asc, desc)
 */
router.get(
  '/student-progress',
  authenticate,
  authorize('admin', 'hod', 'staff'),
  (req, res) => studentProgressController.getStudentProgress(req, res)
);

/**
 * @route GET /api/monitoring/department-summary
 * @desc Get department summary statistics
 * @access HOD, Staff, Admin
 * @query departmentId - Department ID (optional for admin)
 */
router.get(
  '/department-summary',
  authenticate,
  authorize('admin', 'hod', 'staff'),
  (req, res) => studentProgressController.getDepartmentSummary(req, res)
);

export default router;
