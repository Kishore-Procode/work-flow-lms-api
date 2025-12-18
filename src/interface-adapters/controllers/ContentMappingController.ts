/**
 * Content Mapping Controller (Clean Architecture)
 * 
 * Interface adapter that handles HTTP requests and responses for content mapping operations.
 * Provides endpoints for LMS Content Mapping functionality with role-based access control.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { GetDropdownDataUseCase } from '../../application/use-cases/content-mapping/GetDropdownDataUseCase';
import { LoadSemestersUseCase } from '../../application/use-cases/content-mapping/LoadSemestersUseCase';
import { GetSubjectsUseCase } from '../../application/use-cases/content-mapping/GetSubjectsUseCase';
import { AssignSubjectsUseCase } from '../../application/use-cases/content-mapping/AssignSubjectsUseCase';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';
import { DomainError } from '../../domain/errors/DomainError';

export class ContentMappingController {
  constructor(
    private readonly getDropdownDataUseCase: GetDropdownDataUseCase,
    private readonly loadSemestersUseCase: LoadSemestersUseCase,
    private readonly getSubjectsUseCase: GetSubjectsUseCase,
    private readonly assignSubjectsUseCase: AssignSubjectsUseCase,
    private readonly pool: Pool
  ) {}

  /**
   * GET /api/v1/content-mapping/dropdown-data
   * Get dropdown data for content mapping form
   */
  public getDropdownData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check role authorization (Principal and HOD only)
      if (!this.isAuthorizedRole(req.user.role)) {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Principal or HOD role required.')
        );
        return;
      }

      const request = {
        requestingUserId: req.user.id,
        courseType: req.query.courseType as string,
        lmsCourseId: req.query.lmsCourseId as string,
        lmsDepartmentId: req.query.lmsDepartmentId as string,
        actDepartmentId: req.query.actDepartmentId as string
      };

      const response = await this.getDropdownDataUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Dropdown data retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/content-mapping/semesters
   * Get semesters for a course and academic year (for content creation)
   */
  public getSemesters = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId, academicYearId } = req.query;

      if (!courseId || !academicYearId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Course ID and Academic Year ID are required')
        );
        return;
      }

      // Query to get unique semesters from content mapping
      // Use DISTINCT ON to get one semester per semester_number (in case of multiple content mappings)
      const query = `
        SELECT DISTINCT ON (cms.semester_number)
          cms.id,
          cms.semester_number,
          cms.semester_name as name,
          cms.total_subjects,
          cms.mapped_subjects
        FROM lmsact.content_map_master cmm
        JOIN lmsact.content_map_sem_details cms ON cmm.id = cms.content_map_master_id
        WHERE cmm.lms_course_id = $1
          AND cmm.lms_academic_year_id = $2
          AND cmm.status != 'inactive'
        ORDER BY cms.semester_number ASC, cms.id ASC
      `;

      const result = await this.pool.query(query, [courseId, academicYearId]);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Semesters retrieved successfully', result.rows)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/content-mapping/load-semesters
   * Load semesters from ACT schema and create content mapping configuration
   */
  public loadSemesters = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check role authorization (Principal and HOD only)
      if (!this.isAuthorizedRole(req.user.role)) {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Principal or HOD role required.')
        );
        return;
      }

      // Validate required fields
      const { courseType, lmsCourseId, lmsDepartmentId, lmsAcademicYearId, actDepartmentId, actRegulationId } = req.body;

      if (!courseType || !lmsCourseId || !lmsDepartmentId || !lmsAcademicYearId || !actDepartmentId || !actRegulationId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('All dropdown selections are required')
        );
        return;
      }

      const request = {
        courseType,
        lmsCourseId,
        lmsDepartmentId,
        lmsAcademicYearId,
        actDepartmentId,
        actRegulationId,
        requestingUserId: req.user.id
      };

      const response = await this.loadSemestersUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success(response.message, response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/content-mapping/subjects/:semesterDetailsId
   * Get subjects for a specific semester in content mapping context
   */
  public getSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check role authorization (Principal and HOD only)
      if (!this.isAuthorizedRole(req.user.role)) {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Principal or HOD role required.')
        );
        return;
      }

      const { semesterDetailsId } = req.params;

      if (!semesterDetailsId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Semester details ID is required')
        );
        return;
      }

      const request = {
        contentMapSemDetailsId: semesterDetailsId,
        requestingUserId: req.user.id
      };

      const response = await this.getSubjectsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Subjects retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/content-mapping/assign-subjects
   * Assign subjects to LMS learning resources
   */
  public assignSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Check role authorization (Principal and HOD only)
      if (!this.isAuthorizedRole(req.user.role)) {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Principal or HOD role required.')
        );
        return;
      }

      const { contentMapSemDetailsId, assignments } = req.body;

      if (!contentMapSemDetailsId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Content map semester details ID is required')
        );
        return;
      }

      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('At least one subject assignment is required')
        );
        return;
      }

      // Validate assignment structure
      for (const assignment of assignments) {
        if (!assignment.subjectId) {
          res.status(HttpStatusCode.BAD_REQUEST).json(
            ApiResponse.badRequest('Each assignment must have subjectId')
          );
          return;
        }
      }

      const request = {
        contentMapSemDetailsId,
        assignments,
        requestingUserId: req.user.id
      };

      const response = await this.assignSubjectsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success(response.message, response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Check if user role is authorized for content mapping operations
   */
  private isAuthorizedRole(role: string): boolean {
    return role === 'principal' || role === 'hod';
  }

  /**
   * Handle errors and send appropriate HTTP responses
   */
  private handleError(error: any, res: Response): void {
    console.error('Content Mapping Controller Error:', error);

    if (error instanceof DomainError) {
      switch (error.code) {
        case 'VALIDATION_ERROR':
          res.status(HttpStatusCode.BAD_REQUEST).json(
            ApiResponse.badRequest(error.message)
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
        case 'CONFLICT_ERROR':
          res.status(HttpStatusCode.CONFLICT).json(
            ApiResponse.conflict(error.message)
          );
          break;
        default:
          res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
            ApiResponse.internalServerError('An unexpected error occurred')
          );
      }
    } else {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
        ApiResponse.internalServerError('An unexpected error occurred')
      );
    }
  }
}
