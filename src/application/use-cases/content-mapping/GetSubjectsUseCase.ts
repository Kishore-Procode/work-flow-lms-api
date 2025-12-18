/**
 * Get Subjects Use Case
 * 
 * Application layer use case for retrieving subjects for a specific semester
 * in the content mapping context. Used by the subject assignment popup.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { ContentMapSubDetails } from '../../../domain/entities/ContentMapSubDetails';
import { IContentMapSubDetailsRepository } from '../../../infrastructure/repositories/ContentMapSubDetailsRepository';
import { IContentMapSemDetailsRepository } from '../../../infrastructure/repositories/ContentMapSemDetailsRepository';
import { IContentMapMasterRepository } from '../../../infrastructure/repositories/ContentMapMasterRepository';
import { IACTSchemaRepository } from '../../../infrastructure/repositories/ACTSchemaRepository';
import { DomainError } from '../../../domain/errors/DomainError';

export interface GetSubjectsRequest {
  contentMapSemDetailsId: string;
  requestingUserId: string;
}

export interface SubjectDetail {
  id: string;
  actSubjectId: string;
  actSubjectCode: string;
  actSubjectName: string;
  actSubjectCredits: number;
  lmsLearningResourceId?: string;
  lmsLearningResourceTitle?: string;
  isMapped: boolean;
  mappedAt?: string;
  mappedBy?: string;
  status: string;
}

export interface GetSubjectsResponse {
  contentMapSemDetailsId: string;
  subjects: SubjectDetail[];
  totalSubjects: number;
  mappedSubjects: number;
  unmappedSubjects: number;
  mappingProgress: number;
}

export class GetSubjectsUseCase {
  constructor(
    private readonly contentMapSubDetailsRepository: IContentMapSubDetailsRepository,
    private readonly contentMapSemDetailsRepository: IContentMapSemDetailsRepository,
    private readonly contentMapMasterRepository: IContentMapMasterRepository,
    private readonly actSchemaRepository: IACTSchemaRepository
  ) {}

  async execute(request: GetSubjectsRequest): Promise<GetSubjectsResponse> {
    // Validate input
    this.validateRequest(request);

    // Step 1: Get semester details to find semester number and master ID
    const semesterDetails = await this.contentMapSemDetailsRepository.findById(
      request.contentMapSemDetailsId
    );

    if (!semesterDetails) {
      throw new DomainError('Semester details not found');
    }

    // Step 2: Get master record to find ACT department and regulation IDs
    const masterRecord = await this.contentMapMasterRepository.findById(
      semesterDetails.getContentMapMasterId()
    );

    if (!masterRecord) {
      throw new DomainError('Content mapping master record not found');
    }

    // Step 3: Fetch courses from ACT schema filtered by department and regulation
    // Only show subjects that belong to the mapped ACT department and regulation
    const actDepartmentId = masterRecord.getActDepartmentId();
    const actRegulationId = masterRecord.getActRegulationId();
    const semesterNumber = semesterDetails.getSemesterNumber();

    // Get subjects from workflowmgmt.semesters for this department/regulation/semester
    const actSubjects = await this.actSchemaRepository.getSubjectsByDepartmentRegulationSemester(
      actDepartmentId,
      actRegulationId,
      semesterNumber
    );

    if (actSubjects.length === 0) {
      throw new DomainError(
        `No courses found for ACT Department ${actDepartmentId}, Regulation ${actRegulationId}, Semester ${semesterNumber}. ` +
        `Please ensure subjects are configured in the ACT system for this combination.`
      );
    }

    // Step 4: Get existing mappings from content_map_sub_details (if any)
    // These are courses that have already been assigned to this semester
    const existingMappings = await this.contentMapSubDetailsRepository.findByContentMapSemDetailsId(
      request.contentMapSemDetailsId
    );

    // Create a map of ACT subject ID to mapping details
    const mappingMap = new Map<string, typeof existingMappings[0]>();
    existingMappings.forEach(mapping => {
      console.log('🔍 Mapping:', {
        id: mapping.getId(),
        actSubjectId: mapping.getActSubjectId(),
        actSubjectCode: mapping.getActSubjectCode(),
        actSubjectName: mapping.getActSubjectName()
      });
      mappingMap.set(mapping.getActSubjectId(), mapping);
    });
    console.log('🔍 Mapping map size:', mappingMap.size);
    console.log('🔍 Mapping map keys:', Array.from(mappingMap.keys()));

    // Step 5: Map ALL courses to response format, marking which ones are already assigned to this semester
    const subjects: SubjectDetail[] = actSubjects.map(actSubject => {
      console.log('🔍 Processing ACT subject:', {
        id: actSubject.id,
        code: actSubject.subjectCode,
        name: actSubject.subjectName,
        hasMapping: mappingMap.has(actSubject.id)
      });
      const existingMapping = mappingMap.get(actSubject.id);

      if (existingMapping) {
        // Course is already assigned to this semester (exists in content_map_sub_details)
        // For content creation, we consider a subject "assigned" if it exists in the table,
        // regardless of whether it has been mapped to a workflow session
        return {
          id: existingMapping.getId(),
          actSubjectId: actSubject.id,
          actSubjectCode: actSubject.subjectCode,
          actSubjectName: actSubject.subjectName,
          actSubjectCredits: actSubject.credits,
          lmsLearningResourceId: existingMapping.getLmsLearningResourceId(),
          lmsLearningResourceTitle: undefined, // Not used anymore
          isMapped: true, // Subject is assigned to this semester (exists in content_map_sub_details)
          mappedAt: existingMapping.getMappedAt()?.toISOString(),
          mappedBy: existingMapping.getMappedBy(),
          status: existingMapping.getStatus()
        };
      } else {
        // Course is not yet assigned to this semester
        return {
          id: '', // No mapping ID yet
          actSubjectId: actSubject.id,
          actSubjectCode: actSubject.subjectCode,
          actSubjectName: actSubject.subjectName,
          actSubjectCredits: actSubject.credits,
          lmsLearningResourceId: undefined, // Not used anymore
          lmsLearningResourceTitle: undefined, // Not used anymore
          isMapped: false, // Not yet assigned to this semester
          mappedAt: undefined,
          mappedBy: undefined,
          status: 'pending'
        };
      }
    });

    // Calculate statistics
    const totalSubjects = subjects.length;
    const mappedCount = subjects.filter(sub => sub.isMapped).length;
    const unmappedCount = totalSubjects - mappedCount;
    const mappingProgress = totalSubjects > 0 ? Math.round((mappedCount / totalSubjects) * 100) : 0;

    return {
      contentMapSemDetailsId: request.contentMapSemDetailsId,
      subjects,
      totalSubjects,
      mappedSubjects: mappedCount,
      unmappedSubjects: unmappedCount,
      mappingProgress
    };
  }

  private validateRequest(request: GetSubjectsRequest): void {
    if (!request.contentMapSemDetailsId) {
      throw new DomainError('Content map semester details ID is required');
    }

    if (!request.requestingUserId) {
      throw new DomainError('Requesting user ID is required');
    }
  }
}
