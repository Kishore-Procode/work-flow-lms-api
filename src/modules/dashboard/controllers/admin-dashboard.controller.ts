import { Request, Response } from 'express';
import { pool } from '../../../config/database';

/**
 * Get states for dropdown
 */
export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Admin Dashboard: Fetching states for user:', req.user?.email);

    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }

    const query = `
      SELECT id, name, code 
      FROM lmsact.states 
      WHERE active = true OR active IS NULL
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      message: 'States retrieved successfully',
      data: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get districts by state for dropdown
 */
export const getDistrictsByState = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Admin Dashboard: Fetching districts for state:', req.params.stateId);

    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }

    const { stateId } = req.params;
    
    if (!stateId) {
      res.status(400).json({
        success: false,
        message: 'State ID is required',
      });
      return;
    }

    const query = `
      SELECT id, name
      FROM lmsact.districts
      WHERE state_id = $1 AND (active = true OR active IS NULL)
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query, [stateId]);

    res.status(200).json({
      success: true,
      message: 'Districts retrieved successfully',
      data: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get college ranking data with filters - LMS focused
 */
export const getCollegeRankingData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Admin Dashboard: Fetching college ranking data with filters:', {
      stateId: req.query.stateId,
      districtId: req.query.districtId
    });

    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }

    const { stateId, districtId } = req.query;
    
    // Build dynamic WHERE clause based on filters
    let whereClause = "WHERE c.status = 'active'";
    const queryParams: any[] = [];

    if (stateId) {
      queryParams.push(stateId);
      whereClause += ` AND c.state = $${queryParams.length}`;
    }

    if (districtId) {
      queryParams.push(districtId);
      whereClause += ` AND c.city = $${queryParams.length}`;
    }

    const query = `
      SELECT 
        c.id as college_id,
        c.name as college_name,
        c.principal_id,
        (SELECT name FROM lmsact.users WHERE id = c.principal_id) as principle_name,
        s.name as state_name,
        dt.name as district_name,
        c.address,
        c.phone,
        c.email,
        c.website,
        c.established,
        -- Count active students
        (SELECT COUNT(DISTINCT u.id) 
         FROM lmsact.users u 
         WHERE u.college_id = c.id 
           AND u.role = 'student'
           AND u.status = 'active') as total_students,
        -- Count enrolled students (students with sections)
        (SELECT COUNT(DISTINCT u.id) 
         FROM lmsact.users u 
         WHERE u.college_id = c.id 
           AND u.role = 'student'
           AND u.status = 'active'
           AND u.section_id IS NOT NULL) as enrolled_students,
        -- Count active courses offered
        (SELECT COUNT(DISTINCT co.id) 
         FROM lmsact.courses co 
         WHERE co.college_id = c.id 
           AND co.is_active = true) as total_courses,
        -- Count total sections
        (SELECT COUNT(DISTINCT sec.id) 
         FROM lmsact.sections sec 
         JOIN lmsact.courses co ON co.id = sec.course_id 
         WHERE co.college_id = c.id 
           AND sec.status = 'active') as total_sections,
        -- Count active departments
        (SELECT COUNT(DISTINCT d.id) 
         FROM lmsact.departments d 
         WHERE d.college_id = c.id 
           AND d.is_active = true) as total_departments,
        -- Calculate average completion rate from learning progress
        (SELECT COALESCE(AVG(lp.completion_percentage), 0)
         FROM lmsact.learning_progress lp
         JOIN lmsact.users u ON u.id = lp.user_id
         WHERE u.college_id = c.id
           AND u.role = 'student') as avg_completion_rate
      FROM lmsact.colleges c
      LEFT JOIN lmsact.states s ON s.id = c.state
      LEFT JOIN lmsact.districts dt ON dt.id = c.city AND dt.state_id = s.id
      ${whereClause}
      ORDER BY enrolled_students DESC, avg_completion_rate DESC
    `;
    
    const result = await pool.query(query, queryParams);

    console.log('Admin Dashboard: Query executed successfully, rows:', result.rows.length);

    // Process the data to add ranking and enrollment rate
    const collegeData = result.rows.map((college: any, index: number) => {
      const totalStudents = parseInt(college.total_students || 0);
      const enrolledStudents = parseInt(college.enrolled_students || 0);
      const enrollmentRate = totalStudents > 0 ? Math.round((enrolledStudents / totalStudents) * 100) : 0;
      const completionRate = parseFloat(college.avg_completion_rate || 0);

      return {
        id: college.college_id,
        rank: index + 1,
        name: college.college_name,
        principalName: college.principle_name || 'Not Assigned',
        principalId: college.principal_id,
        totalStudents,
        enrolledStudents,
        totalCourses: parseInt(college.total_courses || 0),
        totalSections: parseInt(college.total_sections || 0),
        totalDepartments: parseInt(college.total_departments || 0),
        enrollmentRate,
        completionRate: Math.round(completionRate * 100) / 100,
        stateName: college.state_name,
        districtName: college.district_name,
        address: college.address,
        phone: college.phone,
        email: college.email,
        website: college.website,
        established: college.established,
        status: enrollmentRate >= 90 ? 'excellent' : 
                enrollmentRate >= 70 ? 'good' : 
                enrollmentRate >= 50 ? 'fair' : 'needs_improvement',
        unenrolledStudents: Math.max(0, totalStudents - enrolledStudents)
      };
    });

    // Calculate overall statistics
    const totalColleges = collegeData.length;
    const totalStudents = collegeData.reduce((sum, college) => sum + college.totalStudents, 0);
    const totalEnrolledStudents = collegeData.reduce((sum, college) => sum + college.enrolledStudents, 0);
    const totalCourses = collegeData.reduce((sum, college) => sum + college.totalCourses, 0);
    const totalDepartments = collegeData.reduce((sum, college) => sum + college.totalDepartments, 0);
    const overallEnrollmentRate = totalStudents > 0 ? Math.round((totalEnrolledStudents / totalStudents) * 100) : 0;
    const avgCompletionRate = collegeData.length > 0 
      ? Math.round(collegeData.reduce((sum, c) => sum + c.completionRate, 0) / collegeData.length * 100) / 100 
      : 0;

    const stats = {
      totalColleges,
      totalStudents,
      totalEnrolledStudents,
      totalCourses,
      totalDepartments,
      overallEnrollmentRate,
      avgCompletionRate,
      excellentColleges: collegeData.filter(c => c.status === 'excellent').length,
      goodColleges: collegeData.filter(c => c.status === 'good').length,
      fairColleges: collegeData.filter(c => c.status === 'fair').length,
      needsImprovementColleges: collegeData.filter(c => c.status === 'needs_improvement').length,
    };

    res.status(200).json({
      success: true,
      message: 'College ranking data retrieved successfully',
      data: {
        stats,
        colleges: collegeData,
        filters: {
          stateId: stateId || null,
          districtId: districtId || null
        },
        lastUpdated: new Date().toISOString()
      },
    });

  } catch (error) {
    console.error('Error fetching college ranking data:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch college ranking data',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
    });
  }
};
