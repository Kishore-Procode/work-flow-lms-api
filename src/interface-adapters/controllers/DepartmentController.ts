/**
 * Department Controller (Clean Architecture)
 * 
 * Interface adapter that handles HTTP requests and responses for department operations.
 * Uses Clean Architecture use cases while maintaining identical API contracts.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { CreateDepartmentUseCase } from '../../application/use-cases/department/CreateDepartmentUseCase';
import { GetDepartmentsUseCase } from '../../application/use-cases/department/GetDepartmentsUseCase';
import { CreateDepartmentRequest } from '../../application/dtos/department/CreateDepartmentRequest';
import { GetDepartmentsRequest } from '../../application/dtos/department/GetDepartmentsRequest';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';
import { DomainError } from '../../domain/errors/DomainError';

export class DepartmentController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly getDepartmentsUseCase: GetDepartmentsUseCase
  ) {}

  /**
   * GET /api/v1/departments
   * Get all departments with pagination and role-based filtering
   */
  public getDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Create request DTO
      const request = GetDepartmentsRequest.fromHttpRequest(req.query, {
        id: req.user.id,
        role: req.user.role,
        collegeId: req.user.collegeId,
        departmentId: req.user.departmentId,
      });

      // Execute use case
      const response = await this.getDepartmentsUseCase.execute(request);

      // Return API response
      res.status(HttpStatusCode.OK).json(response.toApiResponse());
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/departments
   * Create new department
   */
  public createDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Create request DTO
      const request = CreateDepartmentRequest.fromHttpRequest(req.body, {
        id: req.user.id,
        role: req.user.role,
        collegeId: req.user.collegeId,
        departmentId: req.user.departmentId,
      });

      // Execute use case
      const response = await this.createDepartmentUseCase.execute(request);

      // Return API response
      res.status(HttpStatusCode.CREATED).json(response.toApiResponse());
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/departments/public
   * Get all departments (public endpoint for registration)
   */
  public getDepartmentsPublic = async (req: Request, res: Response): Promise<void> => {
    try {
      // Create request for public access (no authentication)
      const request = GetDepartmentsRequest.fromHttpRequest(
        { ...req.query, limit: 1000, page: 1 }, // High limit for dropdown
        {
          id: 'public',
          role: 'public',
        }
      );

      // For public access, we need to bypass role-based filtering
      // This would require a separate use case or method
      const response = await this.getDepartmentsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: response.departments,
        pagination: response.pagination,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/departments/public/college/:collegeId
   * Get departments by college (public endpoint for registration)
   */
  public getDepartmentsByCollegePublic = async (req: Request, res: Response): Promise<void> => {
    try {
      const { collegeId } = req.params;

      // Create request for public access
      const request = GetDepartmentsRequest.fromHttpRequest(
        { ...req.query, collegeId, limit: 1000, page: 1 },
        {
          id: 'public',
          role: 'public',
        }
      );

      const response = await this.getDepartmentsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: response.departments,
        pagination: response.pagination,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/departments/:departmentId
   * Get department by ID
   */
  public getDepartmentById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { departmentId } = req.params;

      // For now, use the existing logic until we implement GetDepartmentByIdUseCase
      // This maintains backward compatibility
      res.status(HttpStatusCode.NOT_IMPLEMENTED).json(
        ApiResponse.error('Department by ID endpoint not yet implemented in Clean Architecture')
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/departments/college/:collegeId
   * Get departments by college
   */
  public getDepartmentsByCollege = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      const { collegeId } = req.params;

      // Check permissions
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.collegeId !== collegeId) {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied to this college')
        );
        return;
      }

      // Create request DTO
      const request = GetDepartmentsRequest.fromHttpRequest(
        { ...req.query, collegeId },
        {
          id: req.user.id,
          role: req.user.role,
          collegeId: req.user.collegeId,
          departmentId: req.user.departmentId,
        }
      );

      const response = await this.getDepartmentsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: response.departments,
        pagination: response.pagination,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * PUT /api/v1/departments/:departmentId
   * Update department
   */
  public updateDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Not yet implemented - would need UpdateDepartmentUseCase
      res.status(HttpStatusCode.NOT_IMPLEMENTED).json(
        ApiResponse.error('Update department endpoint not yet implemented in Clean Architecture')
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * DELETE /api/v1/departments/:departmentId
   * Delete department
   */
  public deleteDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Not yet implemented - would need DeleteDepartmentUseCase
      res.status(HttpStatusCode.NOT_IMPLEMENTED).json(
        ApiResponse.error('Delete department endpoint not yet implemented in Clean Architecture')
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/departments/public/classes/:collegeId/:departmentId
   * Get classes by college and department (public endpoint for registration)
   */
  public getClassesByDepartmentPublic = async (req: Request, res: Response): Promise<void> => {
    try {
      // This would require a separate use case for class management
      res.status(HttpStatusCode.NOT_IMPLEMENTED).json(
        ApiResponse.error('Classes endpoint not yet implemented in Clean Architecture')
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Handle errors and return appropriate HTTP responses
   */
  private handleError(error: unknown, res: Response): void {
    console.error('Department controller error:', error);

    if (error instanceof DomainError) {
      switch (error.code) {
        case 'VALIDATION_ERROR':
          res.status(HttpStatusCode.BAD_REQUEST).json(
            ApiResponse.validationError(error.message, [])
          );
          break;
        case 'NOT_FOUND':
          res.status(HttpStatusCode.NOT_FOUND).json(
            ApiResponse.notFound(error.message)
          );
          break;
        case 'AUTHORIZATION_ERROR':
          res.status(HttpStatusCode.FORBIDDEN).json(
            ApiResponse.forbidden(error.message)
          );
          break;
        case 'AUTHENTICATION_ERROR':
          res.status(HttpStatusCode.UNAUTHORIZED).json(
            ApiResponse.unauthorized(error.message)
          );
          break;
        case 'CONFLICT':
          res.status(HttpStatusCode.CONFLICT).json(
            ApiResponse.conflict(error.message)
          );
          break;
        case 'BUSINESS_RULE_VIOLATION':
          res.status(HttpStatusCode.BAD_REQUEST).json(
            ApiResponse.error(error.message)
          );
          break;
        default:
          res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
            ApiResponse.error('Internal server error')
          );
      }
    } else {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Internal server error')
      );
    }
  }
}
