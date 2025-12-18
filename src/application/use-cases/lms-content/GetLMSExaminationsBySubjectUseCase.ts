import { LMSExaminationRepository, LMSExamination } from '../../../infrastructure/repositories/LMSExaminationRepository';

export class GetLMSExaminationsBySubjectUseCase {
  constructor(private readonly examinationRepository: LMSExaminationRepository) {}

  async execute(subjectId: string): Promise<LMSExamination[]> {
    if (!subjectId) {
      throw new Error('Subject ID is required');
    }

    return await this.examinationRepository.getExaminationsBySubject(subjectId);
  }
}

