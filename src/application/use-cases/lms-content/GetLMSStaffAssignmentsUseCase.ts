import { Pool } from 'pg';

export interface GetLMSStaffAssignmentsRequest {
  staffId: string;
}

export interface LMSSubjectWithAssignments {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semesterNumber: number;
  academicYear: string;
  totalAssignments: number;
  totalSubmissions: number;
  pendingGrading: number;
  assignments: Array<{
    assignmentId: string;
    assignmentTitle: string;
    sessionTitle: string;
    dueDate: Date;
    maxPoints: number;
    totalSubmissions: number;
    pendingGrading: number;
    graded: number;
  }>;
}

export interface GetLMSStaffAssignmentsResponse {
  success: boolean;
  data: {
    subjects: LMSSubjectWithAssignments[];
    totalSubmissions: number;
    totalPendingGrading: number;
    totalGraded: number;
  };
}

export class GetLMSStaffAssignmentsUseCase {
  constructor(private pool: Pool) {}

  async execute(request: GetLMSStaffAssignmentsRequest): Promise<GetLMSStaffAssignmentsResponse> {
    console.log('🔍 GetLMSStaffAssignmentsUseCase - Staff ID:', request.staffId);

    // Get all subjects assigned to this staff member with their assignments
    const subjectsQuery = `
      SELECT
        csub.id as subject_id,
        csub.act_subject_code as subject_code,
        csub.act_subject_name as subject_name,
        ssa.semester_number,
        ay.year_name as academic_year
      FROM lmsact.subject_staff_assignments ssa
      INNER JOIN lmsact.content_map_sub_details csub ON ssa.content_map_sub_details_id = csub.id
      INNER JOIN lmsact.academic_years ay ON ssa.academic_year_id = ay.id
      WHERE ssa.staff_id = $1
        AND ssa.is_active = true
      ORDER BY ssa.semester_number, csub.act_subject_name
    `;

    const subjectsResult = await this.pool.query(subjectsQuery, [request.staffId]);
    console.log(`📊 Found ${subjectsResult.rows.length} subjects for staff`);

    const subjects: LMSSubjectWithAssignments[] = [];
    let totalSubmissions = 0;
    let totalPendingGrading = 0;
    let totalGraded = 0;

    for (const subjectRow of subjectsResult.rows) {
      // Get LMS assignments (from lmsact.assignments table, NOT workflow content blocks)
      const assignmentsQuery = `
        SELECT
          a.id as assignment_id,
          a.title as assignment_title,
          a.due_date,
          a.max_points,
          COUNT(DISTINCT sub.id) as total_submissions,
          COUNT(DISTINCT CASE WHEN sub.status = 'submitted' THEN sub.id END) as pending_grading,
          COUNT(DISTINCT CASE WHEN sub.status = 'graded' THEN sub.id END) as graded
        FROM lmsact.assignments a
        LEFT JOIN lmsact.session_assignment_submissions sub ON a.id = sub.assignment_id
        WHERE a.content_map_sub_details_id = $1
          AND a.is_active = true
        GROUP BY a.id, a.title, a.due_date, a.max_points
        ORDER BY a.created_at DESC
      `;

      const assignmentsResult = await this.pool.query(assignmentsQuery, [subjectRow.subject_id]);
      console.log(`   📝 Found ${assignmentsResult.rows.length} LMS assignments for subject ${subjectRow.subject_name}`);

      const assignments = assignmentsResult.rows.map(row => {
        const submissionCount = parseInt(row.total_submissions) || 0;
        const pendingCount = parseInt(row.pending_grading) || 0;
        const gradedCount = parseInt(row.graded) || 0;

        totalSubmissions += submissionCount;
        totalPendingGrading += pendingCount;
        totalGraded += gradedCount;

        return {
          assignmentId: row.assignment_id,
          assignmentTitle: row.assignment_title,
          sessionTitle: '', // LMS assignments are not linked to sessions
          dueDate: row.due_date,
          maxPoints: row.max_points,
          totalSubmissions: submissionCount,
          pendingGrading: pendingCount,
          graded: gradedCount
        };
      });

      subjects.push({
        subjectId: subjectRow.subject_id,
        subjectCode: subjectRow.subject_code,
        subjectName: subjectRow.subject_name,
        semesterNumber: subjectRow.semester_number,
        academicYear: subjectRow.academic_year,
        totalAssignments: assignments.length,
        totalSubmissions: assignments.reduce((sum, a) => sum + a.totalSubmissions, 0),
        pendingGrading: assignments.reduce((sum, a) => sum + a.pendingGrading, 0),
        assignments
      });
    }

    return {
      success: true,
      data: {
        subjects,
        totalSubmissions,
        totalPendingGrading,
        totalGraded
      }
    };
  }
}

