import { LMSExaminationRepository, CreateLMSExaminationDTO, LMSExamination } from '../../../infrastructure/repositories/LMSExaminationRepository';

export class CreateLMSExaminationUseCase {
  constructor(private readonly examinationRepository: LMSExaminationRepository) {}

  async execute(data: CreateLMSExaminationDTO): Promise<LMSExamination> {
    // Validate required fields
    if (!data.contentMapSubDetailsId) {
      throw new Error('Subject ID is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Examination title is required');
    }

    // Create the examination
    return await this.examinationRepository.createExamination(data);
  }
}

