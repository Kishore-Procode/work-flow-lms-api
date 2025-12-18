import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.middleware';
import { authorizeExactRoles } from '../../../middleware/exact-role-auth.middleware';
import {
  csvUpload,
  uploadColleges,
  uploadCollegesWithPrincipals,
  getCollegeUploadTemplate,
  getBulkUploadTemplate,
  uploadStaffAndHODs,
  getStaffHODUploadTemplate,
  uploadStudents,
  getStudentUploadTemplate
} from '../controllers/bulk-upload.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/bulk-upload/colleges/template:
 *   get:
 *     summary: Download CSV template for college upload (Excel format)
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/colleges/template', authenticate, authorize('admin'), getCollegeUploadTemplate);

/**
 * @swagger
 * /api/v1/bulk-upload/colleges:
 *   post:
 *     summary: Upload colleges via CSV (Excel format)
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: csvFile
 *         type: file
 *         required: true
 *         description: CSV file containing college data
 */
router.post('/colleges', authenticate, authorize('admin'), csvUpload.single('csvFile'), uploadColleges);

/**
 * @swagger
 * /api/v1/bulk-upload/colleges-with-principals/template:
 *   get:
 *     summary: Download CSV template for college upload with principal details
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/colleges-with-principals/template', authenticate, authorize('admin'), getBulkUploadTemplate);

/**
 * @swagger
 * /api/v1/bulk-upload/colleges-with-principals:
 *   post:
 *     summary: Upload colleges with principal details via CSV
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: csvFile
 *         type: file
 *         required: true
 *         description: CSV file containing college and principal data
 */
router.post('/colleges-with-principals', authenticate, authorize('admin'), csvUpload.single('csvFile'), uploadCollegesWithPrincipals);

/**
 * @swagger
 * /api/v1/bulk-upload/staff-hod/template:
 *   get:
 *     summary: Download CSV template for staff/HOD upload
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/staff-hod/template', authenticate, authorize('principal'), getStaffHODUploadTemplate);

/**
 * @swagger
 * /api/v1/bulk-upload/staff-hod:
 *   post:
 *     summary: Upload staff and HODs via CSV (for principals)
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: csvFile
 *         type: file
 *         required: true
 *         description: CSV file containing staff and HOD data
 */
router.post('/staff-hod', authenticate, authorize('principal'), csvUpload.single('csvFile'), uploadStaffAndHODs);

/**
 * @swagger
 * /api/v1/bulk-upload/students/template:
 *   get:
 *     summary: Download CSV template for student upload
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 */
router.get('/students/template', authenticate, authorizeExactRoles('staff', 'hod'), getStudentUploadTemplate);

/**
 * @swagger
 * /api/v1/bulk-upload/students:
 *   post:
 *     summary: Upload students via CSV (for staff and HODs)
 *     tags: [Bulk Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: csvFile
 *         type: file
 *         required: true
 *         description: CSV file containing student data
 */
router.post('/students', authenticate, authorizeExactRoles('staff', 'hod'), csvUpload.single('csvFile'), uploadStudents);

export default router;
