import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { uploadRepository } from '../repositories/upload.repository';
import { resourceImageRepository } from '../repositories/tree-image.repository';
import {
  getUploadConfig,
  getResourceImagePath,
  getResourceImageUrl,
  isValidFileType,
  getContentType
} from '../../../config/upload.config';
import { photoRestrictionService } from '../services/photo-restriction.service';
import {enhancedUserRepository} from '../../user/repositories/enhanced-user.repository'
import { pool } from '../../../config/database';

const parseAcademicYearName = (yearName: string): { startYear: number; endYear: number } | null => {
  const match = yearName.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (!match) return null;
  return {
    startYear: parseInt(match[1]),
    endYear: parseInt(match[2])
  };
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const config = getUploadConfig();
    const uploadDir = config.resourceImagesPath;

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  if (file.mimetype.startsWith('image/') && isValidFileType(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only allowed image files are permitted!'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getUploadConfig().maxFileSize,
  }
});

/**
 * Upload resource image
 */
export const uploadresourceImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
      return;
    }

    const { resourceId, imageType = 'progress', caption } = req.body;
    console.log('Caption:', caption);
    console.log('Body:', req.body);
    
    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'resource ID is required',
      });
      return;
    }

    // Check photo restrictions
    const userId = req.user.id || req.user.userId;
    const photoRestriction = await photoRestrictionService.canStudentTakePhoto(userId, resourceId,caption);

    if (!photoRestriction.canTakePhoto) {
      // Clean up uploaded file since we're rejecting the upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(403).json({
        success: false,
        message: photoRestriction.reason,
        nextAllowedDate: photoRestriction.nextAllowedDate,
        academicYearInfo: photoRestriction.academicYearInfo
      });
      return;
    }

    // Create file upload record
    const fileUpload = await uploadRepository.createFileUpload({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: userId,
      uploadType: 'resource_image',
      relatedEntityId: resourceId
    });

    // Create resource image record
    const imageUrl = getResourceImageUrl(req.file.filename);
    const resourceImage = await resourceImageRepository.createresourceImage({
      resourceId,
      studentId: userId,
      imageUrl,
      imageType,
      caption,
      fileSize: req.file.size,
      fileName: req.file.filename,
      mimeType: req.file.mimetype
    });

    // Check if student has completed all semesters
    const studentQuery = `SELECT ay.year_name FROM users u LEFT JOIN academic_years ay ON u.academic_year_id = ay.id WHERE u.id = $1`;
    const studentResult = await pool.query(studentQuery, [userId]);
    let isCompleted = false;
    if (studentResult.rows.length > 0) {
      const yearName = studentResult.rows[0].year_name;
      const parsed = parseAcademicYearName(yearName);
      if (parsed) {
        const totalSemesters = (parsed.endYear - parsed.startYear) * 2;
        const countQuery = `SELECT COUNT(*) as count FROM resource_media WHERE student_id = $1 AND resource_id = $2`;
        const countResult = await pool.query(countQuery, [userId, resourceId]);
        const photoCount = parseInt(countResult.rows[0].count);
        if (photoCount >= totalSemesters) {
          isCompleted = true;
        }
      }
    }

    // Convert database column names to camelCase for response
    const responseData = {
      id: resourceImage.id,
      resourceId: resourceImage.resource_id,
      studentId: resourceImage.student_id,
      imageUrl: resourceImage.image_url,
      imageType: resourceImage.image_type,
      caption: resourceImage.caption,
      uploadDate: resourceImage.upload_date,
      createdAt: resourceImage.created_at,
      fileUpload
    };

    res.status(201).json({
      success: true,
      message: isCompleted ? 'resource image uploaded successfully. You have successfully completed all semesters!' : 'resource image uploaded successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Upload resource image error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });

    // Clean up uploaded file if database operation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload resource image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all photos (for dashboard)
 */
export const getAllPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Get all resource images based on user role
    let images;
    if (req.user.role === 'admin') {
      // Admin can see all images
      images = await resourceImageRepository.getAllresourceImages();
    } else if (req.user.role === 'principal') {
      // Principal can see images from their college
      images = await resourceImageRepository.getresourceImagesByCollege(req.user.collegeId);
    } else if (req.user.role === 'hod' || req.user.role === 'staff') {
      // HOD and Staff can see images from their department
      images = await resourceImageRepository.getresourceImagesByDepartment(req.user.departmentId);
    } else {
      // Students can only see their own images
      images = await resourceImageRepository.getresourceImagesByStudent(req.user.id);
    }

    // Convert database column names to camelCase for response
    const convertedImages = images.map(image => ({
      id: image.id,
      resourceId: image.resource_id,
      studentId: image.student_id,
      imageUrl: image.image_url,
      imageType: image.image_type,
      caption: image.caption,
      uploadDate: image.upload_date,
      createdAt: image.created_at,
      fileName: image.file_name,
      fileSize: image.file_size,
      mimeType: image.mime_type,
      // Add resource details if available
      category: image.category,
      resourceCode: image.resource_code,
      studentName: image.student_name
    }));

    res.status(200).json({
      success: true,
      data: convertedImages
    });

  } catch (error) {
    console.error('Get all photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve photos',
    });
  }
};

/**
 * Get recent uploads from all students in the college (for dashboard latest updates)
 */
export const getRecentUploads = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { limit = 20 } = req.query;
    let images;

    // Get recent images based on user role - for students, show college-wide updates
    if (req.user.role === 'admin') {
      // Admin can see all recent images
      images = await resourceImageRepository.getRecentresourceImages(parseInt(limit as string));
    } else if (req.user.role === 'principal') {
      // Principal can see recent images from their college
      images = await resourceImageRepository.getRecentByCollege(req.user.collegeId, parseInt(limit as string));
    } else if (req.user.role === 'hod' || req.user.role === 'staff') {
      // HOD and Staff can see recent images from their department
      images = await resourceImageRepository.getRecentByDepartment(req.user.departmentId, parseInt(limit as string));
    } else {
      // Students can see recent images from their college
      images = await resourceImageRepository.getRecentByCollege(req.user.collegeId, parseInt(limit as string));
    }

    // Convert and format for latest updates display
    const recentUploads = images.map(image => ({
      id: image.id,
      studentName: image.student_name || 'Anonymous Student',
      studentEmail: image.student_email,
      department: { name: image.department_name || 'Unknown Department' },
      academicYear: { yearName: image.academic_year_name },
      resource: {
        resourceCode: image.resource_code || 'N/A',
        category: image.category || 'Unknown category',
        locationDescription: image.location_description
      },
      imageUrl: image.image_url,
      description: image.caption || 'resource progress update',
      type: image.image_type || 'progress',
      uploadDate: image.upload_date || image.created_at,
      createdAt: image.created_at
    }));

    res.status(200).json({
      success: true,
      message: 'Recent uploads retrieved successfully',
      data: recentUploads
    });

  } catch (error) {
    console.error('Get recent uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent uploads',
    });
  }
};

/**
 * Get resource images
 */
export const getresourceImages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceId } = req.params;
    const { imageType } = req.query;

    const userId = req.user.id || req.user.userId;
    let images;
    if (req.user.role === 'student') {
      // Students can only see their own resource images
      images = await resourceImageRepository.getresourceImagesByStudent(userId, resourceId, imageType as string);
    } else {
      // Staff, HOD, Principal, Admin can see all images for resources in their scope
      images = await resourceImageRepository.getresourceImages(resourceId, imageType as string);
    }

    // Convert database column names to camelCase for response
    const convertedImages = images.map(image => ({
      id: image.id,
      resourceId: image.resource_id,
      studentId: image.student_id,
      imageUrl: image.image_url,
      imageType: image.image_type,
      caption: image.caption,
      uploadDate: image.upload_date,
      createdAt: image.created_at,
      fileName: image.file_name,
      fileSize: image.file_size,
      mimeType: image.mime_type
    }));

    res.status(200).json({
      success: true,
      data: convertedImages
    });

  } catch (error) {
    console.error('Get resource images error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource images',
    });
  }
};

/**
 * Delete resource image
 */
export const deleteresourceImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { imageId } = req.params;

    // Get image details
    const image = await resourceImageRepository.getresourceImageById(imageId);
    if (!image) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role === 'student' && image.student_id !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own images',
      });
      return;
    }

    // Delete from database
    await resourceImageRepository.deleteresourceImage(imageId);

    // Delete physical file - extract filename from image_url
    const filename = image.image_url.split('/').pop();
    if (filename) {
      const filePath = getResourceImagePath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(200).json({
      success: true,
      message: 'resource image deleted successfully'
    });

  } catch (error) {
    console.error('Delete resource image error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource image',
    });
  }
};

/**
 * Serve image with authentication
 */
export const serveSecureImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access images',
      });
      return;
    }

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('')) {
      res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
      return;
    }

    const imagePath = getResourceImagePath(filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }

    // Optional: Check if user has permission to access this specific image
    // This would require additional logic to verify image ownership/access rights

    // Determine content type based on file extension
    const contentType = getContentType(filename);
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming image:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error serving image',
        });
      }
    });
  } catch (error) {
    console.error('Serve secure image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve image',
    });
  }
};

/**
 * Check if student can take a photo for a specific resource
 */
export const checkPhotoRestrictions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceId } = req.params;

    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'resource ID is required',
      });
      return;
    }

    const userId = req.user.id || req.user.userId;
    const photoRestriction = await photoRestrictionService.canStudentTakePhoto(userId, resourceId);

    res.json({
      success: true,
      data: photoRestriction
    });

  } catch (error) {
    console.error('Error checking photo restrictions:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking photo restrictions'
    });
  }
};

/**
 * Get student's photo history for current academic year
 */
export const getPhotoHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceId } = req.params;

    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'resource ID is required',
      });
      return;
    }

    const userId = req.user.id || req.user.userId;
    const photoHistory = await photoRestrictionService.getStudentPhotoHistory(userId, resourceId);

    res.json({
      success: true,
      data: photoHistory
    });

  } catch (error) {
    console.error('Error getting photo history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting photo history'
    });
  }
};

export const checktrueornot = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Call repository with current year
    const user = await enhancedUserRepository.userExist(id, currentYear);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if currentYear is between start_year and end_year
    const inRange =
      currentYear >= parseInt(user.start_year, 10) &&
      currentYear <= parseInt(user.end_year, 10) && user.images_this_year == 0;

    if (currentYear < parseInt(user.start_year, 10)) {
      res.status(200).json({
      success: true,
      data: {
        inRange,
        error:"Your year has not started", // number of uploads this year
      },
    });
    }

    if (currentYear > parseInt(user.end_year, 10)) {
      res.status(200).json({
      success: true,
      data: {
        inRange,
        error:"Your year has been finished", // number of uploads this year
      },
    });
    }

    if (user.images_this_year !== 0) {
       res.status(200).json({
      success: true,
      data: {
        inRange,
        error:"You have already posted this year", // number of uploads this year
      },
    });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        academic_year_id: user.academic_year_id,
        start_year: user.start_year,
        end_year: user.end_year,
        current_year: user.current_year,
        inRange,
        images_this_year: user.images_this_year, // number of uploads this year
      },
    });
  } catch (error: any) {
    console.error('Error checking user existence:', error);

    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

