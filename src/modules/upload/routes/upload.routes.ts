import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import {
  upload,
  uploadresourceImage,
  getresourceImages,
  getAllPhotos,
  getRecentUploads,
  deleteresourceImage,
  serveSecureImage,
  checkPhotoRestrictions,
  getPhotoHistory,
  checktrueornot
} from '../controllers/upload.controller';

const router = Router();

// Upload resource image
router.post('/resource-media', authenticate, upload.single('image'), uploadresourceImage);

// Get resource images for a specific resource (using 'for' to distinguish from serve route)
router.get('/resource-media/for/:resourceId', authenticate, getresourceImages);

// Get all photos (for dashboard)
router.get('/photos/all', authenticate, getAllPhotos);

// Get recent uploads (for latest updates section)
router.get('/photos/recent', authenticate, getRecentUploads);

// Delete resource image
router.delete('/resource-media/:imageId', authenticate, deleteresourceImage);

// Check photo restrictions for a resource
router.get('/photo-restrictions/:resourceId', authenticate, checkPhotoRestrictions);

// Get photo history for current academic year
router.get('/photo-history/:resourceId', authenticate, getPhotoHistory);

// Serve uploaded images with authentication
router.get('/images/:filename', authenticate, serveSecureImage);

// Serve resource images at the path frontend expects with authentication
router.get('/resource-media/:filename', authenticate, serveSecureImage);

router.post('/check/:id',authenticate,checktrueornot)

export default router;
