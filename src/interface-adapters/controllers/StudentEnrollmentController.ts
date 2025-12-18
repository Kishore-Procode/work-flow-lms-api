/**
 * StudentEnrollmentController
 * 
 * Handles HTTP requests for student subject enrollment functionality.
 * Provides endpoints for:
 * - Getting current semester
 * - Viewing available subjects
 * - Enrolling in subjects
 * - Viewing enrolled subjects
 * - Accessing learning content
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { GetCurrentSemesterUseCase } from '../../application/use-cases/student-enrollment/GetCurrentSemesterUseCase';
import { GetAvailableSubjectsUseCase } from '../../application/use-cases/student-enrollment/GetAvailableSubjectsUseCase';
import { EnrollSubjectsUseCase } from '../../application/use-cases/student-enrollment/EnrollSubjectsUseCase';
import { GetEnrolledSubjectsUseCase } from '../../application/use-cases/student-enrollment/GetEnrolledSubjectsUseCase';
import { GetSubjectLearningContentUseCase } from '../../application/use-cases/student-enrollment/GetSubjectLearningContentUseCase';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';
import { DomainError } from '../../domain/errors/DomainError';

export class StudentEnrollmentController {
  constructor(
    private readonly getCurrentSemesterUseCase: GetCurrentSemesterUseCase,
    private readonly getAvailableSubjectsUseCase: GetAvailableSubjectsUseCase,
    private readonly enrollSubjectsUseCase: EnrollSubjectsUseCase,
    private readonly getEnrolledSubjectsUseCase: GetEnrolledSubjectsUseCase,
    private readonly getSubjectLearningContentUseCase: GetSubjectLearningContentUseCase
  ) {}

  /**
   * GET /api/v1/student-enrollment/current-semester
   * Get the current semester for the authenticated student
   */
  public getCurrentSemester = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can access this endpoint
      if (req.user.role !== 'student') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Student role required.')
        );
        return;
      }

      const request = {
        studentId: req.user.id,
      };

      const response = await this.getCurrentSemesterUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Current semester retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/student-enrollment/available-subjects
   * Get available subjects for a specific semester
   */
  public getAvailableSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can access this endpoint
      if (req.user.role !== 'student') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Student role required.')
        );
        return;
      }

      const semesterNumber = parseInt(req.query.semesterNumber as string, 10);

      if (!semesterNumber || isNaN(semesterNumber)) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Semester number is required')
        );
        return;
      }

      const request = {
        studentId: req.user.id,
        semesterNumber,
      };

      const response = await this.getAvailableSubjectsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Available subjects retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * POST /api/v1/student-enrollment/enroll
   * Enroll in subjects for a semester
   */
  public enrollSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can access this endpoint
      if (req.user.role !== 'student') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Student role required.')
        );
        return;
      }

      const { semesterNumber, academicYearId, subjectIds } = req.body;

      if (!semesterNumber || !academicYearId || !subjectIds || !Array.isArray(subjectIds)) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Semester number, academic year ID, and subject IDs are required')
        );
        return;
      }

      if (subjectIds.length === 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('At least one subject must be selected')
        );
        return;
      }

      const request = {
        studentId: req.user.id,
        semesterNumber,
        academicYearId,
        subjectIds,
      };

      const response = await this.enrollSubjectsUseCase.execute(request);

      res.status(HttpStatusCode.CREATED).json(
        ApiResponse.success(response.message, response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/student-enrollment/enrolled-subjects
   * Get all enrolled subjects for the authenticated student
   */
  public getEnrolledSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can access this endpoint
      if (req.user.role !== 'student') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Student role required.')
        );
        return;
      }

      const semesterNumber = req.query.semesterNumber ? parseInt(req.query.semesterNumber as string, 10) : undefined;
      const academicYearId = req.query.academicYearId as string | undefined;

      const request = {
        studentId: req.user.id,
        semesterNumber,
        academicYearId,
      };

      const response = await this.getEnrolledSubjectsUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Enrolled subjects retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * GET /api/v1/student-enrollment/learning-content/:enrollmentId
   * Get learning content for an enrolled subject
   */
  public getSubjectLearningContent = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.unauthorized('Authentication required')
        );
        return;
      }

      // Only students can access this endpoint
      if (req.user.role !== 'student') {
        res.status(HttpStatusCode.FORBIDDEN).json(
          ApiResponse.forbidden('Access denied. Student role required.')
        );
        return;
      }

      const { enrollmentId } = req.params;

      if (!enrollmentId) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.badRequest('Enrollment ID is required')
        );
        return;
      }

      const request = {
        studentId: req.user.id,
        enrollmentId,
      };

      const response = await this.getSubjectLearningContentUseCase.execute(request);

      res.status(HttpStatusCode.OK).json(
        ApiResponse.success('Learning content retrieved successfully', response)
      );
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Error handler
   */
  private handleError(error: any, res: Response): void {
    console.error('StudentEnrollmentController Error:', error);

    if (error instanceof DomainError) {
      res.status(HttpStatusCode.BAD_REQUEST).json(
        ApiResponse.error(error.message, error.message, 'DOMAIN_ERROR')
      );
      return;
    }

    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      ApiResponse.error('An unexpected error occurred', error.message, 'INTERNAL_ERROR')
    );
  }
}

