import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { toCamelCase } from '../../../utils/data.utils';
import path from 'path';
import fs from 'fs';

export class ContentController {
  /**
   * Get all guidelines
   */
  async getGuidelines(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT * FROM guidelines
        WHERE is_active = true
        ORDER BY created_at ASC
      `;

      const result = await pool.query(query);

      res.status(200).json({
        success: true,
        message: 'Guidelines retrieved successfully',
        data: result.rows.map(toCamelCase),
      });
    } catch (error) {
      console.error('Get guidelines error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve guidelines',
      });
    }
  }

  /**
   * Get all resources
   */
  async getResources(req: Request, res: Response): Promise<void> {
    try {
      console.log('Getting resources...');
      const query = `
        SELECT * FROM resources
        WHERE status = 'published'
        ORDER BY category, created_at ASC
      `;

      const result = await pool.query(query);
      console.log('Resources found:', result.rows.length);

      res.status(200).json({
        success: true,
        message: 'Resources retrieved successfully',
        data: result.rows.map(toCamelCase),
      });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve resources',
      });
    }
  }

  /**
   * Create guideline (Admin only)
   */
  async createGuideline(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, icon, tips, displayOrder } = req.body;

      const query = `
        INSERT INTO guidelines (title, description, icon, tips, display_order, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await pool.query(query, [
        title,
        description,
        icon,
        JSON.stringify(tips),
        displayOrder || 0,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Guideline created successfully',
        data: toCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Create guideline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create guideline',
      });
    }
  }

  /**
   * Update guideline (Admin only)
   */
  async updateGuideline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, icon, tips, displayOrder, isActive } = req.body;

      const query = `
        UPDATE guidelines 
        SET title = $1, description = $2, icon = $3, tips = $4, 
            display_order = $5, is_active = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const result = await pool.query(query, [
        title,
        description,
        icon,
        JSON.stringify(tips),
        displayOrder,
        isActive,
        id
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Guideline not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Guideline updated successfully',
        data: toCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Update guideline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update guideline',
      });
    }
  }

  /**
   * Delete guideline (Admin only)
   */
  async deleteGuideline(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        UPDATE guidelines 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Guideline not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Guideline deleted successfully',
      });
    } catch (error) {
      console.error('Delete guideline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete guideline',
      });
    }
  }

  /**
   * Create resource (Admin only)
   */
  async createResource(req: Request, res: Response): Promise<void> {
    try {
      const { category, title, description, type, size, link, displayOrder } = req.body;

      console.log('Creating resource with data:', {
        category,
        title,
        description,
        type,
        size,
        link,
        displayOrder,
        userId: req.user?.id
      });

      // Validate required fields
      if (!category || !title || !description || !type || !link) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: category, title, description, type, and link are required',
        });
        return;
      }

      // Check if user exists and has admin role
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required to create resources',
        });
        return;
      }

      const query = `
        INSERT INTO resources (category, title, description, type, size, link, display_order, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        category,
        title,
        description,
        type,
        size || null,
        link,
        displayOrder || 0,
        req.user.id
      ]);

      console.log('Resource created successfully:', result.rows[0]);

      res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: toCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Create resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create resource',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update resource (Admin only)
   */
  async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { category, title, description, type, size, link, displayOrder, isActive } = req.body;

      const query = `
        UPDATE resources 
        SET category = $1, title = $2, description = $3, type = $4, 
            size = $5, link = $6, display_order = $7, is_active = $8, updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `;

      const result = await pool.query(query, [
        category,
        title,
        description,
        type,
        size,
        link,
        displayOrder,
        isActive,
        id
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Resource updated successfully',
        data: toCamelCase(result.rows[0]),
      });
    } catch (error) {
      console.error('Update resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update resource',
      });
    }
  }

  /**
   * Delete resource (Admin only)
   */
  async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        UPDATE resources
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Resource deleted successfully',
      });
    } catch (error) {
      console.error('Delete resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete resource',
      });
    }
  }

  /**
   * Download resource file (Authenticated users)
   */
  async downloadResource(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      // Security: Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);

      // Define the resources directory (adjust path as needed)
      const resourcesDir = path.join(process.cwd(), 'uploads', 'resources');
      const filePath = path.join(resourcesDir, sanitizedFilename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Resource file not found',
        });
        return;
      }

      // Get file stats for content length
      const stats = fs.statSync(filePath);

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      res.setHeader('Content-Length', stats.size);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file',
          });
        }
      });

    } catch (error) {
      console.error('Download resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download resource',
      });
    }
  }
}

export const contentController = new ContentController();
