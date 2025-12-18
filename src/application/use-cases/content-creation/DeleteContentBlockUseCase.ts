import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * DeleteContentBlockUseCase
 *
 * Deletes a content block.
 * Used by HOD and Staff to remove course content.
 */

export interface DeleteContentBlockRequest {
  blockId: string;
  deletedBy: string; // User ID of deleter (HOD or Staff)
}

export interface DeleteContentBlockResponse {
  success: boolean;
  message: string;
}

export class DeleteContentBlockUseCase {
  constructor(private sessionRepository: IWorkflowSessionRepository) {}

  async execute(request: DeleteContentBlockRequest): Promise<DeleteContentBlockResponse> {
    try {
      // Step 1: Validate content block exists
      const existingBlock = await this.sessionRepository.getContentBlockById(request.blockId);
      if (!existingBlock) {
        throw DomainError.notFound('Content block');
      }

      // Step 2: Delete content block
      const deleted = await this.sessionRepository.deleteContentBlock(request.blockId);

      if (!deleted) {
        throw new DomainError('Failed to delete content block');
      }

      return {
        success: true,
        message: 'Content block deleted successfully',
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('DeleteContentBlockUseCase error:', error);
      throw new DomainError('Failed to delete content block');
    }
  }
}

