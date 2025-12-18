import { Request, Response } from 'express';
import { SubmitExaminationUseCase } from '../../application/use-cases/examination/SubmitExaminationUseCase';
import { GradeExaminationManuallyUseCase } from '../../application/use-cases/examination/GradeExaminationManuallyUseCase';
import { IWorkflowSessionRepository } from '../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * ExaminationController
 *
 * Handles HTTP requests for examination submission and grading.
 */
export class ExaminationController {
  constructor(
    private sessionRepository: IWorkflowSessionRepository,
    private pool: Pool
  ) {}

  /**
   * POST /api/v1/examinations/submit
   * Submit examination answers (student)
   */
  public submitExamination = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📝 Student submitting examination:', req.user?.id);
      console.log('📋 Content block ID:', req.body.contentBlockId);
      console.log('✏️ Answers count:', req.body.answers?.length || 0);
      
      const useCase = new SubmitExaminationUseCase(this.sessionRepository, this.pool);
      const result = await useCase.execute({
        ...req.body,
        userId: req.user?.id,
      });

      console.log('✅ Examination submitted successfully. Manual grading pending:', result.data.manualGradingPending);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('❌ ExaminationController.submitExamination error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit examination',
        error: error.message
      });
    }
  };

  /**
   * POST /api/v1/examinations/:attemptId/grade
   * Grade examination manually (staff)
   */
  public gradeExamination = async (req: Request, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      console.log('✍️ Grading examination attempt:', attemptId, 'by staff:', req.user?.id);
      console.log('📊 Manual grades received:', req.body.manualGrades?.length || 0, 'questions');
      
      const useCase = new GradeExaminationManuallyUseCase(this.sessionRepository, this.pool);
      const result = await useCase.execute({
        attemptId,
        gradedBy: req.user?.id!,
        manualGrades: req.body.manualGrades,
      });

      console.log('✅ Examination graded successfully:', attemptId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ ExaminationController.gradeExamination error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to grade examination',
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/examinations/attempts/:attemptId
   * Get examination attempt details
   */
  public getExaminationAttempt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { attemptId } = req.params;
      console.log('📝 Fetching examination attempt details:', attemptId);

      const query = `
        SELECT 
          sea.id::text,
          sea.content_block_id::text as "contentBlockId",
          sea.user_id::text as "userId",
          sea.answers,
          sea.auto_graded_score as "autoGradedScore",
          sea.auto_graded_max_score as "autoGradedMaxScore",
          sea.manual_graded_score as "manualGradedScore",
          sea.manual_graded_max_score as "manualGradedMaxScore",
          sea.total_score as "totalScore",
          sea.percentage,
          sea.is_passed as "isPassed",
          sea.time_spent as "timeSpent",
          sea.status,
          sea.graded_by::text as "gradedBy",
          sea.graded_at as "gradedAt",
          sea.completed_at as "completedAt",
          sea.created_at as "createdAt",
          scb.title as "examinationTitle",
          scb.content_data as "contentData",
          u.name as "studentName",
          u.email as "studentEmail"
        FROM lmsact.session_examination_attempts sea
        INNER JOIN workflowmgmt.session_content_blocks scb ON sea.content_block_id = scb.id
        INNER JOIN lmsact.users u ON sea.user_id = u.id
        WHERE sea.id = $1::uuid
      `;

      const result = await this.pool.query(query, [attemptId]);

      if (result.rows.length === 0) {
        console.log('❌ Examination attempt not found:', attemptId);
        res.status(404).json({
          success: false,
          message: 'Examination attempt not found',
        });
        return;
      }

      const attempt = result.rows[0];

      // Get quiz questions for this examination
      const questions = await this.sessionRepository.getQuizQuestionsByBlockId(attempt.contentBlockId);

      // Merge questions with student answers
      const questionsWithAnswers = questions.map((question: any) => {
        const answerData = Array.isArray(attempt.answers)
          ? attempt.answers.find((a: any) => a.questionId === question.id)
          : null;

        return {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          points: question.points,
          studentAnswer: answerData?.studentAnswer || null,
          isCorrect: answerData?.isCorrect || false,
          pointsAwarded: answerData?.pointsAwarded || 0,
          requiresManualGrading: answerData?.requiresManualGrading || false,
        };
      });

      console.log(`✅ Retrieved examination attempt with ${questionsWithAnswers.length} questions`);

      res.status(200).json({
        success: true,
        message: 'Examination attempt retrieved successfully',
        data: {
          ...attempt,
          questions: questionsWithAnswers,
          passingScore: attempt.contentData?.passingScore || 50,
        },
      });
    } catch (error: any) {
      console.error('❌ ExaminationController.getExaminationAttempt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get examination attempt',
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/examinations/pending-grading
   * Get examinations pending manual grading (staff)
   */
  public getPendingGrading = async (req: Request, res: Response): Promise<void> => {
    try {
      const staffId = req.user?.id;
      console.log('📋 Fetching pending examinations for staff:', staffId);

      // Get examinations pending grading for subjects assigned to this staff
      const query = `
        SELECT 
          sea.id::text,
          sea.content_block_id::text as "contentBlockId",
          sea.user_id::text as "userId",
          sea.auto_graded_score as "autoGradedScore",
          sea.auto_graded_max_score as "autoGradedMaxScore",
          sea.manual_graded_max_score as "manualGradedMaxScore",
          sea.created_at as "submittedAt",
          scb.title as "examinationTitle",
          u.name as "studentName",
          u.email as "studentEmail",
          u.roll_number as "rollNumber",
          csub.id::text as "subjectId",
          csub.act_subject_name as "subjectName"
        FROM lmsact.session_examination_attempts sea
        INNER JOIN workflowmgmt.session_content_blocks scb ON sea.content_block_id = scb.id
        INNER JOIN lmsact.users u ON sea.user_id = u.id
        INNER JOIN lmsact.subject_session_mapping ssm ON scb.session_id = ssm.workflow_session_id
        INNER JOIN lmsact.content_map_sub_details csub ON ssm.content_map_sub_details_id = csub.id
        INNER JOIN lmsact.subject_staff_assignments ssa ON csub.id = ssa.content_map_sub_details_id
        WHERE sea.status = 'auto_graded'
          AND ssa.staff_id = $1::uuid
          AND ssa.is_active = true
          AND ssm.is_active = true
        ORDER BY sea.created_at ASC
      `;

      const result = await this.pool.query(query, [staffId]);
      console.log(`✅ Found ${result.rows.length} pending examinations for grading`);

      res.status(200).json({
        success: true,
        message: 'Pending examinations retrieved successfully',
        data: {
          examinations: result.rows,
          totalPending: result.rows.length,
        },
      });
    } catch (error: any) {
      console.error('❌ ExaminationController.getPendingGrading error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending examinations',
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/examinations/student/:userId
   * Get all examinations for a student
   */
  public getStudentExaminations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Get all examinations for enrolled subjects
      const query = `
        SELECT 
          scb.id::text as "contentBlockId",
          scb.title,
          scb.content_data as "contentData",
          scb.session_id::text as "sessionId",
          cms.subject_id::text as "subjectId",
          c.name as "subjectName",
          sea.id::text as "attemptId",
          sea.status,
          sea.total_score as "totalScore",
          sea.percentage,
          sea.is_passed as "isPassed",
          sea.completed_at as "completedAt",
          CASE 
            WHEN sea.id IS NOT NULL THEN true
            ELSE false
          END as "hasAttempted",
          CASE
            WHEN COUNT(*) FILTER (WHERE scp.is_completed = true) = COUNT(*) FILTER (WHERE scb2.is_required = true AND scb2.type != 'examination')
            THEN true
            ELSE false
          END as "isUnlocked"
        FROM workflowmgmt.session_content_blocks scb
        JOIN workflowmgmt.sessions s ON scb.session_id = s.id
        JOIN lmsact.content_map_sub_details cms ON s.id = cms.session_id
        JOIN workflowmgmt.courses c ON cms.subject_id = c.id
        JOIN lmsact.student_enrollments se ON cms.subject_id = se.subject_id
        LEFT JOIN lmsact.session_examination_attempts sea ON scb.id = sea.content_block_id AND sea.user_id = $1::uuid
        LEFT JOIN workflowmgmt.session_content_blocks scb2 ON scb2.session_id = s.id AND scb2.is_active = true
        LEFT JOIN workflowmgmt.session_content_progress scp ON scb2.id = scp.content_block_id AND scp.user_id = $1::uuid
        WHERE scb.type = 'examination'
          AND scb.is_active = true
          AND se.user_id = $1::uuid
          AND se.status = 'active'
        GROUP BY scb.id, scb.title, scb.content_data, scb.session_id, cms.subject_id, c.name, sea.id, sea.status, sea.total_score, sea.percentage, sea.is_passed, sea.completed_at
        ORDER BY c.name, scb.title
      `;

      const result = await this.pool.query(query, [userId]);

      res.status(200).json({
        success: true,
        message: 'Student examinations retrieved successfully',
        data: {
          examinations: result.rows,
          totalExaminations: result.rows.length,
        },
      });
    } catch (error: any) {
      console.error('ExaminationController.getStudentExaminations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student examinations',
      });
    }
  };
}

