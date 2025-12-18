import { Request, Response } from 'express';
import { resourceCatalogRepository } from '../repositories/resource-catalog.repository';
import { departmentRepository } from '../../department/repositories/department.repository';
import { collegeRepository } from '../../college/repositories/college.repository';

/**
 * Get resource inventory with filters and pagination
 */
export const getresourceInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const filters: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as string) || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    // Apply role-based filtering
    if (req.user.role === 'principal' && req.user.collegeId) {
      filters.collegeId = req.user.collegeId;
    } else if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId) {
      filters.departmentId = req.user.departmentId;
      filters.collegeId = req.user.collegeId;
    }

    // Apply query filters
    if (req.query.departmentId) {
      filters.departmentId = req.query.departmentId;
    }
    if (req.query.collegeId && req.user.role === 'admin') {
      filters.collegeId = req.query.collegeId;
    }
    if (req.query.resourceType) {
      filters.resourceType = req.query.resourceType;
    }
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const result = await resourceCatalogRepository.findWithDetails(filters);

    res.status(200).json({
      success: true,
      message: 'resource inventory retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get resource inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource inventory',
    });
  }
};

/**
 * Get resource inventory by ID
 */
export const getresourceInventoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { inventoryId } = req.params;
    const inventory = await resourceCatalogRepository.findById(inventoryId);

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'resource inventory not found',
      });
      return;
    }

    // Check access permissions
    if (req.user.role === 'principal' && inventory.collegeId !== req.user.collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    if ((req.user.role === 'hod' || req.user.role === 'staff') && inventory.departmentId !== req.user.departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'resource inventory retrieved successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Get resource inventory by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource inventory',
    });
  }
};

/**
 * Create resource inventory
 */
export const createresourceInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin, principal, HOD can create resource inventory
    // if (!['admin', 'principal', 'hod'].includes(req.user.role)) {
    //   res.status(403).json({
    //     success: false,
    //     message: 'Insufficient permissions to create resource inventory',
    //   });
    //   return;
    // }

    const { resourceType, totalCount, departmentId, collegeId, notes } = req.body;

    // Validate required fields
    if (!resourceType || !totalCount || !departmentId || !collegeId) {
      res.status(400).json({
        success: false,
        message: 'resource type, total count, department ID, and college ID are required',
      });
      return;
    }

    // Validate total count
    if (totalCount < 0) {
      res.status(400).json({
        success: false,
        message: 'Total count must be a positive number',
      });
      return;
    }

    // Check if department exists
    const department = await departmentRepository.findById(departmentId);
    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    // Check if college exists
    const college = await collegeRepository.findById(collegeId);
    if (!college) {
      res.status(404).json({
        success: false,
        message: 'College not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role === 'principal' && req.user.collegeId !== collegeId) {
      res.status(403).json({
        success: false,
        message: 'You can only create inventory for your college',
      });
      return;
    }

    if (req.user.role === 'hod' && req.user.departmentId !== departmentId) {
      res.status(403).json({
        success: false,
        message: 'You can only create inventory for your department',
      });
      return;
    }

    const inventory = await resourceCatalogRepository.createInventory({
      resourceType,
      totalCount,
      departmentId,
      collegeId,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'resource inventory created successfully',
      data: inventory,
    });
  } catch (error: any) {
    console.error('Create resource inventory error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'resource type already exists for this department',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create resource inventory',
    });
  }
};

/**
 * Update resource inventory
 */
export const updateresourceInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin, principal, HOD can update resource inventory
    if (!['admin', 'principal', 'hod'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update resource inventory',
      });
      return;
    }

    const { inventoryId } = req.params;
    const { resourceType, totalCount, notes } = req.body;

    // Check if inventory exists
    const existingInventory = await resourceCatalogRepository.findById(inventoryId);
    if (!existingInventory) {
      res.status(404).json({
        success: false,
        message: 'resource inventory not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role === 'principal' && existingInventory.collegeId !== req.user.collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    if (req.user.role === 'hod' && existingInventory.departmentId !== req.user.departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Validate total count if provided
    if (totalCount !== undefined) {
      if (totalCount < 0) {
        res.status(400).json({
          success: false,
          message: 'Total count must be a positive number',
        });
        return;
      }

      // Check if new total count is less than assigned count
      if (totalCount < existingInventory.assignedCount) {
        res.status(400).json({
          success: false,
          message: `Cannot set total count below assigned count (${existingInventory.assignedCount})`,
        });
        return;
      }
    }

    const updatedInventory = await resourceCatalogRepository.updateInventory(inventoryId, {
      resourceType,
      totalCount,
      notes,
    });

    res.status(200).json({
      success: true,
      message: 'resource inventory updated successfully',
      data: updatedInventory,
    });
  } catch (error) {
    console.error('Update resource inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resource inventory',
    });
  }
};

/**
 * Delete resource inventory
 */
export const deleteresourceInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can delete resource inventory
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete resource inventory',
      });
      return;
    }

    const { inventoryId } = req.params;

    // Check if inventory exists
    const inventory = await resourceCatalogRepository.findById(inventoryId);
    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'resource inventory not found',
      });
      return;
    }

    // Check if there are assigned resources
    if (inventory.assignedCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete inventory with assigned resources',
      });
      return;
    }

    await resourceCatalogRepository.delete(inventoryId);

    res.status(200).json({
      success: true,
      message: 'resource inventory deleted successfully',
    });
  } catch (error) {
    console.error('Delete resource inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource inventory',
    });
  }
};

/**
 * Get inventory summary for a department
 */
export const getInventorySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { departmentId } = req.params;

    // Check permissions
    if (req.user.role === 'hod' && req.user.departmentId !== departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const summary = await resourceCatalogRepository.getInventorySummary(departmentId);

    res.status(200).json({
      success: true,
      message: 'Inventory summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory summary',
    });
  }
};

/**
 * Get assigned resources by type
 */
export const getAssignedresourcesByType = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceType, departmentId } = req.query;

    if (!resourceType || !departmentId) {
      res.status(400).json({
        success: false,
        message: 'resource type and department ID are required',
      });
      return;
    }

    // Check permissions
    if (req.user.role === 'hod' && req.user.departmentId !== departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const assignedresources = await resourceCatalogRepository.getAssignedresourcesByType(
      resourceType as string,
      departmentId as string
    );

    res.status(200).json({
      success: true,
      message: 'Assigned resources retrieved successfully',
      data: assignedresources,
    });
  } catch (error) {
    console.error('Get assigned resources by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned resources',
    });
  }
};

