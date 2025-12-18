import { Pool } from 'pg';

export interface GetCourseCompletionRequest {
  contentMapSubDetailsId: string; // Subject ID
  userId: string;
}

export interface GetCourseCompletionResponse {
  success: boolean;
  data: {
    completionPercentage: number;
    totalContentBlocks: number;
    completedContentBlocks: number;
    isFullyCompleted: boolean;
  };
}

export class GetCourseCompletionUseCase {
  constructor(private pool: Pool) {}

  async execute(request: GetCourseCompletionRequest): Promise<GetCourseCompletionResponse> {
    try {
      console.log('🔍 GetCourseCompletionUseCase - Request:', request);

      // Step 1: Get all workflow sessions mapped to this subject
      const sessionMappingQuery = `
        SELECT workflow_session_id
        FROM lmsact.subject_session_mapping
        WHERE content_map_sub_details_id = $1
      `;
      const sessionMappingResult = await this.pool.query(sessionMappingQuery, [request.contentMapSubDetailsId]);
      console.log(`📊 Found ${sessionMappingResult.rows.length} sessions mapped to subject ${request.contentMapSubDetailsId}`);

      if (sessionMappingResult.rows.length === 0) {
        // No sessions mapped to this subject
        console.log('⚠️ No sessions mapped to this subject');
        return {
          success: true,
          data: {
            completionPercentage: 0,
            totalContentBlocks: 0,
            completedContentBlocks: 0,
            isFullyCompleted: false
          }
        };
      }

      const sessionIds = sessionMappingResult.rows.map(row => row.workflow_session_id);
      console.log('📝 Session IDs:', sessionIds);

      // Step 2: Get all content blocks for these sessions
      const contentBlocksQuery = `
        SELECT id
        FROM workflowmgmt.session_content_blocks
        WHERE session_id = ANY($1::uuid[])
          AND is_active = true
      `;
      const contentBlocksResult = await this.pool.query(contentBlocksQuery, [sessionIds]);
      const totalContentBlocks = contentBlocksResult.rows.length;
      console.log(`📚 Found ${totalContentBlocks} total content blocks`);

      if (totalContentBlocks === 0) {
        console.log('⚠️ No content blocks found for these sessions');
        return {
          success: true,
          data: {
            completionPercentage: 0,
            totalContentBlocks: 0,
            completedContentBlocks: 0,
            isFullyCompleted: false
          }
        };
      }

      const contentBlockIds = contentBlocksResult.rows.map(row => row.id);

      // Step 3: Get completed content blocks for this user
      const progressQuery = `
        SELECT COUNT(*) as completed_count
        FROM workflowmgmt.session_content_progress
        WHERE content_block_id = ANY($1::uuid[])
          AND user_id = $2
          AND is_completed = true
      `;
      const progressResult = await this.pool.query(progressQuery, [contentBlockIds, request.userId]);
      const completedContentBlocks = parseInt(progressResult.rows[0].completed_count);
      console.log(`✅ User ${request.userId} completed ${completedContentBlocks} out of ${totalContentBlocks} blocks`);

      // Step 4: Calculate completion percentage
      const completionPercentage = (completedContentBlocks / totalContentBlocks) * 100;
      const isFullyCompleted = completionPercentage >= 100;
      console.log(`📊 Completion: ${completionPercentage.toFixed(2)}% - Fully Completed: ${isFullyCompleted}`);

      return {
        success: true,
        data: {
          completionPercentage: Math.round(completionPercentage * 100) / 100, // Round to 2 decimal places
          totalContentBlocks,
          completedContentBlocks,
          isFullyCompleted
        }
      };
    } catch (error: any) {
      console.error('❌ Error getting course completion:', error);
      throw new Error(error.message || 'Failed to get course completion');
    }
  }
}

