import { Request, Response } from 'express';
import { Pool } from 'pg';
import { LMSAssignmentRepository } from '../../infrastructure/repositories/LMSAssignmentRepository';
import { LMSExaminationRepository } from '../../infrastructure/repositories/LMSExaminationRepository';
import { LMSQuizRepository } from '../../infrastructure/repositories/LMSQuizRepository';
import { CreateLMSAssignmentUseCase } from '../../application/use-cases/lms-content/CreateLMSAssignmentUseCase';
import { GetLMSAssignmentsBySubjectUseCase } from '../../application/use-cases/lms-content/GetLMSAssignmentsBySubjectUseCase';
import { GetLMSAssignmentByIdUseCase } from '../../application/use-cases/lms-content/GetLMSAssignmentByIdUseCase';
import { CreateLMSExaminationUseCase } from '../../application/use-cases/lms-content/CreateLMSExaminationUseCase';
import { GetLMSExaminationsBySubjectUseCase } from '../../application/use-cases/lms-content/GetLMSExaminationsBySubjectUseCase';
import { GetLMSExaminationByIdUseCase } from '../../application/use-cases/lms-content/GetLMSExaminationByIdUseCase';
import { CreateLMSQuizUseCase } from '../../application/use-cases/lms-content/CreateLMSQuizUseCase';
import { GetLMSQuizzesBySubjectUseCase } from '../../application/use-cases/lms-content/GetLMSQuizzesBySubjectUseCase';
import { GetLMSQuizByIdUseCase } from '../../application/use-cases/lms-content/GetLMSQuizByIdUseCase';
import { SubmitLMSAssignmentUseCase } from '../../application/use-cases/lms-content/SubmitLMSAssignmentUseCase';
import { GradeLMSAssignmentUseCase } from '../../application/use-cases/lms-content/GradeLMSAssignmentUseCase';
import { GetLMSAssignmentSubmissionsUseCase } from '../../application/use-cases/lms-content/GetLMSAssignmentSubmissionsUseCase';
import { GetLMSAssignmentSubmissionStatusUseCase } from '../../application/use-cases/lms-content/GetLMSAssignmentSubmissionStatusUseCase';
import { SubmitLMSExaminationUseCase } from '../../application/use-cases/lms-content/SubmitLMSExaminationUseCase';
import { GetCourseCompletionUseCase } from '../../application/use-cases/lms-content/GetCourseCompletionUseCase';
import { GetLMSExaminationAttemptsUseCase } from '../../application/use-cases/lms-content/GetLMSExaminationAttemptsUseCase';
import { GetLMSExaminationAttemptStatusUseCase } from '../../application/use-cases/lms-content/GetLMSExaminationAttemptStatusUseCase';
import { GradeLMSExaminationUseCase } from '../../application/use-cases/lms-content/GradeLMSExaminationUseCase';
import { GetLMSStaffAssignmentsUseCase } from '../../application/use-cases/lms-content/GetLMSStaffAssignmentsUseCase';
import { GetStudentExaminationResultsUseCase } from '../../application/use-cases/lms-content/GetStudentExaminationResultsUseCase';

export class LMSContentController {
  private assignmentRepository: LMSAssignmentRepository;
  private examinationRepository: LMSExaminationRepository;
  private quizRepository: LMSQuizRepository;

  constructor(private readonly pool: Pool) {
    this.assignmentRepository = new LMSAssignmentRepository(pool);
    this.examinationRepository = new LMSExaminationRepository(pool);
    this.quizRepository = new LMSQuizRepository(pool);
  }

  /**
   * Create a new LMS assignment
   * POST /api/v1/lms-content/assignments
   */
  async createAssignment(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new CreateLMSAssignmentUseCase(this.assignmentRepository);
      const assignment = await useCase.execute({
        ...req.body,
        createdBy: req.user?.id,
      });

      console.log('✅ LMS Assignment created:', assignment.id);

      res.status(201).json({
        success: true,
        message: 'Assignment created successfully',
        data: assignment,
      });
    } catch (error: any) {
      console.error('❌ Error creating LMS assignment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create assignment',
      });
    }
  }

  /**
   * Get assignments by subject
   * GET /api/v1/lms-content/subjects/:subjectId/assignments
   */
  async getAssignmentsBySubject(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.params;
      const useCase = new GetLMSAssignmentsBySubjectUseCase(this.assignmentRepository);
      const assignments = await useCase.execute(subjectId);

      res.status(200).json({
        success: true,
        message: 'Assignments retrieved successfully',
        data: assignments,
      });
    } catch (error: any) {
      console.error('❌ Error getting assignments by subject:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get assignments',
      });
    }
  }

  /**
   * Get assignment by ID
   * GET /api/v1/lms-content/assignments/:assignmentId
   */
  async getAssignmentById(req: Request, res: Response): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const useCase = new GetLMSAssignmentByIdUseCase(this.assignmentRepository);
      const assignment = await useCase.execute(assignmentId);

      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Assignment retrieved successfully',
        data: assignment,
      });
    } catch (error: any) {
      console.error('❌ Error getting assignment by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get assignment',
      });
    }
  }

  /**
   * Create a new LMS examination
   * POST /api/v1/lms-content/examinations
   */
  async createExamination(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new CreateLMSExaminationUseCase(this.examinationRepository);
      const examination = await useCase.execute({
        ...req.body,
        createdBy: req.user?.id,
      });

      console.log('✅ LMS Examination created:', examination.id);

      res.status(201).json({
        success: true,
        message: 'Examination created successfully',
        data: examination,
      });
    } catch (error: any) {
      console.error('❌ Error creating LMS examination:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create examination',
      });
    }
  }

  /**
   * Get examinations by subject
   * GET /api/v1/lms-content/subjects/:subjectId/examinations
   */
  async getExaminationsBySubject(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.params;
      const useCase = new GetLMSExaminationsBySubjectUseCase(this.examinationRepository);
      const examinations = await useCase.execute(subjectId);

      res.status(200).json({
        success: true,
        message: 'Examinations retrieved successfully',
        data: examinations,
      });
    } catch (error: any) {
      console.error('❌ Error getting examinations by subject:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get examinations',
      });
    }
  }

  /**
   * Get examination by ID
   * GET /api/v1/lms-content/examinations/:examinationId
   */
  async getExaminationById(req: Request, res: Response): Promise<void> {
    try {
      const { examinationId } = req.params;
      const useCase = new GetLMSExaminationByIdUseCase(this.examinationRepository);
      const examination = await useCase.execute(examinationId);

      if (!examination) {
        res.status(404).json({
          success: false,
          message: 'Examination not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Examination retrieved successfully',
        data: examination,
      });
    } catch (error: any) {
      console.error('❌ Error getting examination by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get examination',
      });
    }
  }

  /**
   * Create a new LMS quiz
   * POST /api/v1/lms-content/quizzes
   */
  async createQuiz(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new CreateLMSQuizUseCase(this.quizRepository);
      const quiz = await useCase.execute({
        ...req.body,
        createdBy: req.user?.id,
      });

      console.log('✅ LMS Quiz created:', quiz.id);

      res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        data: quiz,
      });
    } catch (error: any) {
      console.error('❌ Error creating LMS quiz:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create quiz',
      });
    }
  }

  /**
   * Get quizzes by subject
   * GET /api/v1/lms-content/quizzes/subject/:subjectId
   */
  async getQuizzesBySubject(req: Request, res: Response): Promise<void> {
    try {
      const { subjectId } = req.params;
      const useCase = new GetLMSQuizzesBySubjectUseCase(this.quizRepository);
      const quizzes = await useCase.execute(subjectId);

      res.status(200).json({
        success: true,
        message: 'Quizzes retrieved successfully',
        data: quizzes,
      });
    } catch (error: any) {
      console.error('❌ Error getting quizzes by subject:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get quizzes',
      });
    }
  }

  /**
   * Get quiz by ID
   * GET /api/v1/lms-content/quizzes/:quizId
   */
  async getQuizById(req: Request, res: Response): Promise<void> {
    try {
      const { quizId } = req.params;
      const useCase = new GetLMSQuizByIdUseCase(this.quizRepository);
      const quiz = await useCase.execute(quizId);

      if (!quiz) {
        res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Quiz retrieved successfully',
        data: quiz,
      });
    } catch (error: any) {
      console.error('❌ Error getting quiz by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get quiz',
      });
    }
  }

  /**
   * Get all assignments for student's enrolled subjects
   * GET /api/v1/lms-content/student/assignments
   */
  async getStudentAssignments(req: Request, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get all enrolled subjects for the student (including completed subjects)
      // Students should still see assignments even after completing the course content
      const enrolledSubjectsQuery = `
        SELECT DISTINCT
          e.content_map_sub_details_id as subject_id,
          cmsd.act_subject_code as subject_code,
          cmsd.act_subject_name as subject_name
        FROM lmsact.student_subject_enrollments e
        INNER JOIN lmsact.content_map_sub_details cmsd ON e.content_map_sub_details_id = cmsd.id
        WHERE e.student_id = $1 AND e.status IN ('active', 'completed')
      `;

      const enrolledSubjectsResult = await this.pool.query(enrolledSubjectsQuery, [studentId]);
      const enrolledSubjects = enrolledSubjectsResult.rows;

      // Get assignments for each enrolled subject
      const assignmentsWithSubjects = [];

      for (const subject of enrolledSubjects) {
        const useCase = new GetLMSAssignmentsBySubjectUseCase(this.assignmentRepository);
        const assignments = await useCase.execute(subject.subject_id);

        assignmentsWithSubjects.push({
          subjectId: subject.subject_id,
          subjectCode: subject.subject_code,
          subjectName: subject.subject_name,
          assignments,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Student assignments retrieved successfully',
        data: assignmentsWithSubjects,
      });
    } catch (error: any) {
      console.error('❌ Error getting student assignments:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get student assignments',
      });
    }
  }

  /**
   * Get all examinations for student's enrolled subjects
   * GET /api/v1/lms-content/student/examinations
   */
  async getStudentExaminations(req: Request, res: Response): Promise<void> {
    try {
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get all enrolled subjects for the student (including completed subjects)
      // Students should still see examinations even after completing the course content
      const enrolledSubjectsQuery = `
        SELECT DISTINCT
          e.content_map_sub_details_id as subject_id,
          cmsd.act_subject_code as subject_code,
          cmsd.act_subject_name as subject_name
        FROM lmsact.student_subject_enrollments e
        INNER JOIN lmsact.content_map_sub_details cmsd ON e.content_map_sub_details_id = cmsd.id
        WHERE e.student_id = $1 AND e.status IN ('active', 'completed')
      `;

      const enrolledSubjectsResult = await this.pool.query(enrolledSubjectsQuery, [studentId]);
      const enrolledSubjects = enrolledSubjectsResult.rows;

      // Get examinations for each enrolled subject
      const examinationsWithSubjects = [];

      for (const subject of enrolledSubjects) {
        const useCase = new GetLMSExaminationsBySubjectUseCase(this.examinationRepository);
        const examinations = await useCase.execute(subject.subject_id);

        examinationsWithSubjects.push({
          subjectId: subject.subject_id,
          subjectCode: subject.subject_code,
          subjectName: subject.subject_name,
          examinations,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Student examinations retrieved successfully',
        data: examinationsWithSubjects,
      });
    } catch (error: any) {
      console.error('❌ Error getting student examinations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get student examinations',
      });
    }
  }

  /**
   * Submit an LMS assignment
   * POST /api/v1/lms-content/assignments/submit
   */
  async submitAssignment(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new SubmitLMSAssignmentUseCase(this.pool);
      const result = await useCase.execute({
        assignmentId: req.body.assignmentId,
        userId: req.user?.id!,
        submissionText: req.body.submissionText,
        submissionFiles: req.body.submissionFiles,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('❌ Error submitting LMS assignment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit assignment',
      });
    }
  }

  /**
   * Grade an LMS assignment submission
   * POST /api/v1/lms-content/assignments/grade
   */
  async gradeAssignment(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GradeLMSAssignmentUseCase(this.pool);
      const result = await useCase.execute({
        submissionId: req.body.submissionId,
        staffId: req.user?.id!,
        score: req.body.score,
        maxScore: req.body.maxScore,
        feedback: req.body.feedback,
        rubricScores: req.body.rubricScores,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error grading LMS assignment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to grade assignment',
      });
    }
  }

  /**
   * Get LMS staff assignments (subjects with assignments)
   * GET /api/v1/lms-content/staff/assignments
   */
  async getStaffAssignments(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Getting LMS staff assignments for staff ID:', req.user?.id);
      const useCase = new GetLMSStaffAssignmentsUseCase(this.pool);
      const result = await useCase.execute({
        staffId: req.user?.id!,
      });

      console.log('✅ LMS Staff Assignments Result:', JSON.stringify(result, null, 2));
      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting staff assignments:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get staff assignments',
      });
    }
  }

  /**
   * Get LMS assignment submissions for staff
   * GET /api/v1/lms-content/assignments/submissions
   */
  async getAssignmentSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GetLMSAssignmentSubmissionsUseCase(this.pool);
      const result = await useCase.execute({
        staffId: req.user?.id!,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting LMS assignment submissions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get assignment submissions',
      });
    }
  }

  /**
   * Get LMS assignment submission status for a student
   * GET /api/v1/lms-content/assignments/:assignmentId/status
   */
  async getAssignmentSubmissionStatus(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GetLMSAssignmentSubmissionStatusUseCase(this.pool);
      const result = await useCase.execute({
        assignmentId: req.params.assignmentId,
        userId: req.user?.id!,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting LMS assignment submission status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get assignment submission status',
      });
    }
  }

  /**
   * Get LMS examination attempt status for a student
   * GET /api/v1/lms-content/examinations/:examinationId/attempt-status
   */
  async getExaminationAttemptStatus(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GetLMSExaminationAttemptStatusUseCase(this.pool);
      const result = await useCase.execute({
        examinationId: req.params.examinationId,
        userId: req.user?.id!,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting LMS examination attempt status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get examination attempt status',
      });
    }
  }

  /**
   * Submit LMS examination attempt
   * POST /api/v1/lms-content/examinations/submit
   */
  async submitExamination(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new SubmitLMSExaminationUseCase(this.pool);
      const result = await useCase.execute({
        examinationId: req.body.examinationId,
        userId: req.user?.id!,
        answers: req.body.answers,
        timeSpent: req.body.timeSpent,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('❌ Error submitting LMS examination:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit examination',
      });
    }
  }

  /**
   * Get course completion percentage for a subject
   * GET /api/v1/lms-content/course-completion/:subjectId
   */
  async getCourseCompletion(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GetCourseCompletionUseCase(this.pool);
      const result = await useCase.execute({
        contentMapSubDetailsId: req.params.subjectId,
        userId: req.user?.id!,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting course completion:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get course completion',
      });
    }
  }

  /**
   * Get LMS examination attempts for staff
   * GET /api/v1/lms-content/examinations/attempts
   */
  async getExaminationAttempts(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GetLMSExaminationAttemptsUseCase(this.pool);
      const result = await useCase.execute({
        staffId: req.user?.id!,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting LMS examination attempts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get examination attempts',
      });
    }
  }

  /**
   * Grade LMS examination subjective questions
   * POST /api/v1/lms-content/examinations/grade
   */
  async gradeExamination(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new GradeLMSExaminationUseCase(this.pool);
      const result = await useCase.execute({
        attemptId: req.body.attemptId,
        staffId: req.user?.id!,
        subjectiveGrades: req.body.subjectiveGrades,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error grading LMS examination:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to grade examination',
      });
    }
  }

  /**
   * Get examination results for a student to review
   * GET /api/v1/lms-content/examinations/:examinationId/results
   */
  async getStudentExaminationResults(req: Request, res: Response): Promise<void> {
    try {
      const { examinationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const useCase = new GetStudentExaminationResultsUseCase(this.pool);
      const result = await useCase.execute({
        examinationId,
        userId,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting student examination results:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get examination results',
      });
    }
  }

  /**
   * Get LMS student progress for staff monitoring
   */
  async getLMSStudentProgress(req: Request, res: Response): Promise<void> {
    try {
      const { GetLMSStudentProgressUseCase } = await import('../../application/use-cases/lms-content/GetLMSStudentProgressUseCase');
      const useCase = new GetLMSStudentProgressUseCase(this.pool);

      const result = await useCase.execute({
        departmentId: req.query.departmentId as string,
        searchTerm: req.query.searchTerm as string,
        progressMin: req.query.progressMin ? parseFloat(req.query.progressMin as string) : undefined,
        progressMax: req.query.progressMax ? parseFloat(req.query.progressMax as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Error getting LMS student progress:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get student progress',
      });
    }
  }
}

