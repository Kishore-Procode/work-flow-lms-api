/**
 * Assign Subjects Use Case
 * 
 * Application layer use case for assigning ACT courses to semesters.
 * Creates new records in content_map_sub_details for selected courses.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ContentMapSubDetails } from '../../../domain/entities/ContentMapSubDetails';
import { ContentMapSemDetails } from '../../../domain/entities/ContentMapSemDetails';
import { IContentMapSubDetailsRepository } from '../../../infrastructure/repositories/ContentMapSubDetailsRepository';
import { IContentMapSemDetailsRepository } from '../../../infrastructure/repositories/ContentMapSemDetailsRepository';
import { IACTSchemaRepository } from '../../../infrastructure/repositories/ACTSchemaRepository';
import { DomainError } from '../../../domain/errors/DomainError';

export interface SubjectAssignment {
  subjectId: string; // ACT course ID (can be integer or string)
  lmsLearningResourceId?: string; // Optional - not used in new workflow
}

export interface AssignSubjectsRequest {
  contentMapSemDetailsId: string;
  assignments: SubjectAssignment[];
  requestingUserId: string;
}

export interface AssignSubjectsResponse {
  contentMapSemDetailsId: string;
  assignedCount: number;
  totalSubjects: number;
  mappedSubjects: number;
  mappingProgress: number;
  message: string;
  assignedSubjects: {
    id: string;
    actSubjectCode: string;
    actSubjectName: string;
  }[];
}

export class AssignSubjectsUseCase {
  constructor(
    private readonly contentMapSubDetailsRepository: IContentMapSubDetailsRepository,
    private readonly contentMapSemDetailsRepository: IContentMapSemDetailsRepository,
    private readonly actSchemaRepository: IACTSchemaRepository
  ) {}

  async execute(request: AssignSubjectsRequest): Promise<AssignSubjectsResponse> {
    // Validate input
    this.validateRequest(request);

    // Get semester details
    const semesterDetails = await this.contentMapSemDetailsRepository.findById(request.contentMapSemDetailsId);
    if (!semesterDetails) {
      throw new DomainError('Semester details not found');
    }

    // Get ALL courses from ACT schema to validate the selected course IDs
    const allCourses = await this.actSchemaRepository.getAllCourses();
    const courseMap = new Map(allCourses.map(course => [course.id, course]));

    // Validate that all selected courses exist in ACT schema
    for (const assignment of request.assignments) {
      if (!courseMap.has(assignment.subjectId)) {
        throw new DomainError(`Course with ID ${assignment.subjectId} not found in ACT schema`);
      }
    }

    // Get existing subject details for this semester
    const existingSubjectDetails = await this.contentMapSubDetailsRepository.findByContentMapSemDetailsId(
      request.contentMapSemDetailsId
    );

    // Create a map of existing subject details by ACT subject ID
    const existingMap = new Map(existingSubjectDetails.map(sub => [sub.getActSubjectId(), sub]));

    // Prepare subjects to create/update
    const subjectsToCreate: ContentMapSubDetails[] = [];
    const subjectsToUpdate: ContentMapSubDetails[] = [];

    for (const assignment of request.assignments) {
      const course = courseMap.get(assignment.subjectId)!;
      const existingSubject = existingMap.get(assignment.subjectId);

      if (existingSubject) {
        // Subject already exists, just mark it as mapped
        if (!existingSubject.isMapped()) {
          existingSubject.mapToLearningResource(undefined, request.requestingUserId);
          subjectsToUpdate.push(existingSubject);
        }
      } else {
        // Create new subject detail record
        const newSubjectDetail = ContentMapSubDetails.create({
          contentMapSemDetailsId: request.contentMapSemDetailsId,
          actSubjectId: course.id,
          actSubjectCode: course.subjectCode,
          actSubjectName: course.subjectName,
          actSubjectCredits: course.credits
        });

        // Mark it as mapped (assigned to this semester)
        newSubjectDetail.mapToLearningResource(undefined, request.requestingUserId);

        subjectsToCreate.push(newSubjectDetail);
      }
    }

    // Use transaction to ensure data consistency
    console.log('🔍 DEBUG - Starting transaction...');
    const result = await this.contentMapSubDetailsRepository.withTransaction(async (subRepo) => {
      let createdSubjects: ContentMapSubDetails[] = [];
      let updatedSubjects: ContentMapSubDetails[] = [];

      // Create new subject details
      if (subjectsToCreate.length > 0) {
        console.log('🔍 DEBUG - Creating', subjectsToCreate.length, 'new subject details...');
        createdSubjects = await subRepo.bulkSave(subjectsToCreate);
        console.log('🔍 DEBUG - Created new subject details');
      }

      // Update existing subject details
      if (subjectsToUpdate.length > 0) {
        console.log('🔍 DEBUG - Updating', subjectsToUpdate.length, 'existing subject details...');
        updatedSubjects = await subRepo.bulkUpdate(subjectsToUpdate);
        console.log('🔍 DEBUG - Updated existing subject details');
      }

      // Calculate new mapping statistics
      console.log('🔍 DEBUG - Fetching all updated subjects...');
      const allUpdatedSubjects = await subRepo.findByContentMapSemDetailsId(request.contentMapSemDetailsId);
      console.log('🔍 DEBUG - Found', allUpdatedSubjects.length, 'subjects');
      const mappedCount = allUpdatedSubjects.filter(sub => sub.isMapped()).length;
      console.log('🔍 DEBUG - Mapped count:', mappedCount);

      // NOTE: We don't manually update semester details here because the database trigger
      // 'update_semester_mapping_stats' automatically updates the semester stats
      // whenever we INSERT/UPDATE/DELETE records in content_map_sub_details
      console.log('🔍 DEBUG - Skipping manual semester update (trigger will handle it)');

      return {
        createdSubjects,
        updatedSubjects,
        mappedCount,
        totalCount: allUpdatedSubjects.length
      };
    });

    console.log('🔍 DEBUG - Transaction complete, fetching updated semester details...');

    // Fetch the updated semester details (trigger has updated the stats)
    const updatedSemesterDetails = await this.contentMapSemDetailsRepository.findById(request.contentMapSemDetailsId);
    if (!updatedSemesterDetails) {
      throw new DomainError('Semester details not found after update');
    }
    console.log('🔍 DEBUG - Updated semester details fetched:', {
      totalSubjects: updatedSemesterDetails.getTotalSubjects(),
      mappedSubjects: updatedSemesterDetails.getMappedSubjects(),
      mappingProgress: updatedSemesterDetails.getMappingProgress()
    });

    // Build assignedSubjects array from created and updated subjects
    const assignedSubjects = [
      ...result.createdSubjects.map(sub => ({
        id: sub.getId(),
        actSubjectCode: sub.getActSubjectCode(),
        actSubjectName: sub.getActSubjectName()
      })),
      ...result.updatedSubjects.map(sub => ({
        id: sub.getId(),
        actSubjectCode: sub.getActSubjectCode(),
        actSubjectName: sub.getActSubjectName()
      }))
    ];

    // Prepare response
    const response: AssignSubjectsResponse = {
      contentMapSemDetailsId: request.contentMapSemDetailsId,
      assignedCount: request.assignments.length,
      totalSubjects: result.totalCount,
      mappedSubjects: result.mappedCount,
      mappingProgress: updatedSemesterDetails.getMappingProgress(),
      message: `Successfully assigned ${request.assignments.length} course(s) to this semester`,
      assignedSubjects
    };

    console.log('🔍 DEBUG - Response prepared:', JSON.stringify(response, null, 2));
    return response;
  }

  private validateRequest(request: AssignSubjectsRequest): void {
    if (!request.contentMapSemDetailsId) {
      throw new DomainError('Content map semester details ID is required');
    }

    if (!request.assignments || request.assignments.length === 0) {
      throw new DomainError('At least one course assignment is required');
    }

    if (!request.requestingUserId) {
      throw new DomainError('Requesting user ID is required');
    }

    // Validate each assignment
    for (const assignment of request.assignments) {
      if (!assignment.subjectId) {
        throw new DomainError('Course ID is required for each assignment');
      }
    }

    // Check for duplicate course assignments
    const subjectIds = request.assignments.map(a => a.subjectId);
    const uniqueSubjectIds = new Set(subjectIds);
    if (subjectIds.length !== uniqueSubjectIds.size) {
      throw new DomainError('Duplicate course assignments are not allowed');
    }
  }
}

