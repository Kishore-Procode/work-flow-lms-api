import { LMSQuizRepository, LMSQuiz } from '../../../infrastructure/repositories/LMSQuizRepository';

export class GetLMSQuizByIdUseCase {
  constructor(private readonly quizRepository: LMSQuizRepository) {}

  async execute(quizId: string): Promise<LMSQuiz | null> {
    if (!quizId) {
      throw new Error('Quiz ID is required');
    }

    return await this.quizRepository.getQuizById(quizId);
  }
}

