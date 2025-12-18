/**
 * Load Semesters Use Case
 * 
 * Application layer use case for loading semesters from ACT schema
 * and creating content mapping configuration. Handles the "Load" button
 * functionality in the LMS Content Mapping screen.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ContentMapMaster, CourseTypeMapping } from '../../../domain/entities/ContentMapMaster';
import { ContentMapSemDetails } from '../../../domain/entities/ContentMapSemDetails';
import { IContentMapMasterRepository } from '../../../infrastructure/repositories/ContentMapMasterRepository';
import { IContentMapSemDetailsRepository } from '../../../infrastructure/repositories/ContentMapSemDetailsRepository';
import { DomainError } from '../../../domain/errors/DomainError';

export interface LoadSemestersRequest {
  courseType: CourseTypeMapping;
  lmsCourseId: string;
  lmsDepartmentId: string;
  lmsAcademicYearId: string;
  actDepartmentId: string;
  actRegulationId: string;
  requestingUserId: string;
}

export interface LoadSemestersResponse {
  contentMapMasterId: string;
  semesters: {
    id: string;
    semesterNumber: number;
    semesterName: string;
    totalSubjects: number;
    mappedSubjects: number;
    mappingProgress: number;
    status: string;
  }[];
  message: string;
}

export class LoadSemestersUseCase {
  // Default semester counts by course type
  private readonly SEMESTER_COUNTS: Record<CourseTypeMapping, number> = {
    'Diploma': 6,
    'UG': 8,
    'PG': 4,
    'Certificate': 2
  };

  constructor(
    private readonly contentMapMasterRepository: IContentMapMasterRepository,
    private readonly contentMapSemDetailsRepository: IContentMapSemDetailsRepository
  ) {}

  async execute(request: LoadSemestersRequest): Promise<LoadSemestersResponse> {
    // Validate input
    this.validateRequest(request);

    // Check if mapping already exists
    const existingMapping = await this.contentMapMasterRepository.findExistingMapping(
      request.courseType,
      request.lmsCourseId,
      request.lmsDepartmentId,
      request.lmsAcademicYearId,
      request.actDepartmentId,
      request.actRegulationId
    );

    let contentMapMaster: ContentMapMaster;

    if (existingMapping) {
      // Use existing mapping
      contentMapMaster = existingMapping;
    } else {
      // Create new mapping
      contentMapMaster = ContentMapMaster.create({
        courseType: request.courseType,
        lmsCourseId: request.lmsCourseId,
        lmsDepartmentId: request.lmsDepartmentId,
        lmsAcademicYearId: request.lmsAcademicYearId,
        actDepartmentId: request.actDepartmentId,
        actRegulationId: request.actRegulationId,
        createdBy: request.requestingUserId
      });

      // Save the new mapping
      contentMapMaster = await this.contentMapMasterRepository.save(contentMapMaster);
    }

    // Create default semesters based on course type
    const semesterCount = this.SEMESTER_COUNTS[request.courseType];
    if (!semesterCount) {
      throw new DomainError(`Invalid course type: ${request.courseType}`);
    }

    // Process semesters (create default semesters)
    const semesterDetails = await this.createDefaultSemesters(
      contentMapMaster.getId(),
      semesterCount,
      request.courseType
    );

    // Prepare response
    const response: LoadSemestersResponse = {
      contentMapMasterId: contentMapMaster.getId(),
      semesters: semesterDetails.map(sem => ({
        id: sem.getId(),
        semesterNumber: sem.getSemesterNumber(),
        semesterName: sem.getSemesterName(),
        totalSubjects: sem.getTotalSubjects(),
        mappedSubjects: sem.getMappedSubjects(),
        mappingProgress: sem.getMappingProgress(),
        status: sem.getStatus()
      })),
      message: existingMapping 
        ? 'Loaded existing content mapping configuration'
        : 'Created new content mapping configuration'
    };

    return response;
  }

  private validateRequest(request: LoadSemestersRequest): void {
    if (!request.courseType) {
      throw new DomainError('Course type is required');
    }

    if (!request.lmsCourseId) {
      throw new DomainError('LMS course ID is required');
    }

    if (!request.lmsDepartmentId) {
      throw new DomainError('LMS department ID is required');
    }

    if (!request.lmsAcademicYearId) {
      throw new DomainError('LMS academic year ID is required');
    }

    if (!request.actDepartmentId) {
      throw new DomainError('ACT department ID is required');
    }

    if (!request.actRegulationId) {
      throw new DomainError('ACT regulation ID is required');
    }

    if (!request.requestingUserId) {
      throw new DomainError('Requesting user ID is required');
    }
  }

  /**
   * Create default semesters based on course type
   * Diploma = 6 semesters, UG = 8 semesters, PG = 4 semesters, Certificate = 2 semesters
   */
  private async createDefaultSemesters(
    contentMapMasterId: string,
    semesterCount: number,
    courseType: CourseTypeMapping
  ): Promise<ContentMapSemDetails[]> {
    const semesterDetails: ContentMapSemDetails[] = [];

    // Check if semester details already exist
    const existingSemesterDetails = await this.contentMapSemDetailsRepository.findByContentMapMasterId(contentMapMasterId);
    const existingSemesterMap = new Map(existingSemesterDetails.map(sem => [sem.getSemesterNumber(), sem]));

    // Create semesters based on count
    for (let i = 1; i <= semesterCount; i++) {
      let semesterDetail = existingSemesterMap.get(i);

      if (!semesterDetail) {
        // Create new semester detail with default name
        const semesterName = this.generateSemesterName(i, courseType);

        semesterDetail = ContentMapSemDetails.create({
          contentMapMasterId,
          semesterNumber: i,
          semesterName,
          totalSubjects: 0 // Initially 0, will be updated when subjects are assigned
        });

        // Save semester detail
        semesterDetail = await this.contentMapSemDetailsRepository.save(semesterDetail);
      }

      semesterDetails.push(semesterDetail);
    }

    return semesterDetails;
  }

  /**
   * Generate semester name based on semester number
   * Examples: "Semester 1", "Semester 2", etc.
   */
  private generateSemesterName(semesterNumber: number, _courseType: CourseTypeMapping): string {
    return `Semester ${semesterNumber}`;
  }
}
