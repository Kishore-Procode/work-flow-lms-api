
import { Router } from 'express';
import * as certificateController from '../controllers/certificate.controller';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/certificate/my-certificate:
 *   get:
 *     summary: Generate and download the student's resource certificate
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-certificate', authenticate, certificateController.generateCertificate);

/**
 * @swagger
 * /api/v1/certificate/play-session/:sessionId:
 *   get:
 *     summary: Generate and download certificate for completed play session
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 */
router.get('/play-session/:sessionId', authenticate, certificateController.generatePlaySessionCertificate);

export default router;
