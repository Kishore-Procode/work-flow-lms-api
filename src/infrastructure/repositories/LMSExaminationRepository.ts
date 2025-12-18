import { Pool } from 'pg';

export interface LMSExamination {
  id: string;
  contentMapSubDetailsId: string;
  title: string;
  instructions?: string;
  duration: number;
  totalPoints: number;
  passingPercentage: number;
  maxAttempts: number;
  showResults: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReview: boolean;
  isProctored: boolean;
  startDate?: Date;
  endDate?: Date;
  isRequired: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LMSExaminationQuestion {
  id: string;
  examinationId: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options?: any;
  correctAnswer?: any;
  explanation?: string;
  isRequired: boolean;
}

export interface CreateLMSExaminationDTO {
  contentMapSubDetailsId: string;
  title: string;
  instructions?: string;
  duration?: number;
  totalPoints?: number;
  passingPercentage?: number;
  maxAttempts?: number;
  showResults?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowReview?: boolean;
  isProctored?: boolean;
  startDate?: Date;
  endDate?: Date;
  isRequired?: boolean;
  createdBy?: string;
  questions?: Array<{
    questionText: string;
    questionType: string;
    points: number;
    orderIndex: number;
    options?: any;
    correctAnswer?: any;
    explanation?: string;
    isRequired?: boolean;
  }>;
}

export class LMSExaminationRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new LMS examination with questions
   */
  async createExamination(data: CreateLMSExaminationDTO): Promise<LMSExamination> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO lmsact');

      // Insert examination
      const examinationQuery = `
        INSERT INTO examinations (
          content_map_sub_details_id,
          title,
          instructions,
          duration,
          total_points,
          passing_percentage,
          max_attempts,
          show_results,
          shuffle_questions,
          shuffle_options,
          allow_review,
          is_proctored,
          start_date,
          end_date,
          is_required,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          instructions,
          duration,
          total_points as "totalPoints",
          passing_percentage as "passingPercentage",
          max_attempts as "maxAttempts",
          show_results as "showResults",
          shuffle_questions as "shuffleQuestions",
          shuffle_options as "shuffleOptions",
          allow_review as "allowReview",
          is_proctored as "isProctored",
          start_date as "startDate",
          end_date as "endDate",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const examinationValues = [
        data.contentMapSubDetailsId,
        data.title,
        data.instructions || null,
        data.duration || 60,
        data.totalPoints || 100,
        data.passingPercentage || 50,
        data.maxAttempts || 1,
        data.showResults ?? true,
        data.shuffleQuestions ?? false,
        data.shuffleOptions ?? false,
        data.allowReview ?? true,
        data.isProctored ?? false,
        data.startDate || null,
        data.endDate || null,
        data.isRequired ?? true,
        data.createdBy || null,
      ];

      const examinationResult = await client.query(examinationQuery, examinationValues);
      const examination = examinationResult.rows[0];

      // Insert questions if provided
      if (data.questions && data.questions.length > 0) {
        const questionQuery = `
          INSERT INTO examination_questions (
            examination_id,
            question_text,
            question_type,
            points,
            order_index,
            options,
            correct_answer,
            explanation,
            is_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const question of data.questions) {
          const questionValues = [
            examination.id,
            question.questionText,
            question.questionType,
            question.points,
            question.orderIndex,
            question.options ? JSON.stringify(question.options) : null,
            question.correctAnswer ? JSON.stringify(question.correctAnswer) : null,
            question.explanation || null,
            question.isRequired ?? true,
          ];

          await client.query(questionQuery, questionValues);
        }
      }

      await client.query('COMMIT');
      return examination;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating LMS examination:', error);
      throw new Error(`Failed to create LMS examination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get examination by ID with questions
   */
  async getExaminationById(id: string): Promise<(LMSExamination & { questions: LMSExaminationQuestion[] }) | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const examinationQuery = `
        SELECT
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          instructions,
          duration,
          total_points as "totalPoints",
          passing_percentage as "passingPercentage",
          max_attempts as "maxAttempts",
          show_results as "showResults",
          shuffle_questions as "shuffleQuestions",
          shuffle_options as "shuffleOptions",
          allow_review as "allowReview",
          is_proctored as "isProctored",
          start_date as "startDate",
          end_date as "endDate",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM examinations
        WHERE id = $1 AND is_active = true
      `;

      const examinationResult = await client.query(examinationQuery, [id]);
      
      if (examinationResult.rows.length === 0) {
        return null;
      }

      const examination = examinationResult.rows[0];

      // Get questions
      const questionsQuery = `
        SELECT 
          id,
          examination_id as "examinationId",
          question_text as "questionText",
          question_type as "questionType",
          points,
          order_index as "orderIndex",
          options,
          correct_answer as "correctAnswer",
          explanation,
          is_required as "isRequired"
        FROM examination_questions
        WHERE examination_id = $1
        ORDER BY order_index
      `;

      const questionsResult = await client.query(questionsQuery, [id]);

      return {
        ...examination,
        questions: questionsResult.rows,
      };
    } catch (error) {
      console.error('Error getting LMS examination:', error);
      throw new Error(`Failed to get LMS examination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get all examinations for a subject
   */
  async getExaminationsBySubject(subjectId: string): Promise<LMSExamination[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const query = `
        SELECT
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          instructions,
          duration,
          total_points as "totalPoints",
          passing_percentage as "passingPercentage",
          max_attempts as "maxAttempts",
          show_results as "showResults",
          shuffle_questions as "shuffleQuestions",
          shuffle_options as "shuffleOptions",
          allow_review as "allowReview",
          is_proctored as "isProctored",
          start_date as "startDate",
          end_date as "endDate",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM examinations
        WHERE content_map_sub_details_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [subjectId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting examinations by subject:', error);
      throw new Error(`Failed to get examinations by subject: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete examination (soft delete)
   */
  async deleteExamination(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const query = `
        UPDATE examinations
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await client.query(query, [id]);
    } catch (error) {
      console.error('Error deleting LMS examination:', error);
      throw new Error(`Failed to delete LMS examination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
}

