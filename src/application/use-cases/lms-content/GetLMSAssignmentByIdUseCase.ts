import { LMSAssignmentRepository, LMSAssignment, LMSAssignmentQuestion } from '../../../infrastructure/repositories/LMSAssignmentRepository';

export class GetLMSAssignmentByIdUseCase {
  constructor(private readonly assignmentRepository: LMSAssignmentRepository) {}

  async execute(assignmentId: string): Promise<(LMSAssignment & { questions: LMSAssignmentQuestion[] }) | null> {
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }

    return await this.assignmentRepository.getAssignmentById(assignmentId);
  }
}

