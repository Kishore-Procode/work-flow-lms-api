import { LMSAssignmentRepository, LMSAssignment } from '../../../infrastructure/repositories/LMSAssignmentRepository';

export class GetLMSAssignmentsBySubjectUseCase {
  constructor(private readonly assignmentRepository: LMSAssignmentRepository) {}

  async execute(subjectId: string): Promise<LMSAssignment[]> {
    if (!subjectId) {
      throw new Error('Subject ID is required');
    }

    return await this.assignmentRepository.getAssignmentsBySubject(subjectId);
  }
}

