import { Router } from 'express';
import { config } from '../config/environment';
import authRoutes from '../modules/auth/routes/auth.routes';
import userRoutes from '../modules/user/routes/user.routes';
import staffRoutes from '../modules/user/routes/staff.routes';
import collegeRoutes from '../modules/college/routes/college.routes';
import departmentRoutes from '../modules/department/routes/department.routes';
import learningResourceRoutes from '../modules/learning-resource/routes/learning-resource.routes';
import dashboardRoutes from '../modules/dashboard/routes/dashboard.routes';
import invitationRoutes from '../modules/invitation/routes/invitation.routes';
import registrationRoutes from '../modules/registration/routes/registration.routes';
import uploadRoutes from '../modules/upload/routes/upload.routes';
import enrollmentRoutes from '../modules/enrollment/routes/enrollment.routes';
import approvalRoutes from '../modules/approval/routes/approval.routes';
import progressTrackingRoutes from '../modules/progress-tracking/routes/progress-tracking.routes';
import bulkUploadRoutes from '../modules/bulk-upload/routes/bulk-upload.routes';
import contentRoutes from '../modules/content/routes/content.routes';
import otpRoutes from '../modules/otp/routes/otp.routes';
import locationRoutes from '../modules/location/routes/location.routes';
import courseRoutes from '../modules/course/routes/course.routes';
import contactRoutes from '../modules/contact/routes/contact.routes';
import monitoringRoutes from '../modules/monitoring/routes/monitoring.routes';
import classInChargeRoutes from '../modules/user/routes/class-incharge.routes';
import resourceCatalogRoutes from '../modules/resource-catalog/routes/resource-catalog.routes';
import certificateRoutes from '../modules/certificate/routes/certificate.routes';
import { createContentMappingRoutes } from '../interface-adapters/routes/ContentMappingRoutes';
import { createStudentEnrollmentRoutes } from '../interface-adapters/routes/StudentEnrollmentRoutes';
import { createPlaySessionRoutes } from '../interface-adapters/routes/PlaySessionRoutes';
import { createSubjectStaffAssignmentRoutes } from './hod/subjectStaffAssignmentRoutes';
import { createContentCreationRoutes } from '../interface-adapters/routes/ContentCreationRoutes';
import { createExaminationRoutes } from '../interface-adapters/routes/ExaminationRoutes';
import { createLMSContentRoutes } from './lmsContentRoutes';
import { pool } from '../config/database';

const router = Router();

// API version prefix
const apiVersion = config.server.apiVersion;

// Mount routes
router.use(`/api/${apiVersion}/auth`, authRoutes);
router.use(`/api/${apiVersion}/users`, userRoutes);
router.use(`/api/${apiVersion}/staff`, staffRoutes);
router.use(`/api/${apiVersion}/colleges`, collegeRoutes);
router.use(`/api/${apiVersion}/departments`, departmentRoutes);
router.use(`/api/${apiVersion}/learning-resources`, learningResourceRoutes);
router.use(`/api/${apiVersion}/dashboard`, dashboardRoutes);
router.use(`/api/${apiVersion}/invitations`, invitationRoutes);
router.use(`/api/${apiVersion}/registration-requests`, registrationRoutes);
router.use(`/api/${apiVersion}/uploads`, uploadRoutes);
router.use(`/api/${apiVersion}/enrollment`, enrollmentRoutes);
router.use(`/api/${apiVersion}/approvals`, approvalRoutes);
router.use(`/api/${apiVersion}/progress-tracking`, progressTrackingRoutes);
router.use(`/api/${apiVersion}/bulk-upload`, bulkUploadRoutes);
router.use(`/api/${apiVersion}/content`, contentRoutes);
router.use(`/api/${apiVersion}/otp`, otpRoutes);
router.use(`/api/${apiVersion}/locations`, locationRoutes);
router.use(`/api/${apiVersion}/contact`, contactRoutes);
router.use(`/api/${apiVersion}/monitoring`, monitoringRoutes);
router.use(`/api/${apiVersion}/class-incharge`, classInChargeRoutes);
router.use(`/api/${apiVersion}/resource-catalog`, resourceCatalogRoutes);
router.use(`/api/${apiVersion}/certificate`, certificateRoutes);
router.use(`/api/${apiVersion}/content-mapping`, createContentMappingRoutes()); // Content Mapping (Clean Architecture)
router.use(`/api/${apiVersion}/student-enrollment`, createStudentEnrollmentRoutes()); // Student Enrollment (Clean Architecture)
router.use(`/api/${apiVersion}/play-session`, createPlaySessionRoutes()); // Play Session (Clean Architecture)
router.use(`/api/${apiVersion}/hod/subject-assignments`, createSubjectStaffAssignmentRoutes(pool)); // HOD Subject-Staff Assignment
router.use(`/api/${apiVersion}/content-creation`, createContentCreationRoutes(pool)); // Content Creation (HOD/Staff)
router.use(`/api/${apiVersion}/examinations`, createExaminationRoutes(pool)); // Examination Submission & Grading
router.use(`/api/${apiVersion}/lms-content`, createLMSContentRoutes(pool)); // LMS Assignments & Examinations
router.use(`/api/${apiVersion}`, courseRoutes); // Course, Academic Years, and Sections endpoints

// API root endpoint
router.get(`/api/${apiVersion}`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student-ACT LMS API',
    version: apiVersion,
    endpoints: {
      authentication: `/api/${apiVersion}/auth`,
      users: `/api/${apiVersion}/users`,
      colleges: `/api/${apiVersion}/colleges`,
      departments: `/api/${apiVersion}/departments`,
      learningResources: `/api/${apiVersion}/learning-resources`,
      dashboard: `/api/${apiVersion}/dashboard`,
    },
    documentation: config.swagger.enabled ? `/api/${apiVersion}/docs` : 'Not available',
    health: '/health',
  });
});

export default router;