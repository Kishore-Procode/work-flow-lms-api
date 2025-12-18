/**
 * HOD Subject Staff Assignment Routes
 * 
 * Routes for HOD to manage staff assignments to subjects.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SubjectStaffAssignmentController } from '../../interface-adapters/controllers/hod/SubjectStaffAssignmentController';
import { authenticate, authorize } from '../../middleware/auth.middleware';

export function createSubjectStaffAssignmentRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new SubjectStaffAssignmentController(pool);

  // Staff can view their own assignments (no HOD restriction)
  router.get('/staff/:staffId/subjects', authenticate, (req, res) => controller.getStaffAssignedSubjects(req, res));

  // All other routes require HOD authentication
  router.use(authenticate);
  router.use(authorize('hod'));

  /**
   * @route   GET /api/v1/hod/subject-assignments/courses
   * @desc    Get all courses with content mapping for HOD's department
   * @access  HOD only
   */
  router.get('/courses', (req, res) => controller.getHODCourses(req, res));

  /**
   * @route   GET /api/v1/hod/subject-assignments/academic-years
   * @desc    Get all academic years for a course with content mapping
   * @access  HOD only
   * @query   courseId - Course ID (required)
   */
  router.get('/academic-years', (req, res) => controller.getAcademicYearsForCourse(req, res));

  /**
   * @route   GET /api/v1/hod/subject-assignments/semesters
   * @desc    Get all semesters for HOD's department with subject counts
   * @access  HOD only
   * @query   courseId - Optional: filter by course
   * @query   academicYearId - Optional: filter by academic year
   */
  router.get('/semesters', (req, res) => controller.getHODSemesters(req, res));

  /**
   * @route   GET /api/v1/hod/subject-assignments/subjects
   * @desc    Get all subjects for a semester with their staff assignments
   * @access  HOD only
   * @query   semesterNumber - Semester number
   * @query   academicYearId - Academic year ID
   */
  router.get('/subjects', (req, res) => controller.getSubjectsForAssignment(req, res));

  /**
   * @route   GET /api/v1/hod/subject-assignments/staff
   * @desc    Get all available staff in HOD's department
   * @access  HOD only
   * @query   semesterNumber - Optional: filter by semester to see workload
   */
  router.get('/staff', (req, res) => controller.getAvailableStaff(req, res));

  /**
   * @route   POST /api/v1/hod/subject-assignments/assign
   * @desc    Assign a staff member to a subject
   * @access  HOD only
   * @body    contentMapSubDetailsId - Subject ID
   * @body    staffId - Staff member ID
   * @body    semesterNumber - Semester number
   * @body    academicYearId - Academic year ID
   * @body    notes - Optional assignment notes
   */
  router.post('/assign', (req, res) => controller.assignStaffToSubject(req, res));

  /**
   * @route   DELETE /api/v1/hod/subject-assignments/:assignmentId
   * @desc    Remove staff assignment from a subject
   * @access  HOD only
   * @param   assignmentId - Assignment ID to remove
   */
  router.delete('/:assignmentId', (req, res) => controller.removeStaffAssignment(req, res));

  return router;
}

export default createSubjectStaffAssignmentRoutes;
