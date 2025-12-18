import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();

// Public routes (no authentication required)
// These are needed for registration forms

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses (public endpoint)
 *     tags: [Course Management]
 *     description: Retrieve all available courses. This is a public endpoint used for registration forms.
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       description:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                       college_id:
 *                         type: string
 *                         format: uuid
 *       500:
 *         description: Internal server error
 */
router.get('/courses', (req, res) => courseController.getCourses(req, res));

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get course by ID (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get('/courses/:id', (req, res) => courseController.getCourseById(req, res));

/**
 * @swagger
 * /api/v1/courses/by-college/{collegeId}:
 *   get:
 *     summary: Get courses by college (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: College ID
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       404:
 *         description: College not found
 *       500:
 *         description: Internal server error
 */
router.get('/courses/by-college/:collegeId', (req, res) => courseController.getCoursesByCollege(req, res));

/**
 * @swagger
 * /api/v1/courses/department/{departmentId}:
 *   get:
 *     summary: Get courses by department (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/courses/department/:departmentId', (req, res) => courseController.getCoursesByDepartment(req, res));

/**
 * @swagger
 * /api/v1/courses/by-college-and-department/{collegeId}/{departmentId}:
 *   get:
 *     summary: Get courses by college and department (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/courses/by-college-and-department/:collegeId/:departmentId', (req, res) => courseController.getCoursesByCollegeAndDepartment(req, res));

/**
 * @swagger
 * /api/v1/departments/by-course/{courseId}:
 *   get:
 *     summary: Get departments by course (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/departments/by-course/:courseId', (req, res) => courseController.getDepartmentsByCourse(req, res));

/**
 * @swagger
 * /api/v1/departments/by-college/{collegeId}:
 *   get:
 *     summary: Get departments by college (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: collegeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/departments/by-college/:collegeId', (req, res) => courseController.getDepartmentsByCollege(req, res));

/**
 * @swagger
 * /api/v1/academic-years:
 *   get:
 *     summary: Get all academic years (public endpoint)
 *     tags: [Course Management]
 *     responses:
 *       200:
 *         description: Academic years retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/academic-years', (req, res) => courseController.getAcademicYears(req, res));

/**
 * @swagger
 * /api/v1/courses/{courseId}/academic-years:
 *   get:
 *     summary: Get academic years by course (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Academic years retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/courses/:courseId/academic-years', (req, res) => courseController.getAcademicYearsByCourse(req, res));

/**
 * @swagger
 * /api/v1/sections:
 *   get:
 *     summary: Get all sections (public endpoint)
 *     tags: [Course Management]
 *     responses:
 *       200:
 *         description: Sections retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/sections', (req, res) => courseController.getSections(req, res));

/**
 * @swagger
 * /api/v1/sections/by-course-and-year/{courseId}/{yearName}:
 *   get:
 *     summary: Get sections by course and year (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: yearName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sections retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/sections/by-course-and-year/:courseId/:yearName', (req, res) => courseController.getSectionsByCourseAndYear(req, res));

/**
 * @swagger
 * /api/v1/courses/sections/{id}:
 *   get:
 *     summary: Get section by ID (public endpoint)
 *     tags: [Course Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Section ID
 *     responses:
 *       200:
 *         description: Section retrieved successfully
 *       404:
 *         description: Section not found
 *       500:
 *         description: Internal server error
 */
router.get('/courses/sections/:id', (req, res) => courseController.getSectionById(req, res));

// Protected routes (authentication required)
router.use(authenticate);

// Admin/Principal only routes (temporarily without authorization)

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create new course (Admin/Principal only)
 *     tags: [Course Management]
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
 *               - code
 *               - type
 *               - collegeId
 *               - departmentId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Course name
 *               code:
 *                 type: string
 *                 description: Course code
 *               type:
 *                 type: string
 *                 enum: [undergraduate, postgraduate, diploma]
 *                 description: Course type
 *               description:
 *                 type: string
 *                 description: Course description
 *               durationYears:
 *                 type: integer
 *                 description: Course duration in years
 *                 default: 4
 *               collegeId:
 *                 type: string
 *                 format: uuid
 *                 description: College ID
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Department ID
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/courses', (req, res) => courseController.createCourse(req, res));

router.put('/courses/:id', (req, res) => courseController.updateCourse(req, res));

/**
 * @swagger
 * /api/v1/courses/{courseId}/academic-years:
 *   post:
 *     summary: Create academic years for course (Admin/Principal only)
 *     tags: [Course Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *             required:
 *               - years
 *             properties:
 *               years:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     order:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Academic years created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/courses/:courseId/academic-years', (req, res) => courseController.createAcademicYears(req, res));

/**
 * @swagger
 * /api/v1/sections:
 *   post:
 *     summary: Create new section (Admin/Principal only)
 *     tags: [Course Management]
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
 *               - course_id
 *               - academic_year_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: Section name
 *               course_id:
 *                 type: string
 *                 format: uuid
 *                 description: Course ID
 *               academic_year_id:
 *                 type: string
 *                 format: uuid
 *                 description: Academic year ID
 *               capacity:
 *                 type: integer
 *                 description: Section capacity
 *     responses:
 *       201:
 *         description: Section created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/sections', (req, res) => courseController.createSection(req, res));

/**
 * @swagger
 * /api/v1/courses/sections:
 *   post:
 *     summary: Create new section (alternative endpoint)
 *     tags: [Course Management]
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
 *               - courseId
 *               - departmentId
 *               - academicYearId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Section name
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 description: Course ID
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Department ID
 *               academicYearId:
 *                 type: string
 *                 format: uuid
 *                 description: Academic year ID
 *               maxStudents:
 *                 type: integer
 *                 description: Maximum number of students
 *               academicSession:
 *                 type: string
 *                 description: Academic session (e.g., 2025-26)
 *               max_students:
 *                 type: integer
 *                 description: Maximum number of students (alternative field)
 *               academic_session:
 *                 type: string
 *                 description: Academic session (alternative field)
 *               department_id:
 *                 type: string
 *                 format: uuid
 *                 description: Department ID (alternative field)
 *     responses:
 *       201:
 *         description: Section created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/courses/sections', (req, res) => courseController.createSection(req, res));

/**
 * @swagger
 * /api/v1/courses/sections/{id}:
 *   put:
 *     summary: Update section (Admin/Principal only)
 *     tags: [Course Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Section ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Section name
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 description: Course ID
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: Department ID
 *               academicYearId:
 *                 type: string
 *                 format: uuid
 *                 description: Academic year ID
 *               maxStudents:
 *                 type: integer
 *                 description: Maximum number of students
 *               academicSession:
 *                 type: string
 *                 description: Academic session (e.g., 2025-26)
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Section status
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Section not found
 *       500:
 *         description: Internal server error
 */
router.put('/courses/sections/:id', (req, res) => courseController.updateSection(req, res));

export default router;
