/**
 * Location Controller
 * 
 * Handles location hierarchy endpoints (States, Districts, Pincodes)
 * following MNC enterprise standards for geographical data management.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { locationService } from '../services/location.service';
import { appLogger } from '../../../utils/logger';
import { ValidationError } from '../../../middleware/errorHandler';

/**
 * Get all states
 */
export const getAllStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const states = await locationService.getAllStates();

    res.status(200).json({
      success: true,
      data: states,
      message: 'States retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get all states error', {
      error,
      requestId: req.headers['x-request-id'] as string,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve states',
    });
  }
};

/**
 * Get state by ID
 */
export const getStateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId } = req.params;

    if (!stateId) {
      throw new ValidationError('State ID is required');
    }

    const state = await locationService.getStateById(stateId);

    if (!state) {
      res.status(404).json({
        success: false,
        message: 'State not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: state,
      message: 'State retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get state by ID error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      stateId: req.params.stateId,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve state',
      });
    }
  }
};

/**
 * Get districts by state
 */
export const getDistrictsByState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId } = req.params;

    if (!stateId) {
      throw new ValidationError('State ID is required');
    }

    const districts = await locationService.getDistrictsByState(stateId);

    res.status(200).json({
      success: true,
      data: districts,
      message: 'Districts retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get districts by state error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      stateId: req.params.stateId,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve districts',
      });
    }
  }
};

/**
 * Get district by ID
 */
export const getDistrictById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { districtId } = req.params;

    if (!districtId) {
      throw new ValidationError('District ID is required');
    }

    const district = await locationService.getDistrictById(districtId);

    if (!district) {
      res.status(404).json({
        success: false,
        message: 'District not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: district,
      message: 'District retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get district by ID error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      districtId: req.params.districtId,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve district',
      });
    }
  }
};

/**
 * Get pincodes by district
 */
export const getPincodesByDistrict = async (req: Request, res: Response): Promise<void> => {
  try {
    const { districtId } = req.params;

    if (!districtId) {
      throw new ValidationError('District ID is required');
    }

    const pincodes = await locationService.getPincodesByDistrict(districtId);

    res.status(200).json({
      success: true,
      data: pincodes,
      message: 'Pincodes retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get pincodes by district error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      districtId: req.params.districtId,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pincodes',
      });
    }
  }
};

/**
 * Get pincode by ID
 */
export const getPincodeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pincodeId } = req.params;

    if (!pincodeId) {
      throw new ValidationError('Pincode ID is required');
    }

    const pincode = await locationService.getPincodeById(pincodeId);

    if (!pincode) {
      res.status(404).json({
        success: false,
        message: 'Pincode not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: pincode,
      message: 'Pincode retrieved successfully',
    });
  } catch (error) {
    appLogger.error('Get pincode by ID error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      pincodeId: req.params.pincodeId,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pincode',
      });
    }
  }
};

/**
 * Search locations
 */
export const searchLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, type } = req.query;

    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    if (query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const validTypes = ['state', 'district', 'pincode'];
    if (type && !validTypes.includes(type as string)) {
      throw new ValidationError(`Type must be one of: ${validTypes.join(', ')}`);
    }

    const results = await locationService.searchLocations(
      query,
      type as 'state' | 'district' | 'pincode' | undefined
    );

    res.status(200).json({
      success: true,
      data: results,
      message: 'Search completed successfully',
    });
  } catch (error) {
    appLogger.error('Search locations error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      query: req.query,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to search locations',
      });
    }
  }
};

/**
 * Validate address hierarchy
 */
export const validateAddressHierarchy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stateId, districtId, pincodeId } = req.body;

    if (!stateId || !districtId || !pincodeId) {
      throw new ValidationError('State ID, District ID, and Pincode ID are required');
    }

    const validation = await locationService.validateAddressHierarchy(
      stateId,
      districtId,
      pincodeId
    );

    res.status(200).json({
      success: true,
      data: validation,
      message: validation.valid ? 'Address hierarchy is valid' : 'Address hierarchy validation failed',
    });
  } catch (error) {
    appLogger.error('Validate address hierarchy error', {
      error,
      requestId: req.headers['x-request-id'] as string,
      body: req.body,
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to validate address hierarchy',
      });
    }
  }
};

export const locationController = {
  getAllStates,
  getStateById,
  getDistrictsByState,
  getDistrictById,
  getPincodesByDistrict,
  getPincodeById,
  searchLocations,
  validateAddressHierarchy,
};
