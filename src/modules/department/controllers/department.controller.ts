import { Request, Response } from 'express';
import { DepartmentService } from '../services/department.service';
import { departmentRepository } from '../repositories/department.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { collegeRepository } from '../../college/repositories/college.repository';
import { transformDepartment, transformPaginatedResult } from '../../../utils/data.utils';

const departmentService = new DepartmentService();

/**
 * Get all departments (public endpoint for registration)
 */
export const getDepartmentsPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all departments without authentication and without pagination for dropdown use
    const result = await departmentRepository.findAllWithDetails({
      limit: 1000, // Set high limit to get all departments for dropdown
      page: 1
    });
    const transformedResult = transformPaginatedResult(result, transformDepartment);

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: transformedResult.data,
      pagination: transformedResult.pagination,
    });
  } catch (error) {
    console.error('Get departments public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get departments by college (public endpoint for registration)
 */
export const getDepartmentsByCollegePublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collegeId } = req.params;

    // Get departments for the specified college without authentication and without pagination
    const result = await departmentRepository.findByCollegeWithCounts(collegeId, {
      limit: 1000, // Set high limit to get all departments for dropdown
      page: 1
    });

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get departments by college public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get classes by college and department (public endpoint for registration)
 */
export const getClassesByDepartmentPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collegeId, departmentId } = req.params;

    // Get distinct classes from users table for the specified college and department
    const query = `
      SELECT DISTINCT class as name, class as id
      FROM users
      WHERE college_id = $1 AND department_id = $2 AND class IS NOT NULL AND class != ''
      ORDER BY class
    `;

    // Note: Using any type to access protected method temporarily
    const result = await (departmentRepository as any).query(query, [collegeId, departmentId]);

    // If no classes found, provide some default classes
    let classes = result.rows;
    if (classes.length === 0) {
      classes = [
        { id: 'CS-1A', name: 'CS-1A' },
        { id: 'CS-1B', name: 'CS-1B' },
        { id: 'CS-2A', name: 'CS-2A' },
        { id: 'CS-2B', name: 'CS-2B' },
        { id: 'CS-3A', name: 'CS-3A' },
        { id: 'CS-3B', name: 'CS-3B' },
        { id: 'CS-4A', name: 'CS-4A' },
        { id: 'CS-4B', name: 'CS-4B' }
      ];
    }

    res.status(200).json({
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    });
  } catch (error) {
    console.error('Get classes by department public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve classes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all departments with pagination and filtering
 */
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const options = req.query;

    // Apply role-based filtering
    if (req.user.role === 'principal' && req.user.collegeId) {
      // Principal can only see departments in their college
      const result = await departmentRepository.findByCollegeWithCounts(req.user.collegeId, options);
      const transformedResult = transformPaginatedResult(result, transformDepartment);

      res.status(200).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: transformedResult.data,
        pagination: transformedResult.pagination,
      });
      return;
    } else if ((req.user.role === 'hod' || req.user.role === 'staff') && req.user.departmentId) {
      // HOD/Staff can only see their own department
      console.log('🔍 getDepartments - HOD/Staff lookup:', {
        role: req.user.role,
        departmentId: req.user.departmentId,
        userId: req.user.id
      });

      const department = await departmentRepository.findByIdWithDetails(req.user.departmentId);

      console.log('🔍 getDepartments - findByIdWithDetails result:', {
        found: !!department,
        department: department ? { id: department.id, name: department.name } : null
      });

      if (!department) {
        console.error('❌ getDepartments - Department not found for:', req.user.departmentId);
        res.status(404).json({
          success: false,
          message: 'Department not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Department retrieved successfully',
        data: [transformDepartment(department)],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      });
      return;
    }

    // Admin can see all departments
    const result = await departmentRepository.findAllWithDetails(options);
    const transformedResult = transformPaginatedResult(result, transformDepartment);

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: transformedResult.data,
      pagination: transformedResult.pagination,
    });
  } catch (error) {
    console.error('Get departments error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
    });
  }
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
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
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.departmentId !== departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this department',
      });
      return;
    }

    const department = await departmentRepository.findByIdWithDetails(departmentId);
    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    // Principal can only access departments in their college
    if (req.user.role === 'principal' && req.user.collegeId !== department.collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this department',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: department,
    });
  } catch (error) {
    console.error('Get department by ID error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department',
    });
  }
};

/**
 * Create new department
 */
export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin and principal can create departments
    if (!['admin', 'principal'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only administrators and principals can create departments',
      });
      return;
    }

    const departmentData = req.body;

    // Validate college exists
    const college = await collegeRepository.findById(departmentData.collegeId);
    if (!college) {
      res.status(400).json({
        success: false,
        message: 'College not found',
      });
      return;
    }

    // Principal can only create departments in their college
    if (req.user.role === 'principal' && req.user.collegeId !== departmentData.collegeId) {
      res.status(403).json({
        success: false,
        message: 'You can only create departments in your college',
      });
      return;
    }

    // Check if department code already exists in the college
    const existingDepartment = await departmentRepository.findByCodeAndCollege(
      departmentData.code,
      departmentData.collegeId
    );
    if (existingDepartment) {
      res.status(400).json({
        success: false,
        message: 'Department code already exists in this college',
      });
      return;
    }

    // Validate HOD if provided
    if (departmentData.hodId) {
      const hod = await userRepository.findById(departmentData.hodId);
      if (!hod) {
        res.status(400).json({
          success: false,
          message: 'HOD not found',
        });
        return;
      }

      if (hod.role !== 'hod') {
        res.status(400).json({
          success: false,
          message: 'User is not a HOD',
        });
        return;
      }

      // Check if HOD is already assigned to another department
      const existingAssignment = await departmentRepository.findByHODId(departmentData.hodId);
      if (existingAssignment) {
        res.status(400).json({
          success: false,
          message: 'HOD is already assigned to another department',
        });
        return;
      }
    }

    const newDepartment = await departmentRepository.createDepartment(departmentData);

    // Update HOD's department assignment if provided
    if (departmentData.hodId) {
      await userRepository.updateUser(departmentData.hodId, {
        collegeId: departmentData.collegeId,
        departmentId: newDepartment.id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: newDepartment,
    });
  } catch (error) {
    console.error('Create department error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create department',
    });
  }
};

/**
 * Update department
 */
export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { departmentId } = req.params;
    const updateData = req.body;

    // Debug logging for permission check
    console.log('=== DEPARTMENT UPDATE DEBUG ===');
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    console.log('User College ID:', req.user.collegeId);
    console.log('User Department ID:', req.user.departmentId);
    console.log('Target Department ID:', departmentId);
    console.log('Update Data:', JSON.stringify(updateData, null, 2));
    console.log('================================');

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.departmentId !== departmentId) {
      console.log('❌ PERMISSION DENIED - User department ID does not match target department ID');
      res.status(403).json({
        success: false,
        message: 'Access denied to update this department',
      });
      return;
    }

    console.log('✅ PERMISSION GRANTED - User can update this department');

    // Get current department
    const currentDepartment = await departmentRepository.findById(departmentId);
    if (!currentDepartment) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    // Principal can only update departments in their college
    if (req.user.role === 'principal') {
      console.log('=== PRINCIPAL COLLEGE CHECK ===');
      console.log('Principal College ID:', req.user.collegeId);
      console.log('Department College ID:', currentDepartment.collegeId);
      console.log('College IDs Match:', req.user.collegeId === currentDepartment.collegeId);
      console.log('================================');

      if (req.user.collegeId !== currentDepartment.collegeId) {
        console.log('❌ PRINCIPAL COLLEGE MISMATCH - Access denied');
        res.status(403).json({
          success: false,
          message: 'Access denied to update this department',
        });
        return;
      }
      console.log('✅ PRINCIPAL COLLEGE CHECK PASSED');
    }

    // HOD can only update limited fields
    if (req.user.role === 'hod') {
      const allowedFields = ['name', 'totalStudents', 'totalStaff'];
      const updateFields = Object.keys(updateData);
      const hasUnallowedFields = updateFields.some(field => !allowedFields.includes(field));

      if (hasUnallowedFields) {
        res.status(403).json({
          success: false,
          message: 'HODs can only update name, total students, and total staff',
        });
        return;
      }
    }

    // Check if department code is being changed and if it already exists
    if (updateData.code) {
      const existingDepartment = await departmentRepository.findByCodeAndCollege(
        updateData.code,
        currentDepartment.collegeId
      );
      if (existingDepartment && existingDepartment.id !== departmentId) {
        res.status(400).json({
          success: false,
          message: 'Department code already exists in this college',
        });
        return;
      }
    }

    // Handle HOD assignment changes
    if (updateData.hodId !== undefined && updateData.hodId !== currentDepartment.hodId) {
      // If there's a new HOD being assigned
      if (updateData.hodId) {
        // Validate the new HOD exists and has HOD role
        const newHOD = await userRepository.findById(updateData.hodId);
        if (!newHOD) {
          res.status(400).json({
            success: false,
            message: 'HOD user not found',
          });
          return;
        }

        if (newHOD.role !== 'hod') {
          res.status(400).json({
            success: false,
            message: 'User is not a HOD',
          });
          return;
        }

        // Check if HOD is already assigned to another department
        const existingAssignment = await departmentRepository.findByHODId(updateData.hodId);
        if (existingAssignment && existingAssignment.id !== departmentId) {
          res.status(400).json({
            success: false,
            message: 'HOD is already assigned to another department',
          });
          return;
        }

        // Update new HOD's department assignment
        await userRepository.updateUser(updateData.hodId, {
          collegeId: currentDepartment.collegeId,
          departmentId: departmentId,
        });
      }

      // If there was an old HOD, clear their department assignment
      if (currentDepartment.hodId && currentDepartment.hodId !== updateData.hodId) {
        await userRepository.updateUser(currentDepartment.hodId, {
          departmentId: null,
        });
      }
    }

    const updatedDepartment = await departmentRepository.updateDepartment(departmentId, updateData);
    if (!updatedDepartment) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: updatedDepartment,
    });
  } catch (error) {
    console.error('❌ Update department error:', error);

    // Enhanced error handling with specific messages
    const errorMessage = error instanceof Error ? error.message : 'Failed to update department';
    const statusCode = (error as any).statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        details: error instanceof Error ? error.stack : String(error)
      } : undefined
    });
  }
};

/**
 * Delete department
 */
export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can delete departments
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete departments',
      });
      return;
    }

    const { departmentId } = req.params;

    const deleted = await departmentRepository.delete(departmentId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
    });
  }
};

/**
 * Get departments by college
 */
export const getDepartmentsByCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { collegeId } = req.params;
    const options = req.query;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.collegeId !== collegeId) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this college',
      });
      return;
    }

    const result = await departmentRepository.findByCollegeWithCounts(collegeId, options);

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get departments by college error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
    });
  }
};
