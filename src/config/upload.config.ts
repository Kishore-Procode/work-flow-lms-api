/**
 * Upload Configuration
 * 
 * Handles file upload paths and configuration for different environments
 * Supports both development and production deployment scenarios
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import path from 'path';
import fs from 'fs';

/**
 * Upload configuration interface
 */
interface UploadConfig {
  /** Base upload directory path */
  uploadPath: string;
  /** resource images subdirectory path */
  resourceImagesPath: string;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed file types */
  allowedFileTypes: string[];
  /** Base URL for serving static files */
  staticFilesBaseUrl: string;
}

/**
 * Get the base upload directory path
 * Handles both relative and absolute paths for different deployment scenarios
 */
const getUploadBasePath = (): string => {
  const uploadPath = process.env.UPLOAD_PATH || 'uploads';
  
  // If it's an absolute path, use it directly
  if (path.isAbsolute(uploadPath)) {
    return uploadPath;
  }
  
  // For relative paths, determine the base directory
  let baseDir: string;
  
  if (process.env.NODE_ENV === 'production') {
    // In production, check if we're running from dist folder
    const currentDir = process.cwd();
    const isDist = currentDir.endsWith('/dist') || currentDir.endsWith('\\dist');
    
    if (isDist) {
      // If running from dist, go up one level to the project root
      baseDir = path.dirname(currentDir);
    } else {
      // If running from project root in production
      baseDir = currentDir;
    }
  } else {
    // In development, use current working directory (project root)
    baseDir = process.cwd();
  }
  
  return path.resolve(baseDir, uploadPath);
};

/**
 * Get the resource images directory path
 */
const getResourceImagesPath = (): string => {
  const basePath = getUploadBasePath();
  return path.join(basePath, 'resource-media');
};

/**
 * Ensure directory exists, create if it doesn't
 */
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created upload directory: ${dirPath}`);
  }
};

/**
 * Get the static files base URL for serving uploaded files
 */
const getStaticFilesBaseUrl = (): string => {
  return process.env.STATIC_FILES_BASE_URL || '/uploads';
};

/**
 * Initialize upload directories
 * Call this during application startup
 */
export const initializeUploadDirectories = (): void => {
  const basePath = getUploadBasePath();
  const resourceImagesPath = getResourceImagesPath();
  
  console.log('Initializing upload directories...');
  console.log(`Base upload path: ${basePath}`);
  console.log(`resource images path: ${resourceImagesPath}`);
  
  // Ensure directories exist
  ensureDirectoryExists(basePath);
  ensureDirectoryExists(resourceImagesPath);
  
  console.log('Upload directories initialized successfully');
};

/**
 * Get upload configuration
 */
export const getUploadConfig = (): UploadConfig => {
  return {
    uploadPath: getUploadBasePath(),
    resourceImagesPath: getResourceImagesPath(),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf').split(','),
    staticFilesBaseUrl: getStaticFilesBaseUrl()
  };
};

/**
 * Get the full file path for a resource image
 */
export const getResourceImagePath = (filename: string): string => {
  return path.join(getResourceImagesPath(), filename);
};

/**
 * Get the URL for serving a resource image
 */
export const getResourceImageUrl = (filename: string): string => {
  const baseUrl = getStaticFilesBaseUrl();
  return `${baseUrl}/resource-media/${filename}`;
};

/**
 * Validate file type
 */
export const isValidFileType = (filename: string): boolean => {
  const config = getUploadConfig();
  const ext = path.extname(filename).toLowerCase().substring(1); // Remove the dot
  return config.allowedFileTypes.includes(ext);
};

/**
 * Get content type for file extension
 */
export const getContentType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const contentTypeMap: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  
  return contentTypeMap[ext] || 'application/octet-stream';
};

/**
 * Clean up old files (utility function for maintenance)
 */
export const cleanupOldFiles = (olderThanDays: number = 30): void => {
  const resourceImagesPath = getResourceImagesPath();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  try {
    const files = fs.readdirSync(resourceImagesPath);
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(resourceImagesPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    console.log(`Cleaned up ${deletedCount} old files from ${resourceImagesPath}`);
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

export default {
  getUploadConfig,
  initializeUploadDirectories,
  getResourceImagePath,
  getResourceImageUrl,
  isValidFileType,
  getContentType,
  cleanupOldFiles
};
