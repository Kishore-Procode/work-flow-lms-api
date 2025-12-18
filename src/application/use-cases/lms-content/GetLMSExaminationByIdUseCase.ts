import { LMSExaminationRepository, LMSExamination, LMSExaminationQuestion } from '../../../infrastructure/repositories/LMSExaminationRepository';

export class GetLMSExaminationByIdUseCase {
  constructor(private readonly examinationRepository: LMSExaminationRepository) {}

  async execute(examinationId: string): Promise<(LMSExamination & { questions: LMSExaminationQuestion[] }) | null> {
    if (!examinationId) {
      throw new Error('Examination ID is required');
    }

    return await this.examinationRepository.getExaminationById(examinationId);
  }
}

