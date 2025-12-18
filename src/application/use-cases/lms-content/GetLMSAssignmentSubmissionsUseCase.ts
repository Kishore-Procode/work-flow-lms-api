import { Pool } from 'pg';

export interface GetLMSAssignmentSubmissionsRequest {
  staffId: string;
}

export interface GetLMSAssignmentSubmissionsResponse {
  success: boolean;
  data: Array<{
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    subjectName: string;
    subjectCode: string;
    studentName: string;
    studentEmail: string;
    submissionText: string | null;
    submissionFiles: any;
    submittedAt: Date;
    status: string;
    score: number | null;
    maxScore: number;
    feedback: string | null;
    isLate: boolean;
  }>;
}

export class GetLMSAssignmentSubmissionsUseCase {
  constructor(private pool: Pool) {}

  async execute(request: GetLMSAssignmentSubmissionsRequest): Promise<GetLMSAssignmentSubmissionsResponse> {
    // Get all submissions for assignments in subjects assigned to this staff member
    const query = `
      SELECT
        sub.id,
        sub.assignment_id,
        a.title as assignment_title,
        csub.act_subject_name as subject_name,
        csub.act_subject_code as subject_code,
        u.name as student_name,
        u.email as student_email,
        sub.submission_text,
        sub.submission_files,
        sub.submitted_at,
        sub.status,
        sub.score,
        sub.max_score,
        sub.feedback,
        sub.is_late
      FROM lmsact.session_assignment_submissions sub
      INNER JOIN lmsact.assignments a ON sub.assignment_id = a.id
      INNER JOIN lmsact.content_map_sub_details csub ON a.content_map_sub_details_id = csub.id
      INNER JOIN lmsact.subject_staff_assignments ssa ON csub.id = ssa.content_map_sub_details_id
      INNER JOIN lmsact.users u ON sub.user_id = u.id
      WHERE ssa.staff_id = $1
        AND ssa.is_active = true
        AND a.is_active = true
      ORDER BY sub.submitted_at DESC
    `;

    const result = await this.pool.query(query, [request.staffId]);

    console.log(`📊 GetLMSAssignmentSubmissionsUseCase: Found ${result.rows.length} submissions for staff ${request.staffId}`);
    if (result.rows.length > 0) {
      console.log('📝 First submission:', result.rows[0]);
    }

    return {
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        assignmentId: row.assignment_id,
        assignmentTitle: row.assignment_title,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        studentName: row.student_name,
        studentEmail: row.student_email,
        submissionText: row.submission_text,
        submissionFiles: row.submission_files,
        submittedAt: row.submitted_at,
        status: row.status,
        score: row.score,
        maxScore: row.max_score,
        feedback: row.feedback,
        isLate: row.is_late
      }))
    };
  }
}

