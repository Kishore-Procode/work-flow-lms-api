import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SubjectSessionMapping } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * MapSubjectToSessionUseCase
 *
 * Creates a mapping between an LMS subject and a Workflow session.
 * This is an admin/staff operation that enables Play Session for a subject.
 *
 * Process:
 * 1. Validate user has permission (admin/staff)
 * 2. Validate subject exists in LMS
 * 3. Validate session exists in Workflow
 * 4. Create mapping in subject_session_mapping table
 * 5. Return mapping details
 */

export interface MapSubjectToSessionRequest {
  contentMapSubDetailsId: string; // LMS subject ID
  workflowSessionId: string; // Workflow session ID
  createdBy: string; // User ID of admin/staff
  notes?: string;
}

export interface MapSubjectToSessionResponse {
  mapping: {
    id: string;
    contentMapSubDetailsId: string;
    workflowSessionId: string;
    subjectName: string;
    sessionTitle: string;
    createdAt: Date;
    createdBy: string;
    isActive: boolean;
    notes: string | null;
  };
}

export class MapSubjectToSessionUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: MapSubjectToSessionRequest): Promise<MapSubjectToSessionResponse> {
    // Validate input
    if (!request.contentMapSubDetailsId) {
      throw new DomainError('Subject ID is required');
    }
    if (!request.workflowSessionId) {
      throw new DomainError('Session ID is required');
    }
    if (!request.createdBy) {
      throw new DomainError('Created by user ID is required');
    }

    try {
      // Step 1: Validate subject exists
      const subject = await this.validateSubjectExists(request.contentMapSubDetailsId);

      // Step 2: Validate session exists
      const session = await this.sessionRepository.getSessionById(request.workflowSessionId);

      if (!session) {
        throw new DomainError('Workflow session not found');
      }

      if (!session.isActive) {
        throw new DomainError('Cannot map to an inactive session');
      }

      // Step 3: Check if mapping already exists
      const existingMappings = await this.sessionRepository.getMappingsBySubjectId(
        request.contentMapSubDetailsId
      );

      const activeMapping = existingMappings.find(m => m.isActive);
      if (activeMapping) {
        throw new DomainError('This subject is already mapped to a session. Please deactivate the existing mapping first.');
      }

      // Step 4: Create mapping
      const mappingData: Omit<SubjectSessionMapping, 'id' | 'createdAt'> = {
        contentMapSubDetailsId: request.contentMapSubDetailsId,
        workflowSessionId: request.workflowSessionId,
        createdBy: request.createdBy,
        isActive: true,
        notes: request.notes || null,
      };

      const createdMapping = await this.sessionRepository.createSubjectSessionMapping(mappingData);

      return {
        mapping: {
          id: createdMapping.id,
          contentMapSubDetailsId: createdMapping.contentMapSubDetailsId,
          workflowSessionId: createdMapping.workflowSessionId,
          subjectName: subject.subjectName,
          sessionTitle: session.title,
          createdAt: createdMapping.createdAt,
          createdBy: createdMapping.createdBy || '',
          isActive: createdMapping.isActive,
          notes: createdMapping.notes,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to map subject to session: ${error.message}`);
    }
  }

  /**
   * Validate that the subject exists in LMS
   */
  private async validateSubjectExists(subjectId: string): Promise<{ subjectName: string; subjectCode: string }> {
    try {
      const query = `
        SELECT
          id,
          act_subject_name as "subjectName",
          act_subject_code as "subjectCode"
        FROM lmsact.content_map_sub_details
        WHERE id = $1::uuid
      `;

      const result = await this.pool.query(query, [subjectId]);

      if (result.rows.length === 0) {
        throw new DomainError('Subject not found in LMS');
      }

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to validate subject: ${error.message}`);
    }
  }
}

