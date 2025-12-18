import { Router } from 'express';
import { Pool } from 'pg';
import { LMSContentController } from '../interface-adapters/controllers/LMSContentController';
import { authenticate, authorize } from '../middleware/auth.middleware';

export function createLMSContentRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new LMSContentController(pool);

  // All routes require authentication
  router.use(authenticate);

  /**
   * @route   POST /api/v1/lms-content/assignments
   * @desc    Create a new LMS assignment
   * @access  HOD, Staff
   */
  router.post('/assignments', authorize('hod', 'staff'), (req, res) => controller.createAssignment(req, res));

  /**
   * @route   GET /api/v1/lms-content/assignments/subject/:subjectId
   * @desc    Get all assignments for a subject
   * @access  HOD, Staff
   */
  router.get('/assignments/subject/:subjectId', authorize('hod', 'staff'), (req, res) => controller.getAssignmentsBySubject(req, res));

  /**
   * @route   GET /api/v1/lms-content/staff/assignments
   * @desc    Get all LMS staff assignments (subjects with assignments)
   * @access  HOD, Staff
   */
  router.get('/staff/assignments', authorize('hod', 'staff'), (req, res) => controller.getStaffAssignments(req, res));

  /**
   * @route   GET /api/v1/lms-content/assignments/submissions
   * @desc    Get all LMS assignment submissions for staff
   * @access  HOD, Staff
   */
  router.get('/assignments/submissions', authorize('hod', 'staff'), (req, res) => controller.getAssignmentSubmissions(req, res));

  /**
   * @route   GET /api/v1/lms-content/assignments/:assignmentId
   * @desc    Get assignment by ID
   * @access  HOD, Staff, Student
   */
  router.get('/assignments/:assignmentId', (req, res) => controller.getAssignmentById(req, res));

  /**
   * @route   POST /api/v1/lms-content/examinations
   * @desc    Create a new LMS examination
   * @access  HOD, Staff
   */
  router.post('/examinations', authorize('hod', 'staff'), (req, res) => controller.createExamination(req, res));

  /**
   * @route   GET /api/v1/lms-content/examinations/subject/:subjectId
   * @desc    Get all examinations for a subject
   * @access  HOD, Staff
   */
  router.get('/examinations/subject/:subjectId', authorize('hod', 'staff'), (req, res) => controller.getExaminationsBySubject(req, res));

  /**
   * @route   GET /api/v1/lms-content/examinations/attempts
   * @desc    Get all LMS examination attempts for staff
   * @access  HOD, Staff
   */
  router.get('/examinations/attempts', authorize('hod', 'staff'), (req, res) => controller.getExaminationAttempts(req, res));

  /**
   * @route   GET /api/v1/lms-content/examinations/:examinationId
   * @desc    Get examination by ID
   * @access  HOD, Staff, Student
   */
  router.get('/examinations/:examinationId', (req, res) => controller.getExaminationById(req, res));

  /**
   * @route   POST /api/v1/lms-content/quizzes
   * @desc    Create a new LMS quiz
   * @access  HOD, Staff
   */
  router.post('/quizzes', authorize('hod', 'staff'), (req, res) => controller.createQuiz(req, res));

  /**
   * @route   GET /api/v1/lms-content/quizzes/subject/:subjectId
   * @desc    Get all quizzes for a subject
   * @access  HOD, Staff
   */
  router.get('/quizzes/subject/:subjectId', authorize('hod', 'staff'), (req, res) => controller.getQuizzesBySubject(req, res));

  /**
   * @route   GET /api/v1/lms-content/quizzes/:quizId
   * @desc    Get quiz by ID
   * @access  HOD, Staff, Student
   */
  router.get('/quizzes/:quizId', (req, res) => controller.getQuizById(req, res));

  /**
   * @route   GET /api/v1/lms-content/student/assignments
   * @desc    Get all assignments for student's enrolled subjects
   * @access  Student
   */
  router.get('/student/assignments', authorize('student'), (req, res) => controller.getStudentAssignments(req, res));

  /**
   * @route   GET /api/v1/lms-content/student/examinations
   * @desc    Get all examinations for student's enrolled subjects
   * @access  Student
   */
  router.get('/student/examinations', authorize('student'), (req, res) => controller.getStudentExaminations(req, res));

  /**
   * @route   POST /api/v1/lms-content/assignments/submit
   * @desc    Submit an LMS assignment
   * @access  Student
   */
  router.post('/assignments/submit', authorize('student'), (req, res) => controller.submitAssignment(req, res));

  /**
   * @route   POST /api/v1/lms-content/assignments/grade
   * @desc    Grade an LMS assignment submission
   * @access  HOD, Staff
   */
  router.post('/assignments/grade', authorize('hod', 'staff'), (req, res) => controller.gradeAssignment(req, res));

  /**
   * @route   GET /api/v1/lms-content/assignments/:assignmentId/status
   * @desc    Get LMS assignment submission status for a student
   * @access  Student
   */
  router.get('/assignments/:assignmentId/status', authorize('student'), (req, res) => controller.getAssignmentSubmissionStatus(req, res));

  /**
   * @route   POST /api/v1/lms-content/examinations/submit
   * @desc    Submit LMS examination attempt
   * @access  Student
   */
  router.post('/examinations/submit', authorize('student'), (req, res) => controller.submitExamination(req, res));

  /**
   * @route   GET /api/v1/lms-content/course-completion/:subjectId
   * @desc    Get course completion percentage for a subject
   * @access  Student
   */
  router.get('/course-completion/:subjectId', authorize('student'), (req, res) => controller.getCourseCompletion(req, res));

  /**
   * @route   GET /api/v1/lms-content/examinations/:examinationId/attempt-status
   * @desc    Get LMS examination attempt status for a student
   * @access  Student
   */
  router.get('/examinations/:examinationId/attempt-status', authorize('student'), (req, res) => controller.getExaminationAttemptStatus(req, res));

  /**
   * @route   POST /api/v1/lms-content/examinations/grade
   * @desc    Grade LMS examination subjective questions
   * @access  HOD, Staff
   */
  router.post('/examinations/grade', authorize('hod', 'staff'), (req, res) => controller.gradeExamination(req, res));

  /**
   * @route   GET /api/v1/lms-content/examinations/:examinationId/results
   * @desc    Get examination results for a student to review answers
   * @access  Student
   */
  router.get('/examinations/:examinationId/results', authorize('student'), (req, res) => controller.getStudentExaminationResults(req, res));

  /**
   * @route   GET /api/v1/lms-content/student-progress
   * @desc    Get student progress for staff monitoring
   * @access  Staff, HOD, Registrar
   */
  router.get('/student-progress', authorize('staff', 'hod'), (req, res) => controller.getLMSStudentProgress(req, res));

  return router;
}

