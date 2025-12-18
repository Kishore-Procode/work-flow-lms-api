import { Request, Response } from 'express';
import { learningResourceRepository } from '../repositories/learning-resource.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { collegeRepository } from '../../college/repositories/college.repository';
import { departmentRepository } from '../../department/repositories/department.repository';
import { resourceCatalogRepository } from '../../resource-catalog/repositories/resource-catalog.repository';
import { resourceFilter } from '../../../types';
import { monitoringRepository } from '../repositories/monitoring.repository';

// Utility function to convert snake_case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Utility function to convert object keys from snake_case to camelCase
const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  if (obj instanceof Date) return obj; // Preserve Date objects
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    converted[camelKey] = convertKeysToCamelCase(value);
  }
  return converted;
};

// Generate unique resource code
const generateresourceCode = async (collegeId: string, departmentId?: string): Promise<string> => {
  try {
    // Get college info
    const college = await collegeRepository.findById(collegeId);
    const collegeCode = college?.name?.substring(0, 4).toUpperCase() || 'resource';

    // Get department info if provided
    let deptCode = '';
    if (departmentId) {
      const department = await departmentRepository.findById(departmentId);
      deptCode = department?.code || department?.name?.substring(0, 3).toUpperCase() || '';
    }

    // Get current year and generate sequence number
    const currentYear = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year
    const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    // Format: COLLEGE-DEPT-YY-XXXX (e.g., RMKEC-CSE-25-0001)
    const resourceCode = `${collegeCode}${deptCode ? '-' + deptCode : ''}-${currentYear}-${randomSuffix}`;

    // Ensure uniqueness
    const existing = await learningResourceRepository.findByresourceCode(resourceCode);
    if (existing) {
      // If collision, add extra random suffix
      const extraSuffix = Math.floor(Math.random() * 99).toString().padStart(2, '0');
      return `${resourceCode}-${extraSuffix}`;
    }

    return resourceCode;
  } catch (error) {
    console.error('Error generating resource code:', error);
    // Fallback to simple timestamp-based code
    const fallbackCode = `resource-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
    return fallbackCode;
  }
};

/**
 * Get all resources with filtering and pagination
 */
export const getresources = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Validate and sanitize query parameters with flexible handling
    const {
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      status,
      collegeId,
      departmentId,
      assignedStudentId,
      category,
      location,
      filterByStudentDepartment
    } = req.query;

    // Validate numeric parameters with flexible parsing
    let pageNum = 1;
    let limitNum = 10;

    if (page && page !== '') {
      const parsedPage = parseInt(page as string, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        pageNum = parsedPage;
      }
    }

    if (limit && limit !== '') {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limitNum = parsedLimit;
      }
    }

    // Validate sortOrder with flexible handling
    const validSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : 'desc';

    // Convert camelCase sortBy to snake_case for database compatibility
    const convertSortBy = (sortField: string): string => {
      const sortMap: { [key: string]: string } = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'startedDate': 'started_date',
        'resourceCode': 'resource_code',
        'assignedDate': 'assigned_date'
      };
      return sortMap[sortField] || sortField;
    };

    // Build validated filters with safe string handling
    const filters: resourceFilter = {
      page: pageNum,
      limit: limitNum,
      sortBy: convertSortBy((sortBy as string) || 'created_at'),
      sortOrder: validSortOrder,
      search: (search as string) || '',
      ...(status && status !== '' && { status: status as any }),
      ...(category && category !== '' && { category: category as string }),
      ...(location && location !== '' && { location: location as string }),
      ...(filterByStudentDepartment === 'true' && { filterByStudentDepartment: true }),
    };

    // Apply role-based filtering
    if (req.user.role !== 'admin') {
      if (req.user.role === 'principal' && req.user.collegeId) {
        filters.collegeId = req.user.collegeId;
      } else if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId) {
        filters.departmentId = req.user.departmentId;
        // For HOD and Staff, filter by student department if not explicitly overridden
        if (!filterByStudentDepartment) {
          filters.filterByStudentDepartment = true;
        }
      } else if (req.user.role === 'student') {
        // Students can only see their assigned resources
        filters.assignedStudentId = req.user.id || req.user.userId;
      }
    } else {
      // Admin can filter by any college/department/student if provided
      if (collegeId) filters.collegeId = collegeId as string;
      if (departmentId) filters.departmentId = departmentId as string;
      if (assignedStudentId) filters.assignedStudentId = assignedStudentId as string;
    }

    const result = await learningResourceRepository.findWithFilters(filters);

    res.status(200).json({
      success: true,
      message: 'resources retrieved successfully',
      data: convertKeysToCamelCase(result.data),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get resources error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resources',
    });
  }
};

/**
 * Get resource by ID
 */
export const getresourceById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceId } = req.params;

    const resource = await learningResourceRepository.findByIdWithDetails(resourceId);
    if (!resource) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      if (req.user.role === 'principal' && req.user.collegeId !== resource.collegeId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this resource',
        });
        return;
      }

      if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId !== resource.departmentId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this resource',
        });
        return;
      }

      if (req.user.role === 'student' && resource.assignedStudentId !== req.user.userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this resource',
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      message: 'resource retrieved successfully',
      data: resource,
    });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource',
    });
  }
};

/**
 * Create new resource
 */
export const createresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin, principal, HOD, and staff can create resources
    if (!['admin', 'principal', 'hod', 'staff'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create resources',
      });
      return;
    }

    const resourceData = req.body;

    // Generate resource code if not provided
    if (!resourceData.resourceCode) {
      resourceData.resourceCode = await generateresourceCode(resourceData.collegeId, resourceData.departmentId);
    }

    // Set default started date if not provided
    if (!resourceData.startedDate) {
      resourceData.startedDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    }

    // Ensure status is valid for database enum
    if (!resourceData.status || !['assigned', 'healthy', 'needs_attention', 'deceased', 'replaced'].includes(resourceData.status)) {
      resourceData.status = 'assigned'; // Default to 'assigned'
    }

    // Check if resource code already exists
    const existingresource = await learningResourceRepository.findByresourceCode(resourceData.resourceCode);
    if (existingresource) {
      res.status(400).json({
        success: false,
        message: 'resource code already exists',
      });
      return;
    }

    // Apply role-based restrictions
    if (req.user.role === 'principal' && req.user.collegeId) {
      resourceData.collegeId = req.user.collegeId;
    } else if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId) {
      resourceData.departmentId = req.user.departmentId;
      // Get college ID from user
      const user = await userRepository.findById(req.user.userId);
      if (user?.college_id) {
        resourceData.collegeId = user.college_id;
      }
    }

    // Validate assigned student if provided
    if (resourceData.assignedStudentId) {
      const student = await userRepository.findById(resourceData.assignedStudentId);
      if (!student) {
        res.status(400).json({
          success: false,
          message: 'Assigned student not found',
        });
        return;
      }

      if (student.role !== 'student') {
        res.status(400).json({
          success: false,
          message: 'Assigned user is not a student',
        });
        return;
      }
    }

    const newresource = await learningResourceRepository.createresource(resourceData);

    res.status(201).json({
      success: true,
      message: 'resource created successfully',
      data: convertKeysToCamelCase(newresource),
    });
  } catch (error) {
    console.error('Create resource error:', error);
    console.error('resource data:', req.body);
    console.error('User:', req.user);

    // Check if it's a validation error
    if (error.message && error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create resource',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update resource
 */
export const updateresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { resourceId } = req.params;
    const updateData = req.body;

    // Get current resource
    const currentresource = await learningResourceRepository.findById(resourceId);
    if (!currentresource) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      if (req.user.role === 'principal' && req.user.collegeId !== currentresource.collegeId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to update this resource',
        });
        return;
      }

      console.log('resource update access check:', { userRole: req.user.role, userDepartmentId: req.user.departmentId, resourceDepartmentId: currentresource.departmentId });

      if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId !== currentresource.departmentId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to update this resource',
        });
        return;
      }

      if (req.user.role === 'student') {
        // Students can only update their assigned resources and limited fields
        if (currentresource.assignedStudentId !== req.user.userId) {
          res.status(403).json({
            success: false,
            message: 'Access denied to update this resource',
          });
          return;
        }

        const allowedFields = ['notes', 'status'];
        const updateFields = Object.keys(updateData);
        const hasUnallowedFields = updateFields.some(field => !allowedFields.includes(field));
        
        if (hasUnallowedFields) {
          res.status(403).json({
            success: false,
            message: 'Students can only update notes and status',
          });
          return;
        }
      }
    }

    const updatedresource = await learningResourceRepository.updateresource(resourceId, updateData);
    if (!updatedresource) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'resource updated successfully',
      data: updatedresource,
    });
  } catch (error) {
    console.error('Update resource error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update resource',
    });
  }
};

/**
 * Delete resource
 */
export const deleteresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can delete resources
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete resources',
      });
      return;
    }

    const { resourceId } = req.params;

    const deleted = await learningResourceRepository.delete(resourceId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'resource deleted successfully',
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource',
    });
  }
};

/**
 * Get available resources for student selection
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

    // Get student's department and college info
    const student = await userRepository.findById(req.user.userId);
    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found',
      });
      return;
    }

    // Get available resources (not assigned to any student) in the same college/department
    const filters: resourceFilter = {
      collegeId: student.college_id || undefined,
      departmentId: student.department_id || undefined,
      assignedStudentId: null, // Only unassigned resources
      status: 'assigned', // resources ready for assignment
    };

    const result = await learningResourceRepository.findWithFilters(filters);

    res.status(200).json({
      success: true,
      data: result.data.map(convertKeysToCamelCase),
      pagination: result.pagination,
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
 * Get student's assigned resource (using resources table directly)
 */
export const getStudentresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { studentId } = req.params;

    // Use the provided studentId or current user's ID
    const targetStudentId = studentId || req.user.id || req.user.userId;

    // Get resource assigned to student from resources table
    const resource = await learningResourceRepository.findByAssignedStudent(targetStudentId);

    if (!resource) {
      res.status(404).json({
        success: false,
        message: 'No resource assigned to this student',
        data: null
      });
      return;
    }

    // Get resource with full details
    const resourceWithDetails = await learningResourceRepository.findByIdWithDetails(resource.id);

    res.status(200).json({
      success: true,
      data: convertKeysToCamelCase(resourceWithDetails),
    });
  } catch (error) {
    console.error('Get student resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student resource',
    });
  }
};

/**
 * Assign resource to student
 */
export const assignresourceToStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin, principal, HOD, and staff can assign resources
    if (!['admin', 'principal', 'hod', 'staff'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to assign resources',
      });
      return;
    }

    const { resourceId } = req.params;
    const { studentId } = req.body;

    // Validate student
    const student = await userRepository.findById(studentId);
    if (!student) {
      res.status(400).json({
        success: false,
        message: 'Student not found',
      });
      return;
    }

    if (student.role !== 'student') {
      res.status(400).json({
        success: false,
        message: 'User is not a student',
      });
      return;
    }

    const success = await learningResourceRepository.assignToStudent(resourceId, studentId);
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'resource not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'resource assigned to student successfully',
    });
  } catch (error) {
    console.error('Assign resource to student error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to assign resource to student',
    });
  }
};

/**
 * Get unassigned resources
 */
export const getUnassignedresources = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const options = req.query;
    let collegeId: string | undefined;
    let departmentId: string | undefined;

    // Apply role-based filtering
    if (req.user.role === 'principal' && req.user.collegeId) {
      collegeId = req.user.collegeId;
    } else if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId) {
      departmentId = req.user.departmentId;
    }

    const result = await learningResourceRepository.findUnassigned(collegeId, departmentId, options);

    res.status(200).json({
      success: true,
      message: 'Unassigned resources retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get unassigned resources error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unassigned resources',
    });
  }
};

/**
 * Get resource statistics
 */
export const getresourcestatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin and principal can view statistics
    if (!['admin', 'principal'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    const statistics = await learningResourceRepository.getStatistics();

    res.status(200).json({
      success: true,
      message: 'resource statistics retrieved successfully',
      data: statistics,
    });
  } catch (error) {
    console.error('Get resource statistics error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource statistics',
    });
  }
};

/**
 * Get student's assigned resource
 */
export const getMyresource = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can access their assigned resource',
      });
      return;
    }

    const studentId = req.user.id || req.user.userId;

    // Get student's assigned resource
    const resource = await learningResourceRepository.getresourceByStudentId(studentId);

    if (!resource) {
      res.status(404).json({
        success: false,
        message: 'No resource assigned to this student',
      });
      return;
    }

    // Get recent monitoring records for this resource
    let recentMonitoring = [];
    try {
      recentMonitoring = await monitoringRepository.getMonitoringRecordsByresource(resource.id, { limit: 5 });
    } catch (monitoringError) {
      console.warn('Could not fetch monitoring records:', monitoringError);
    }

    const resourceData = {
      ...convertKeysToCamelCase(resource),
      recentMonitoring: recentMonitoring.map(convertKeysToCamelCase)
    };

    res.status(200).json({
      success: true,
      data: resourceData,
    });

  } catch (error) {
    console.error('Get my resource error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned resource',
    });
  }
};

/**
 * Create a new resource and assign it to a student
 */
export const createresourceAndAssignToStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin, principal, HOD, and staff can create and assign resources
    if (!['admin', 'principal', 'hod', 'staff', 'student'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create and assign resources',
      });
      return;
    }

    const { studentId, resourceData } = req.body;

    if (!studentId || !resourceData) {
      res.status(400).json({
        success: false,
        message: 'Student ID and resource data are required',
      });
      return;
    }

    // Validate student exists and is a student
    const student = await userRepository.findById(studentId);
    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found',
      });
      return;
    }

    if (student.role !== 'student') {
      res.status(400).json({
        success: false,
        message: 'User is not a student',
      });
      return;
    }

    // Validate required resource data
    if (!resourceData.category) {
      res.status(400).json({
        success: false,
        message: 'resource category is required',
      });
      return;
    }

    // Check resource inventory availability
    const isAvailable = await resourceCatalogRepository.checkAvailability(
      resourceData.category.trim(),
      student.department_id
    );

    if (!isAvailable) {
      res.status(400).json({
        success: false,
        message: `No ${resourceData.category} resources available in inventory for this department`,
      });
      return;
    }

    // Decrement available count in inventory
    const inventoryUpdated = await resourceCatalogRepository.decrementAvailableCount(
      resourceData.category.trim(),
      student.department_id
    );

    if (!inventoryUpdated) {
      res.status(500).json({
        success: false,
        message: 'Failed to update resource inventory',
      });
      return;
    }

    // Generate unique resource code
    const resourceCode = await generateresourceCode(student.college_id, student.department_id);

    // Prepare resource data with defaults (using snake_case for database columns)
    const newresourceData = {
      category: resourceData.category.trim(),
      location_description: resourceData.locationDescription.trim(),
      started_date: resourceData.startedDate || new Date().toISOString().split('T')[0],
      status: 'healthy' as const, // New resources start as healthy
      assigned_student_id: studentId,
      college_id: student.college_id,
      department_id: student.department_id,
      resource_code: resourceCode,
    };

    // Create the resource
    const createdresource = await learningResourceRepository.create(newresourceData);

    if (!createdresource) {
      res.status(500).json({
        success: false,
        message: 'Failed to create resource',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'resource created and assigned to student successfully',
      data: {
        resource: convertKeysToCamelCase(createdresource),
        student: {
          id: student.id,
          name: student.name,
          email: student.email
        }
      }
    });

  } catch (error) {
    console.error('Create resource and assign to student error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create and assign resource to student',
    });
  }
};
