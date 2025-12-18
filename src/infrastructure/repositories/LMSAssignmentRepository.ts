import { Pool } from 'pg';

export interface LMSAssignment {
  id: string;
  contentMapSubDetailsId: string;
  title: string;
  description?: string;
  instructions?: string;
  submissionFormat: string;
  maxPoints: number;
  dueDate?: Date;
  allowLateSubmission: boolean;
  rubric?: any;
  estimatedTime?: number;
  isRequired: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LMSAssignmentQuestion {
  id: string;
  assignmentId: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options?: any;
  correctAnswer?: any;
  rubric?: any;
  isRequired: boolean;
}

export interface CreateLMSAssignmentDTO {
  contentMapSubDetailsId: string;
  title: string;
  description?: string;
  instructions?: string;
  submissionFormat?: string;
  maxPoints?: number;
  dueDate?: Date;
  allowLateSubmission?: boolean;
  rubric?: any;
  estimatedTime?: number;
  isRequired?: boolean;
  createdBy?: string;
  questions?: Array<{
    questionText: string;
    questionType: string;
    points: number;
    orderIndex: number;
    options?: any;
    correctAnswer?: any;
    rubric?: any;
    isRequired?: boolean;
  }>;
}

export class LMSAssignmentRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new LMS assignment with questions
   */
  async createAssignment(data: CreateLMSAssignmentDTO): Promise<LMSAssignment> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO lmsact');

      // Insert assignment
      const assignmentQuery = `
        INSERT INTO assignments (
          content_map_sub_details_id,
          title,
          description,
          instructions,
          submission_format,
          max_points,
          due_date,
          allow_late_submission,
          rubric,
          estimated_time,
          is_required,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          description,
          instructions,
          submission_format as "submissionFormat",
          max_points as "maxPoints",
          due_date as "dueDate",
          allow_late_submission as "allowLateSubmission",
          rubric,
          estimated_time as "estimatedTime",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const assignmentValues = [
        data.contentMapSubDetailsId,
        data.title,
        data.description || null,
        data.instructions || null,
        data.submissionFormat || 'text',
        data.maxPoints || 100,
        data.dueDate || null,
        data.allowLateSubmission ?? false,
        data.rubric ? JSON.stringify(data.rubric) : null,
        data.estimatedTime || null,
        data.isRequired ?? true,
        data.createdBy || null,
      ];

      const assignmentResult = await client.query(assignmentQuery, assignmentValues);
      const assignment = assignmentResult.rows[0];

      // Insert questions if provided
      if (data.questions && data.questions.length > 0) {
        const questionQuery = `
          INSERT INTO assignment_questions (
            assignment_id,
            question_text,
            question_type,
            points,
            order_index,
            options,
            correct_answer,
            rubric,
            is_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const question of data.questions) {
          const questionValues = [
            assignment.id,
            question.questionText,
            question.questionType,
            question.points,
            question.orderIndex,
            question.options ? JSON.stringify(question.options) : null,
            question.correctAnswer ? JSON.stringify(question.correctAnswer) : null,
            question.rubric ? JSON.stringify(question.rubric) : null,
            question.isRequired ?? true,
          ];

          await client.query(questionQuery, questionValues);
        }
      }

      await client.query('COMMIT');
      return assignment;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating LMS assignment:', error);
      throw new Error(`Failed to create LMS assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get assignment by ID with questions
   */
  async getAssignmentById(id: string): Promise<(LMSAssignment & { questions: LMSAssignmentQuestion[] }) | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const assignmentQuery = `
        SELECT 
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          description,
          instructions,
          submission_format as "submissionFormat",
          max_points as "maxPoints",
          due_date as "dueDate",
          allow_late_submission as "allowLateSubmission",
          rubric,
          estimated_time as "estimatedTime",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM assignments
        WHERE id = $1 AND is_active = true
      `;

      const assignmentResult = await client.query(assignmentQuery, [id]);
      
      if (assignmentResult.rows.length === 0) {
        return null;
      }

      const assignment = assignmentResult.rows[0];

      // Get questions
      const questionsQuery = `
        SELECT 
          id,
          assignment_id as "assignmentId",
          question_text as "questionText",
          question_type as "questionType",
          points,
          order_index as "orderIndex",
          options,
          correct_answer as "correctAnswer",
          rubric,
          is_required as "isRequired"
        FROM assignment_questions
        WHERE assignment_id = $1
        ORDER BY order_index
      `;

      const questionsResult = await client.query(questionsQuery, [id]);

      return {
        ...assignment,
        questions: questionsResult.rows,
      };
    } catch (error) {
      console.error('Error getting LMS assignment:', error);
      throw new Error(`Failed to get LMS assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get all assignments for a subject
   */
  async getAssignmentsBySubject(subjectId: string): Promise<LMSAssignment[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const query = `
        SELECT 
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          description,
          instructions,
          submission_format as "submissionFormat",
          max_points as "maxPoints",
          due_date as "dueDate",
          allow_late_submission as "allowLateSubmission",
          rubric,
          estimated_time as "estimatedTime",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM assignments
        WHERE content_map_sub_details_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [subjectId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting assignments by subject:', error);
      throw new Error(`Failed to get assignments by subject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete assignment (soft delete)
   */
  async deleteAssignment(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const query = `
        UPDATE assignments
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await client.query(query, [id]);
    } catch (error) {
      console.error('Error deleting LMS assignment:', error);
      throw new Error(`Failed to delete LMS assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
}

