import { Pool } from 'pg';

interface GetLMSStudentProgressRequest {
    departmentId?: string;
    searchTerm?: string;
    progressMin?: number;
    progressMax?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface LMSStudentProgress {
    studentId: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    department: string;
    departmentId: string;
    enrolledSubjects: number;
    completedSubjects: number;
    overallProgress: number;
    averageScore: number;
    assignmentsCompleted: number;
    assignmentsTotal: number;
    examinationsPassed: number;
    examinationsTotal: number;
    lastActive: Date | null;
}

interface GetLMSStudentProgressResponse {
    success: boolean;
    data: LMSStudentProgress[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    summary: {
        totalStudents: number;
        activeThisWeek: number;
        avgCompletion: number;
        avgPassRate: number;
    };
}

export class GetLMSStudentProgressUseCase {
    constructor(private pool: Pool) { }

    async execute(request: GetLMSStudentProgressRequest): Promise<GetLMSStudentProgressResponse> {
        try {
            const page = request.page || 1;
            const limit = request.limit || 10;
            const offset = (page - 1) * limit;

            // Build WHERE conditions
            const conditions: string[] = ["u.role = 'student'"];
            const params: any[] = [];
            let paramIndex = 1;

            if (request.departmentId) {
                conditions.push(`u.department_id = $${paramIndex}`);
                params.push(request.departmentId);
                paramIndex++;
            }

            if (request.searchTerm) {
                conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
                params.push(`%${request.searchTerm}%`);
                paramIndex++;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Simplified query - just get students with basic info first
            const query = `
                SELECT 
                    u.id as student_id,
                    u.name as student_name,
                    u.email as student_email,
                    COALESCE(u.roll_number, '') as roll_number,
                    COALESCE(d.name, 'Unassigned') as department,
                    u.department_id
                FROM lmsact.users u
                LEFT JOIN lmsact.departments d ON u.department_id = d.id
                ${whereClause}
                ORDER BY u.name ASC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(limit, offset);
            console.log('Student progress query:', query);
            console.log('Params:', params);

            const result = await this.pool.query(query, params);

            // Count query for pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM lmsact.users u
                ${whereClause}
            `;
            const countResult = await this.pool.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0]?.total || '0');

            // Now get progress data for each student (simplified)
            const studentData: LMSStudentProgress[] = [];

            for (const row of result.rows) {
                // Get enrollments count
                let enrolledSubjects = 0;
                let completedSubjects = 0;
                let overallProgress = 0;
                try {
                    const enrollQuery = `
                        SELECT 
                            COUNT(*) as enrolled,
                            COUNT(*) FILTER (WHERE completion_percentage >= 100) as completed,
                            COALESCE(AVG(completion_percentage), 0) as avg_progress
                        FROM lmsact.student_enrollments 
                        WHERE user_id = $1
                    `;
                    const enrollResult = await this.pool.query(enrollQuery, [row.student_id]);
                    if (enrollResult.rows[0]) {
                        enrolledSubjects = parseInt(enrollResult.rows[0].enrolled) || 0;
                        completedSubjects = parseInt(enrollResult.rows[0].completed) || 0;
                        overallProgress = parseFloat(enrollResult.rows[0].avg_progress) || 0;
                    }
                } catch (e) {
                    console.log('Enrollments query failed, using defaults');
                }

                // Get exam stats
                let examinationsPassed = 0;
                let examinationsTotal = 0;
                let averageScore = 0;
                try {
                    const examQuery = `
                        SELECT 
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE is_passed = true) as passed,
                            COALESCE(AVG(percentage), 0) as avg_score
                        FROM lmsact.session_examination_attempts 
                        WHERE user_id = $1 AND status = 'completed'
                    `;
                    const examResult = await this.pool.query(examQuery, [row.student_id]);
                    if (examResult.rows[0]) {
                        examinationsTotal = parseInt(examResult.rows[0].total) || 0;
                        examinationsPassed = parseInt(examResult.rows[0].passed) || 0;
                        averageScore = parseFloat(examResult.rows[0].avg_score) || 0;
                    }
                } catch (e) {
                    console.log('Exams query failed, using defaults');
                }

                studentData.push({
                    studentId: row.student_id,
                    studentName: row.student_name,
                    studentEmail: row.student_email,
                    rollNumber: row.roll_number || '',
                    department: row.department || 'Unassigned',
                    departmentId: row.department_id,
                    enrolledSubjects,
                    completedSubjects,
                    overallProgress,
                    averageScore,
                    assignmentsCompleted: 0,
                    assignmentsTotal: 0,
                    examinationsPassed,
                    examinationsTotal,
                    lastActive: null
                });
            }

            // Apply progress filter
            let filteredData = studentData;
            if (request.progressMin !== undefined) {
                filteredData = filteredData.filter(s => s.overallProgress >= request.progressMin!);
            }
            if (request.progressMax !== undefined) {
                filteredData = filteredData.filter(s => s.overallProgress <= request.progressMax!);
            }

            return {
                success: true,
                data: filteredData,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                summary: {
                    totalStudents: total,
                    activeThisWeek: 0,
                    avgCompletion: filteredData.length > 0
                        ? filteredData.reduce((sum, s) => sum + s.overallProgress, 0) / filteredData.length
                        : 0,
                    avgPassRate: 0
                }
            };
        } catch (error: any) {
            console.error('Error getting LMS student progress:', error);
            throw new Error(`Failed to get student progress: ${error.message}`);
        }
    }
}
