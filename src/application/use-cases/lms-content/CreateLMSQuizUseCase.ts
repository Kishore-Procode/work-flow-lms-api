import { LMSQuizRepository, CreateLMSQuizDTO, LMSQuiz } from '../../../infrastructure/repositories/LMSQuizRepository';

export class CreateLMSQuizUseCase {
  constructor(private readonly quizRepository: LMSQuizRepository) {}

  async execute(data: CreateLMSQuizDTO): Promise<LMSQuiz> {
    // Validate required fields
    if (!data.contentMapSubDetailsId) {
      throw new Error('Subject ID is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Quiz title is required');
    }

    // Create the quiz
    return await this.quizRepository.createQuiz(data);
  }
}

