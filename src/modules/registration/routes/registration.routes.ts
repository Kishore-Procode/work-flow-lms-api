import { Router } from 'express';
import { registrationController } from '../controllers/registration.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { validateBody } from '../../../middleware/validation.middleware';
import { createRegistrationRequestSchema } from '../../../utils/validation.schemas';

const router = Router();

// Public routes for registration form data (no auth required)
// GET /api/v1/registration-requests/academic-years/by-course/:courseId
router.get('/academic-years/by-course/:courseId', registrationController.getAcademicYearsByCourse);

// GET /api/v1/registration-requests/sections/by-course-department-year/:courseId/:departmentId/:yearId
router.get('/sections/by-course-department-year/:courseId/:departmentId/:yearId', registrationController.getSectionsByCourseDepYear);

// Public route for creating registration requests (no auth required)
// POST /api/v1/registration-requests
router.post('/', validateBody(createRegistrationRequestSchema), registrationController.createRegistrationRequest);

// Apply authentication middleware to protected routes
router.use(authenticate);

// GET /api/v1/registration-requests
router.get('/', registrationController.getRegistrationRequests);

// POST /api/v1/registration-requests/:id/approve
router.post('/:id/approve', registrationController.approveRegistrationRequest);

// POST /api/v1/registration-requests/:id/reject
router.post('/:id/reject', registrationController.rejectRegistrationRequest);

// DELETE /api/v1/registration-requests/:id
router.delete('/:id', registrationController.deleteRegistrationRequest);

export default router;
