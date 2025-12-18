import { Request, Response } from 'express';
import { resourceselectionRepository } from '../repositories/tree-selection.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { pool } from '../../../config/database';

/**
 * Get resource selection status for current user
 */
export const getSelectionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Check if user has any resource assigned (using existing resource_selections table)
    const query = `
      SELECT COUNT(*) as count
      FROM resource_selections ts
      WHERE ts.student_id = $1 AND ts.status = 'selected'
    `;

    const result = await pool.query(query, [userId]);
    const hasresource = parseInt(result.rows[0].count) > 0;

    res.status(200).json({
      success: true,
      message: 'Selection status retrieved successfully',
      data: {
        hasresource,
        userId
      }
    });

  } catch (error: any) {
    console.error('Error getting selection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get selection status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get available resources for selection
 */
export const getAvailableresources = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only students can select resources
    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can select resources',
      });
      return;
    }

    // Get available resources (not assigned to any student)
    // First try to get resources from the same department, then from the same college
    let result = await learningResourceRepository.findUnassigned(req.user.collegeId, req.user.departmentId, { limit: 100 });

    // If no resources in department, try college-wide
    if (result.data.length === 0) {
      result = await learningResourceRepository.findUnassigned(req.user.collegeId, undefined, { limit: 100 });
    }

    const availableresources = result.data;

    res.status(200).json({
      success: true,
      data: availableresources
    });

  } catch (error) {
    console.error('Get available resources error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available resources',
    });
  }
};

/**
 * Select a resource
 */
export const selectresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only students can select resources
    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can select resources',
      });
      return;
    }

    const { resourceId } = req.body;

    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: 'resource ID is required',
      });
      return;
    }

    // Check if student already has a resource selection
    const studentId = req.user.id || req.user.userId;
    const existingSelection = await resourceselectionRepository.getStudentresourceselection(studentId);
    if (existingSelection) {
      res.status(400).json({
        success: false,
        message: 'You have already selected a resource',
      });
      return;
    }

    // Check if resource is available
    const resource = await learningResourceRepository.findById(resourceId);
    if (!resource) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    if (resource.assignedStudentId) {
      res.status(400).json({
        success: false,
        message: 'resource is already assigned to another student',
      });
      return;
    }

    // Create resource selection
    const selection = await resourceselectionRepository.createresourceselection({
      studentId: studentId,
      resourceId,
      learningInstructions: `Dear ${req.user.name || 'Student'},

Congratulations on selecting your resource! Please follow these learning instructions:

1. **Preparation**: Choose a suitable location with adequate sunlight and space for growth.
2. **Digging**: Dig a hole twice the width of the root ball and as deep as the root ball.
3. **learning**: Place the resource in the hole, ensuring the root collar is level with the ground.
4. **Backfilling**: Fill the hole with soil, gently firming around the roots.
5. **Watering**: Water thoroughly after learning and maintain regular watering schedule.
6. **Documentation**: Take a photo of your started resource and upload it to the portal.

Remember to monitor your resource regularly and upload progress photos every month.

Happy learning!`,
      status: 'selected'
    });

    // Assign resource to student
    await learningResourceRepository.assignToStudent(resourceId, studentId);

    res.status(201).json({
      success: true,
      message: 'resource selected successfully',
      data: selection
    });

  } catch (error) {
    console.error('Select resource error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to select resource',
    });
  }
};

/**
 * Get student's resource selection
 */
export const getStudentresourceselection = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const studentId = req.params.studentId || req.user.id || req.user.userId;
    console.log('getStudentresourceselection', studentId, req.user.id, req.user.userId);
    // Check permissions
    if (req.user.role === 'student' && studentId !== (req.user.id || req.user.userId)) {
      res.status(403).json({
        success: false,
        message: 'You can only view your own resource selection',
      });
      return;
    }

    const selection = await resourceselectionRepository.getStudentresourceselectionWithDetails(studentId);

    // For status endpoint, return simplified response
    if (req.path.includes('/status')) {
      res.status(200).json({
        success: true,
        data: {
          hasresource: !!selection,
          selection: selection
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: selection
    });

  } catch (error) {
    console.error('Get student resource selection error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource selection',
    });
  }
};

/**
 * Mark resource as started
 */
export const markresourceAsstarted = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { selectionId, learningImageId } = req.body;

    if (!selectionId) {
      res.status(400).json({
        success: false,
        message: 'Selection ID is required',
      });
      return;
    }

    // Get selection
    const selection = await resourceselectionRepository.getresourceselectionById(selectionId);
    if (!selection) {
      res.status(404).json({
        success: false,
        message: 'resource selection not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role === 'student' && selection.studentId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own resource selection',
      });
      return;
    }

    // Update selection
    const updatedSelection = await resourceselectionRepository.updateresourceselection(selectionId, {
      isstarted: true,
      learningDate: new Date(),
      learningImageId,
      status: 'started'
    });

    res.status(200).json({
      success: true,
      message: 'resource marked as started successfully',
      data: updatedSelection
    });

  } catch (error) {
    console.error('Mark resource as started error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to mark resource as started',
    });
  }
};

/**
 * Get resource selections (for staff/admin)
 */
export const getresourceselections = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only staff and above can view all selections
    if (!['staff', 'hod', 'principal', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    const { status, collegeId, departmentId } = req.query;

    const filters: any = {};
    
    if (status) filters.status = status as string;
    
    // Apply role-based filtering
    if (req.user.role === 'principal') {
      filters.collegeId = req.user.collegeId;
    } else if (req.user.role === 'hod') {
      filters.departmentId = req.user.departmentId;
    } else if (req.user.role === 'staff') {
      filters.departmentId = req.user.departmentId;
    }

    // Override with query params if admin
    if (req.user.role === 'admin') {
      if (collegeId) filters.collegeId = collegeId as string;
      if (departmentId) filters.departmentId = departmentId as string;
    }

    const selections = await resourceselectionRepository.getresourceselectionsWithDetails(filters);

    res.status(200).json({
      success: true,
      data: selections
    });

  } catch (error) {
    console.error('Get resource selections error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource selections',
    });
  }
};
