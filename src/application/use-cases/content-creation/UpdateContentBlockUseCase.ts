import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * UpdateContentBlockUseCase
 *
 * Updates an existing content block.
 * Used by HOD and Staff to modify course content.
 */

export interface UpdateContentBlockRequest {
  blockId: string;
  title?: string;
  contentData?: any;
  orderIndex?: number;
  isRequired?: boolean;
  estimatedTime?: string;
  isActive?: boolean;
  updatedBy: string; // User ID of updater (HOD or Staff)
}

export interface UpdateContentBlockResponse {
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

export class UpdateContentBlockUseCase {
  constructor(private sessionRepository: IWorkflowSessionRepository) {}

  async execute(request: UpdateContentBlockRequest): Promise<UpdateContentBlockResponse> {
    try {
      // Step 1: Validate content block exists
      const existingBlock = await this.sessionRepository.getContentBlockById(request.blockId);
      if (!existingBlock) {
        throw DomainError.notFound('Content block');
      }

      // Step 2: Prepare updates
      const updates: any = {};
      if (request.title !== undefined) updates.title = request.title;
      if (request.contentData !== undefined) updates.contentData = request.contentData;
      if (request.orderIndex !== undefined) updates.orderIndex = request.orderIndex;
      if (request.isRequired !== undefined) updates.isRequired = request.isRequired;
      if (request.estimatedTime !== undefined) updates.estimatedTime = request.estimatedTime;
      if (request.isActive !== undefined) updates.isActive = request.isActive;

      // Step 3: Update content block
      const updatedBlock = await this.sessionRepository.updateContentBlock(request.blockId, updates);

      if (!updatedBlock) {
        throw new DomainError('Failed to update content block');
      }

      return {
        success: true,
        message: 'Content block updated successfully',
        data: {
          id: updatedBlock.id,
          sessionId: updatedBlock.sessionId,
          type: updatedBlock.type,
          title: updatedBlock.title,
          contentData: updatedBlock.contentData,
          orderIndex: updatedBlock.orderIndex,
          isRequired: updatedBlock.isRequired,
          estimatedTime: updatedBlock.estimatedTime,
          isActive: updatedBlock.isActive,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      console.error('UpdateContentBlockUseCase error:', error);
      throw new DomainError('Failed to update content block');
    }
  }
}

