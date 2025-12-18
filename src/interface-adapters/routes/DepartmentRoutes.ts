/**
 * Department Routes (Clean Architecture)
 * 
 * Express.js route definitions for department endpoints using Clean Architecture controllers.
 * Maintains identical API contracts while using new architecture.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { DepartmentController } from '../controllers/DepartmentController';
import { DIContainer } from '../../infrastructure/container/DIContainer';
import {
  Auth,
  Authz,
  Validation,
  Schemas,
  MiddlewareFactory
} from '../../infrastructure/middleware/CleanArchitectureMiddleware';

export class DepartmentRoutes {
  private readonly router: Router;
  private readonly departmentController: DepartmentController;

  constructor() {
    this.router = Router();
    this.departmentController = DIContainer.getInstance().departmentController;
    this.setupRoutes();
  }

  /**
   * Setup all department routes
   */
  private setupRoutes(): void {
    // Public routes (no authentication required)
    this.setupPublicRoutes();
    
    // Authenticated routes
    this.setupAuthenticatedRoutes();
  }

  /**
   * Setup public routes for registration
   */
  private setupPublicRoutes(): void {
    // GET /api/v1/departments/public
    // Get all departments (public endpoint for registration)
    this.router.get(
      '/public',
      Validation.validateQuery(Schemas.getDepartmentsQuery),
      this.departmentController.getDepartmentsPublic
    );

    // GET /api/v1/departments/public/college/:collegeId
    // Get departments by college (public endpoint for registration)
    this.router.get(
      '/public/college/:collegeId',
      Validation.validateParams(Schemas.departmentParams),
      Validation.validateQuery(Schemas.getDepartmentsQuery),
      this.departmentController.getDepartmentsByCollegePublic
    );

    // GET /api/v1/departments/public/classes/:collegeId/:departmentId
    // Get classes by college and department (public endpoint for registration)
    this.router.get(
      '/public/classes/:collegeId/:departmentId',
      Validation.validateParams(Schemas.departmentParams),
      this.departmentController.getClassesByDepartmentPublic
    );
  }

  /**
   * Setup authenticated routes
   */
  private setupAuthenticatedRoutes(): void {
    // GET /api/v1/departments
    // Get all departments with pagination and role-based filtering
    this.router.get(
      '/',
      ...MiddlewareFactory.createCrudChain('read', [], {
        query: Schemas.getDepartmentsQuery
      }),
      this.departmentController.getDepartments
    );

    // POST /api/v1/departments
    // Create new department (admin/principal only)
    this.router.post(
      '/',
      ...MiddlewareFactory.createCrudChain('create', ['admin', 'principal'], {
        body: Schemas.createDepartment
      }),
      this.departmentController.createDepartment
    );

    // GET /api/v1/departments/:departmentId
    // Get department by ID
    this.router.get(
      '/:departmentId',
      ...MiddlewareFactory.createCrudChain('read', [], {
        params: Schemas.departmentParams
      }),
      this.departmentController.getDepartmentById
    );

    // PUT /api/v1/departments/:departmentId
    // Update department (admin/principal/hod)
    this.router.put(
      '/:departmentId',
      ...MiddlewareFactory.createCrudChain('update', ['admin', 'principal', 'hod'], {
        params: Schemas.departmentParams,
        body: Schemas.createDepartment
      }),
      this.departmentController.updateDepartment
    );

    // DELETE /api/v1/departments/:departmentId
    // Delete department (admin only)
    this.router.delete(
      '/:departmentId',
      ...MiddlewareFactory.createCrudChain('delete', ['admin'], {
        params: Schemas.departmentParams
      }),
      this.departmentController.deleteDepartment
    );

    // GET /api/v1/departments/college/:collegeId
    // Get departments by college (authenticated)
    this.router.get(
      '/college/:collegeId',
      ...MiddlewareFactory.createCrudChain('read', [], {
        params: Schemas.departmentParams,
        query: Schemas.getDepartmentsQuery
      }),
      this.departmentController.getDepartmentsByCollege
    );
  }

  /**
   * Get the configured router
   */
  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Factory function to create department routes
 */
export function createDepartmentRoutes(): Router {
  const departmentRoutes = new DepartmentRoutes();
  return departmentRoutes.getRouter();
}

/**
 * Example usage in main app:
 * 
 * ```typescript
 * import { createDepartmentRoutes } from './interface-adapters/routes/DepartmentRoutes';
 * 
 * // In your Express app setup
 * app.use('/api/v1/departments', createDepartmentRoutes());
 * ```
 */
