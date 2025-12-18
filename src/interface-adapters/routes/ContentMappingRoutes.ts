/**
 * Content Mapping Routes (Clean Architecture)
 * 
 * Interface adapter that defines HTTP routes for content mapping operations.
 * Provides RESTful endpoints with proper authentication and authorization.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { ContentMappingController } from '../controllers/ContentMappingController';
import { CleanMiddlewareFactory } from '../../infrastructure/middleware/CleanArchitectureMiddleware';
import { DIContainer } from '../../infrastructure/container/DIContainer';
import Joi from 'joi';

/**
 * Validation schemas for content mapping endpoints
 */
const Schemas = {
  // Query parameters for dropdown data
  dropdownDataQuery: Joi.object({
    courseType: Joi.string().valid('UG', 'PG', 'Diploma', 'Certificate').optional(), // Filter courses by type
    lmsCourseId: Joi.string().optional(), // Allow any string (hardcoded demo data)
    lmsDepartmentId: Joi.string().optional(), // Allow any string (can be UUID or integer string)
    actDepartmentId: Joi.string().optional(), // Allow any string (integer from ACT schema)
  }),

  // Request body for load semesters
  loadSemestersBody: Joi.object({
    courseType: Joi.string().valid('UG', 'PG', 'Diploma', 'Certificate').required(),
    lmsCourseId: Joi.string().required(), // Allow any string (hardcoded demo data)
    lmsDepartmentId: Joi.string().required(), // Allow any string (can be UUID or integer string)
    lmsAcademicYearId: Joi.string().required(), // Allow any string (hardcoded demo data)
    actDepartmentId: Joi.string().required(), // Allow any string (integer from ACT schema)
    actRegulationId: Joi.string().required(), // Allow any string (integer from ACT schema)
  }),

  // Path parameters for semester details
  semesterDetailsParams: Joi.object({
    semesterDetailsId: Joi.string().uuid().required(),
  }),

  // Request body for assign subjects
  assignSubjectsBody: Joi.object({
    contentMapSemDetailsId: Joi.string().uuid().required(),
    assignments: Joi.array().items(
      Joi.object({
        subjectId: Joi.string().required(), // Allow any string (course IDs are integers, not UUIDs)
        lmsLearningResourceId: Joi.string().uuid().optional().allow(null), // Optional - not used in new workflow
      })
    ).min(1).required(),
  }),
};

/**
 * Content Mapping Routes Class
 */
export class ContentMappingRoutes {
  private router: Router;
  private contentMappingController: ContentMappingController;

  constructor() {
    this.router = Router();
    this.initializeController();
    this.setupRoutes();
  }

  /**
   * Initialize controller with dependencies
   */
  private initializeController(): void {
    const container = DIContainer.getInstance();

    // Get use cases from container (access as properties, not methods)
    const getDropdownDataUseCase = container.getDropdownDataUseCase;
    const loadSemestersUseCase = container.loadSemestersUseCase;
    const getSubjectsUseCase = container.getSubjectsUseCase;
    const assignSubjectsUseCase = container.assignSubjectsUseCase;
    const pool = container['config'].database.pool;

    this.contentMappingController = new ContentMappingController(
      getDropdownDataUseCase,
      loadSemestersUseCase,
      getSubjectsUseCase,
      assignSubjectsUseCase,
      pool
    );
  }

  /**
   * Setup all routes
   */
  private setupRoutes(): void {
    this.setupDropdownDataRoutes();
    this.setupSemesterRoutes();
    this.setupSubjectRoutes();
  }

  /**
   * Setup dropdown data routes
   */
  private setupDropdownDataRoutes(): void {
    // GET /api/v1/content-mapping/dropdown-data
    // Get dropdown data for content mapping form
    this.router.get(
      '/dropdown-data',
      ...CleanMiddlewareFactory.createCrudChain('read', ['principal', 'hod'], {
        query: Schemas.dropdownDataQuery
      }),
      this.contentMappingController.getDropdownData
    );
  }

  /**
   * Setup semester-related routes
   */
  private setupSemesterRoutes(): void {
    // GET /api/v1/content-mapping/semesters
    // Get semesters for a course and academic year (for content creation)
    this.router.get(
      '/semesters',
      this.contentMappingController.getSemesters
    );

    // POST /api/v1/content-mapping/load-semesters
    // Load semesters from ACT schema and create content mapping configuration
    this.router.post(
      '/load-semesters',
      ...CleanMiddlewareFactory.createCrudChain('create', ['principal', 'hod'], {
        body: Schemas.loadSemestersBody
      }),
      this.contentMappingController.loadSemesters
    );
  }

  /**
   * Setup subject-related routes
   */
  private setupSubjectRoutes(): void {
    // GET /api/v1/content-mapping/subjects/:semesterDetailsId
    // Get subjects for a specific semester in content mapping context
    this.router.get(
      '/subjects/:semesterDetailsId',
      ...CleanMiddlewareFactory.createCrudChain('read', ['principal', 'hod'], {
        params: Schemas.semesterDetailsParams
      }),
      this.contentMappingController.getSubjects
    );

    // POST /api/v1/content-mapping/assign-subjects
    // Assign subjects to LMS learning resources
    this.router.post(
      '/assign-subjects',
      ...CleanMiddlewareFactory.createCrudChain('create', ['principal', 'hod'], {
        body: Schemas.assignSubjectsBody
      }),
      this.contentMappingController.assignSubjects
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
 * Factory function to create content mapping routes
 */
export function createContentMappingRoutes(): Router {
  const contentMappingRoutes = new ContentMappingRoutes();
  return contentMappingRoutes.getRouter();
}

/**
 * Default export for convenience
 */
export default createContentMappingRoutes;
