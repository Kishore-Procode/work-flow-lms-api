import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * GetStaffAssignmentSubmissionsUseCase
 *
 * Gets all assignment submissions for subjects assigned to a staff member.
 * Used in the staff assignment management page.
 *
 * Process:
 * 1. Validate staff exists
 * 2. Get all subjects assigned to staff
 * 3. Get all assignment submissions for those subjects
 * 4. Group by subject and return organized data
 */

export interface GetStaffAssignmentSubmissionsRequest {
  staffId: string;
}

export interface AssignmentSubmissionForStaff {
  id: string;
  contentBlockId: string;
  contentBlockTitle: string;
  sessionTitle: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  submissionText: string | null;
  submissionFiles: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
  }> | null;
  submittedAt: Date;
  gradedBy: string | null;
  gradedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  isPassed: boolean;
  feedback: string | null;
  rubricScores: Array<{
    criteria: string;
    score: number;
    maxScore: number;
    comments?: string;
  }> | null;
  status: 'submitted' | 'graded' | 'returned' | 'resubmitted';
}

export interface AssignmentWithSubmissions {
  assignmentId: string;
  assignmentTitle: string;
  assignmentDescription: string;
  assignmentInstructions: string;
  maxPoints: number;
  dueDate: string | null;
  sessionId: string;
  sessionTitle: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalSubmissions: number;
  pendingGrading: number;
  graded: number;
  submissions: AssignmentSubmissionForStaff[];
}

export interface SubjectWithAssignments {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  assignments: AssignmentWithSubmissions[];
  totalSubmissions: number;
  pendingGrading: number;
  graded: number;
}

export interface GetStaffAssignmentSubmissionsResponse {
  subjects: SubjectWithAssignments[];
  totalSubmissions: number;
  totalPendingGrading: number;
  totalGraded: number;
}

export class GetStaffAssignmentSubmissionsUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: GetStaffAssignmentSubmissionsRequest): Promise<GetStaffAssignmentSubmissionsResponse> {
    try {
      // Step 1: Validate staff exists
      const staffQuery = `
        SELECT id, name, role
        FROM lmsact.users
        WHERE id = $1 AND role IN ('staff', 'hod') AND status = 'active'
      `;

      const staffResult = await this.pool.query(staffQuery, [request.staffId]);

      if (staffResult.rows.length === 0) {
        throw new DomainError('Staff member not found or inactive');
      }

      // Step 2: Get ALL subjects assigned to staff (even if they have no assignments)
      const subjectsQuery = `
        SELECT DISTINCT
          ssa.content_map_sub_details_id::text as "subjectId",
          csub.act_subject_code as "subjectCode",
          csub.act_subject_name as "subjectName"
        FROM lmsact.subject_staff_assignments ssa
        INNER JOIN lmsact.content_map_sub_details csub ON ssa.content_map_sub_details_id = csub.id
        WHERE ssa.staff_id = $1
          AND ssa.is_active = true
        ORDER BY csub.act_subject_name
      `;

      const subjectsResult = await this.pool.query(subjectsQuery, [request.staffId]);

      if (subjectsResult.rows.length === 0) {
        return {
          subjects: [],
          totalSubmissions: 0,
          totalPendingGrading: 0,
          totalGraded: 0
        };
      }

      // Step 3: Get all assignment content blocks for subjects assigned to staff
      const assignmentsQuery = `
        SELECT DISTINCT
          cb.id::text as "assignmentId",
          cb.title as "assignmentTitle",
          cb.content_data->>'description' as "assignmentDescription",
          cb.content_data->>'instructions' as "assignmentInstructions",
          COALESCE((cb.content_data->>'maxPoints')::int, 100) as "maxPoints",
          cb.content_data->>'dueDate' as "dueDate",
          s.id::text as "sessionId",
          s.title as "sessionTitle",
          ssa.content_map_sub_details_id::text as "subjectId",
          csub.act_subject_code as "subjectCode",
          csub.act_subject_name as "subjectName",
          cb.order_index as "orderIndex"
        FROM lmsact.subject_staff_assignments ssa
        INNER JOIN lmsact.content_map_sub_details csub ON ssa.content_map_sub_details_id = csub.id
        INNER JOIN lmsact.subject_session_mapping ssm ON ssa.content_map_sub_details_id = ssm.content_map_sub_details_id
        INNER JOIN workflowmgmt.sessions s ON ssm.workflow_session_id = s.id
        INNER JOIN workflowmgmt.session_content_blocks cb ON s.id = cb.session_id
        WHERE ssa.staff_id = $1
          AND ssa.is_active = true
          AND ssm.is_active = true
          AND cb.type = 'assignment'
        ORDER BY csub.act_subject_name, s.title, cb.order_index
      `;

      const assignmentsResult = await this.pool.query(assignmentsQuery, [request.staffId]);

      // Step 4: Initialize all subjects (even those with no assignments)
      const subjectsMap = new Map<string, SubjectWithAssignments>();

      for (const subject of subjectsResult.rows) {
        subjectsMap.set(subject.subjectId, {
          subjectId: subject.subjectId,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          assignments: [],
          totalSubmissions: 0,
          pendingGrading: 0,
          graded: 0
        });
      }

      let totalSubmissions = 0;
      let totalPendingGrading = 0;
      let totalGraded = 0;

      // Step 5: Process assignments and their submissions
      for (const assignment of assignmentsResult.rows) {
        // Get submissions for this assignment
        const submissionsQuery = `
          SELECT
            sub.id::text,
            sub.content_block_id::text as "contentBlockId",
            cb.title as "contentBlockTitle",
            sub.user_id::text as "userId",
            u.name as "studentName",
            u.email as "studentEmail",
            sub.submission_text as "submissionText",
            sub.submission_files as "submissionFiles",
            sub.submitted_at as "submittedAt",
            sub.graded_by::text as "gradedBy",
            sub.graded_at as "gradedAt",
            sub.score,
            sub.max_score as "maxScore",
            sub.percentage,
            sub.is_passed as "isPassed",
            sub.feedback,
            sub.rubric_scores as "rubricScores",
            sub.status
          FROM lmsact.session_assignment_submissions sub
          INNER JOIN workflowmgmt.session_content_blocks cb ON sub.content_block_id = cb.id
          INNER JOIN lmsact.users u ON sub.user_id = u.id
          WHERE sub.content_block_id = $1
          ORDER BY sub.submitted_at DESC
        `;

        const submissionsResult = await this.pool.query(submissionsQuery, [assignment.assignmentId]);

        const submissions: AssignmentSubmissionForStaff[] = submissionsResult.rows;
        const pendingCount = submissions.filter(s => s.status === 'submitted').length;
        const gradedCount = submissions.filter(s => s.status === 'graded').length;

        const assignmentWithSubmissions: AssignmentWithSubmissions = {
          assignmentId: assignment.assignmentId,
          assignmentTitle: assignment.assignmentTitle,
          assignmentDescription: assignment.assignmentDescription || '',
          assignmentInstructions: assignment.assignmentInstructions || '',
          maxPoints: assignment.maxPoints,
          dueDate: assignment.dueDate,
          sessionId: assignment.sessionId,
          sessionTitle: assignment.sessionTitle,
          subjectId: assignment.subjectId,
          subjectCode: assignment.subjectCode,
          subjectName: assignment.subjectName,
          totalSubmissions: submissions.length,
          pendingGrading: pendingCount,
          graded: gradedCount,
          submissions
        };

        // Add assignment to its subject
        const subject = subjectsMap.get(assignment.subjectId);
        if (subject) {
          subject.assignments.push(assignmentWithSubmissions);
          subject.totalSubmissions += submissions.length;
          subject.pendingGrading += pendingCount;
          subject.graded += gradedCount;

          totalSubmissions += submissions.length;
          totalPendingGrading += pendingCount;
          totalGraded += gradedCount;
        }
      }

      const subjects = Array.from(subjectsMap.values());

      return {
        subjects,
        totalSubmissions,
        totalPendingGrading,
        totalGraded
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get staff assignment submissions: ${error.message}`);
    }
  }
}

