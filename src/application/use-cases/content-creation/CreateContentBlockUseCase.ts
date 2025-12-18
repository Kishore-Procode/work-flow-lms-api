import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * CreateContentBlockUseCase
 *
 * Creates a new content block (quiz, assignment, examination, video, text, etc.)
 * for a session. Used by HOD and Staff to create course content.
 *
 * Process:
 * 1. Validate session exists
 * 2. Validate content type
 * 3. Validate content data structure based on type
 * 4. Calculate order index (append to end or specific position)
 * 5. Create content block in workflowmgmt.session_content_blocks
 * 6. Return created content block
 */

export interface CreateContentBlockRequest {
  sessionId: string;
  type: string; // 'quiz', 'assignment', 'examination', 'video', 'text', 'pdf', etc.
  title: string;
  contentData: any; // Type-specific data (questions for quiz, instructions for assignment, etc.)
  orderIndex?: number; // Optional - if not provided, append to end
  isRequired?: boolean;
  estimatedTime?: string; // e.g., "30 minutes", "1 hour"
  isActive?: boolean;
  createdBy: string; // User ID of creator (HOD or Staff)
}

export interface CreateContentBlockResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    sessionId: string;
    type: string;
    title: string;
    contentData: any;
    orderIndex: number;
    isRequired: boolean;
    estimatedTime: string | null;
    isActive: boolean;
  };
}

export class CreateContentBlockUseCase {
  constructor(private sessionRepository: IWorkflowSessionRepository) {}

  async execute(request: CreateContentBlockRequest): Promise<CreateContentBlockResponse> {
    try {
      // Step 1: Validate session exists
      const session = await this.sessionRepository.getSessionById(request.sessionId);
      if (!session) {
        throw DomainError.notFound('Session');
      }

      // Step 2: Validate content type
      const validTypes = [
        'video', 'text', 'pdf', 'image', 'audio', 'code',
        'quiz', 'assignment', 'examination', 'interactive'
      ];
      if (!validTypes.includes(request.type)) {
        throw DomainError.validation(`Invalid content type: ${request.type}`);
      }

      // Step 3: Validate content data structure based on type
      this.validateContentData(request.type, request.contentData);

      // Step 4: Calculate order index
      let orderIndex = request.orderIndex;
      if (orderIndex === undefined) {
        // Get max order index and append to end
        const existingBlocks = await this.sessionRepository.getSessionContentBlocks(request.sessionId);
        orderIndex = existingBlocks.length > 0 
          ? Math.max(...existingBlocks.map(b => b.orderIndex)) + 1 
          : 0;
      }

      // Step 5: Create content block
      const contentBlock = await this.sessionRepository.createContentBlock({
        sessionId: request.sessionId,
        type: request.type,
        title: request.title,
        contentData: request.contentData,
        orderIndex,
        isRequired: request.isRequired ?? true,
        estimatedTime: request.estimatedTime ?? null,
        isActive: request.isActive ?? true,
      });

      return {
        success: true,
        message: 'Content block created successfully',
        data: {
          id: contentBlock.id,
          sessionId: contentBlock.sessionId,
          type: contentBlock.type,
          title: contentBlock.title,
          contentData: contentBlock.contentData,
          orderIndex: contentBlock.orderIndex,
          isRequired: contentBlock.isRequired,
          estimatedTime: contentBlock.estimatedTime,
          isActive: contentBlock.isActive,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('CreateContentBlockUseCase error:', error);
      throw new DomainError('Failed to create content block');
    }
  }

  /**
   * Validate content data structure based on content type
   */
  private validateContentData(type: string, contentData: any): void {
    if (!contentData) {
      throw DomainError.validation('Content data is required');
    }

    switch (type) {
      case 'quiz':
        this.validateQuizData(contentData);
        break;
      case 'assignment':
        this.validateAssignmentData(contentData);
        break;
      case 'examination':
        this.validateExaminationData(contentData);
        break;
      case 'video':
        this.validateVideoData(contentData);
        break;
      case 'text':
        this.validateTextData(contentData);
        break;
      case 'pdf':
        this.validatePDFData(contentData);
        break;
      // Add more validations as needed
    }
  }

  private validateQuizData(data: any): void {
    if (!data.instructions) {
      throw DomainError.validation('Quiz instructions are required');
    }
    if (data.passingScore === undefined || data.passingScore < 0 || data.passingScore > 100) {
      throw DomainError.validation('Quiz passing score must be between 0 and 100');
    }
    if (data.allowRetry === undefined) {
      throw DomainError.validation('Quiz allowRetry flag is required');
    }
  }

  private validateAssignmentData(data: any): void {
    if (!data.instructions) {
      throw DomainError.validation('Assignment instructions are required');
    }
    if (!data.submissionFormat || !['text', 'file', 'both'].includes(data.submissionFormat)) {
      throw DomainError.validation('Assignment submission format must be text, file, or both');
    }
    if (!data.maxPoints || data.maxPoints <= 0) {
      throw DomainError.validation('Assignment max points must be greater than 0');
    }
  }

  private validateExaminationData(data: any): void {
    if (!data.instructions) {
      throw DomainError.validation('Examination instructions are required');
    }
    if (!data.timeLimit || data.timeLimit <= 0) {
      throw DomainError.validation('Examination time limit is required and must be greater than 0');
    }
    if (data.passingScore === undefined || data.passingScore < 0 || data.passingScore > 100) {
      throw DomainError.validation('Examination passing score must be between 0 and 100');
    }
  }

  private validateVideoData(data: any): void {
    if (!data.url) {
      throw DomainError.validation('Video URL is required');
    }
  }

  private validateTextData(data: any): void {
    if (!data.content) {
      throw DomainError.validation('Text content is required');
    }
    if (!data.format || !['html', 'markdown'].includes(data.format)) {
      throw DomainError.validation('Text format must be html or markdown');
    }
  }

  private validatePDFData(data: any): void {
    if (!data.url) {
      throw DomainError.validation('PDF URL is required');
    }
  }
}

