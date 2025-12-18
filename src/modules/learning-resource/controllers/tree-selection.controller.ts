import { Request, Response } from 'express';
import { learningResourceRepository } from '../repositories/learning-resource.repository';
import { userRepository } from '../../user/repositories/user.repository';

/**
 * Get student's resource selection
 */
export const getMyresourceselection = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Get student's assigned resource
    const assignedresource = await learningResourceRepository.findByAssignedStudent(req.user.id);

    res.status(200).json({
      success: true,
      data: assignedresource, // Will be null if no resource is assigned
    });
  } catch (error) {
    console.error('Get my resource selection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resource selection',
    });
  }
};

/**
 * Select a resource for monitoring
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

    const { resourceId } = req.body;

    // Check if student already has a resource assigned
    const existingresource = await learningResourceRepository.findByAssignedStudent(req.user.id);
    if (existingresource) {
      res.status(400).json({
        success: false,
        message: 'You already have a resource assigned',
      });
      return;
    }

    // Check if resource exists and is available
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

    // Assign resource to student
    const updatedresource = await learningResourceRepository.updateresource(resourceId, {
      assignedStudentId: req.user.id,
      assignedDate: new Date(),
      status: 'assigned',
    });

    res.status(200).json({
      success: true,
      message: 'resource selected successfully',
      data: updatedresource,
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

    // Use the findWithFilters method to get unassigned resources
    console.log('Fetching available resources with filter: assignedStudentId = null');
    const availableresources = await learningResourceRepository.findWithFilters({
      assignedStudentId: null, // This should filter for resources with no assigned student
      limit: 100,
      page: 1
    });
    console.log('Available resources result:', availableresources.data.length, 'resources found');

    res.status(200).json({
      success: true,
      data: availableresources.data,
      pagination: availableresources.pagination
    });
  } catch (error) {
    console.error('Get available resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available resources',
    });
  }
};

/**
 * Cancel resource selection
 */
export const cancelresourceselection = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Find student's assigned resource
    const assignedresource = await learningResourceRepository.findByAssignedStudent(req.user.userId);
    if (!assignedresource) {
      res.status(404).json({
        success: false,
        message: 'No resource assigned to cancel',
      });
      return;
    }

    // Unassign resource
    const updatedresource = await learningResourceRepository.updateresource(assignedresource.id, {
      assignedStudentId: null,
      assignedDate: null,
      status: 'assigned', // Keep as assigned but available for other students
    });

    res.status(200).json({
      success: true,
      message: 'resource selection cancelled successfully',
      data: updatedresource,
    });
  } catch (error) {
    console.error('Cancel resource selection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel resource selection',
    });
  }
};
