import { LMSQuizRepository, LMSQuiz } from '../../../infrastructure/repositories/LMSQuizRepository';

export class GetLMSQuizzesBySubjectUseCase {
  constructor(private readonly quizRepository: LMSQuizRepository) {}

  async execute(subjectId: string): Promise<LMSQuiz[]> {
    if (!subjectId) {
      throw new Error('Subject ID is required');
    }

    return await this.quizRepository.getQuizzesBySubject(subjectId);
  }
}

