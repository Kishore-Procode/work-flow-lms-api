import { Pool } from 'pg';

export interface LMSQuiz {
  id: string;
  contentMapSubDetailsId: string;
  title: string;
  description?: string;
  instructions?: string;
  duration?: number;
  totalPoints: number;
  passingPercentage: number;
  maxAttempts: number;
  showResults: boolean;
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReview: boolean;
  isRequired: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  questions?: LMSQuizQuestion[];
}

export interface LMSQuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options?: any;
  correctAnswer?: any;
  explanation?: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLMSQuizDTO {
  contentMapSubDetailsId: string;
  title: string;
  description?: string;
  instructions?: string;
  duration?: number;
  totalPoints?: number;
  passingPercentage?: number;
  maxAttempts?: number;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowReview?: boolean;
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

export class LMSQuizRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new LMS quiz with questions
   */
  async createQuiz(data: CreateLMSQuizDTO): Promise<LMSQuiz> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO lmsact');

      // Insert quiz
      const quizQuery = `
        INSERT INTO quizzes (
          content_map_sub_details_id,
          title,
          description,
          instructions,
          duration,
          total_points,
          passing_percentage,
          max_attempts,
          show_results,
          show_correct_answers,
          shuffle_questions,
          shuffle_options,
          allow_review,
          is_required,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          description,
          instructions,
          duration,
          total_points as "totalPoints",
          passing_percentage as "passingPercentage",
          max_attempts as "maxAttempts",
          show_results as "showResults",
          show_correct_answers as "showCorrectAnswers",
          shuffle_questions as "shuffleQuestions",
          shuffle_options as "shuffleOptions",
          allow_review as "allowReview",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const quizValues = [
        data.contentMapSubDetailsId,
        data.title,
        data.description || null,
        data.instructions || null,
        data.duration || null,
        data.totalPoints || 100,
        data.passingPercentage || 50,
        data.maxAttempts || 3,
        data.showResults ?? true,
        data.showCorrectAnswers ?? true,
        data.shuffleQuestions ?? false,
        data.shuffleOptions ?? false,
        data.allowReview ?? true,
        data.isRequired ?? false,
        data.createdBy || null,
      ];

      const quizResult = await client.query(quizQuery, quizValues);
      const quiz = quizResult.rows[0];

      // Insert questions if provided
      if (data.questions && data.questions.length > 0) {
        const questionQuery = `
          INSERT INTO quiz_questions (
            quiz_id,
            question_text,
            question_type,
            points,
            order_index,
            options,
            correct_answer,
            explanation,
            is_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id,
            quiz_id as "quizId",
            question_text as "questionText",
            question_type as "questionType",
            points,
            order_index as "orderIndex",
            options,
            correct_answer as "correctAnswer",
            explanation,
            is_required as "isRequired",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `;

        const questions: LMSQuizQuestion[] = [];
        for (const question of data.questions) {
          const questionValues = [
            quiz.id,
            question.questionText,
            question.questionType,
            question.points,
            question.orderIndex,
            question.options ? JSON.stringify(question.options) : null,
            question.correctAnswer ? JSON.stringify(question.correctAnswer) : null,
            question.explanation || null,
            question.isRequired ?? true,
          ];

          const questionResult = await client.query(questionQuery, questionValues);
          questions.push(questionResult.rows[0]);
        }

        quiz.questions = questions;
      }

      await client.query('COMMIT');
      return quiz;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get quiz by ID with questions
   */
  async getQuizById(id: string): Promise<LMSQuiz | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const quizQuery = `
        SELECT 
          id,
          content_map_sub_details_id as "contentMapSubDetailsId",
          title,
          description,
          instructions,
          duration,
          total_points as "totalPoints",
          passing_percentage as "passingPercentage",
          max_attempts as "maxAttempts",
          show_results as "showResults",
          show_correct_answers as "showCorrectAnswers",
          shuffle_questions as "shuffleQuestions",
          shuffle_options as "shuffleOptions",
          allow_review as "allowReview",
          is_required as "isRequired",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM quizzes
        WHERE id = $1 AND is_active = true
      `;

      const quizResult = await client.query(quizQuery, [id]);
      
      if (quizResult.rows.length === 0) {
        return null;
      }

      const quiz = quizResult.rows[0];

      // Get questions
      const questionsQuery = `
        SELECT 
          id,
          quiz_id as "quizId",
          question_text as "questionText",
          question_type as "questionType",
          points,
          order_index as "orderIndex",
          options,
          correct_answer as "correctAnswer",
          explanation,
          is_required as "isRequired",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM quiz_questions
        WHERE quiz_id = $1
        ORDER BY order_index
      `;

      const questionsResult = await client.query(questionsQuery, [id]);
      quiz.questions = questionsResult.rows;

      return quiz;
    } finally {
      client.release();
    }
  }

  /**
   * Get all quizzes for a subject
   */
  async getQuizzesBySubject(subjectId: string): Promise<LMSQuiz[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SET search_path TO lmsact');

      const query = `
        SELECT 
          q.id,
          q.content_map_sub_details_id as "contentMapSubDetailsId",
          q.title,
          q.description,
          q.instructions,
          q.duration,
          q.total_points as "totalPoints",
          q.passing_percentage as "passingPercentage",
          q.max_attempts as "maxAttempts",
          q.show_results as "showResults",
          q.show_correct_answers as "showCorrectAnswers",
          q.shuffle_questions as "shuffleQuestions",
          q.shuffle_options as "shuffleOptions",
          q.allow_review as "allowReview",
          q.is_required as "isRequired",
          q.is_active as "isActive",
          q.created_by as "createdBy",
          q.created_at as "createdAt",
          q.updated_at as "updatedAt",
          COUNT(qq.id) as "questionCount"
        FROM quizzes q
        LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
        WHERE q.content_map_sub_details_id = $1 AND q.is_active = true
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `;

      const result = await client.query(query, [subjectId]);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

