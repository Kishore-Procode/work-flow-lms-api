import { LMSAssignmentRepository, CreateLMSAssignmentDTO, LMSAssignment } from '../../../infrastructure/repositories/LMSAssignmentRepository';

export class CreateLMSAssignmentUseCase {
  constructor(private readonly assignmentRepository: LMSAssignmentRepository) {}

  async execute(data: CreateLMSAssignmentDTO): Promise<LMSAssignment> {
    // Validate required fields
    if (!data.contentMapSubDetailsId) {
      throw new Error('Subject ID is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Assignment title is required');
    }

    // Create the assignment
    return await this.assignmentRepository.createAssignment(data);
  }
}

