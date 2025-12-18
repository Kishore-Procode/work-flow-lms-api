import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userRepository } from '../../user/repositories/user.repository';

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `profile-${req.user?.id || 'unknown'}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const profileUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * Upload profile image
 */
export const uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
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

    const userId = req.user.id || req.user.userId;
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;

    // Update user profile with new image URL
    const updatedUser = await userRepository.updateUser(userId, {
      profileImageUrl: imageUrl
    });

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          profileImageUrl: updatedUser.profile_image_url
        }
      },
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Delete profile image
 */
export const deleteProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id || req.user.userId;
    const user = await userRepository.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Delete old image file if it exists
    if (user.profile_image_url) {
      const oldImagePath = path.join(process.cwd(), 'uploads', 'profile-images', path.basename(user.profile_image_url));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user profile to remove image URL
    const updatedUser = await userRepository.updateUser(userId, {
      profileImageUrl: null
    });

    res.status(200).json({
      success: true,
      message: 'Profile image deleted successfully',
      data: {
        user: {
          id: updatedUser!.id,
          name: updatedUser!.name,
          email: updatedUser!.email,
          profileImageUrl: null
        }
      },
    });

  } catch (error) {
    console.error('Error deleting profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile image',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get profile image
 */
export const getProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(process.cwd(), 'uploads', 'profile-images', filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      res.status(404).json({
        success: false,
        message: 'Image not found',
      });
      return;
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile image',
    });
  }
};
