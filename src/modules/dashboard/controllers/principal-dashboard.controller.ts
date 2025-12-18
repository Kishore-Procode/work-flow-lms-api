import { Request, Response } from 'express';
import { registrationRequestRepository } from '../../registration/repositories/registration-request.repository';
import { pool } from '../../../config/database';

/**
 * Execute custom dashboard query for department-wise comparison
 */
const getDepartmentWiseData = async (collegeId: string) => {
  const query = `
    select b.*, c.principal_id, d.hod_id, d.code as department_code,
      (select name from users where id = c.principal_id) as principle_name,
      (select name from users where id = d.hod_id) as hod_name,
      c.state as state_name,
      c.city as district_name
    from (
      select  college_id, college_name, department_id, department_name,department_code,
        count(*) as total_students,
        coalesce(sum(case when uploaded_flag = 1 then uploaded_flag end),0) as resources_assigned,
        round((coalesce(sum(case when uploaded_flag = 1 then uploaded_flag end),0)::decimal / count(*)::decimal) * 100,2) as participation_rate
      from (
        select u.id, u.name, c.id as college_id, c.name as college_name, d.id as department_id, d.name as department_name,d.code as department_code,
          case WHEN 
            EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN 7 AND 11 
            AND t.assignment_date BETWEEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 6, 1)
                                AND make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 11, 30)
          then 1
          when
            (EXTRACT(MONTH FROM CURRENT_DATE) = 12 OR EXTRACT(MONTH FROM CURRENT_DATE) <= 5)
            AND t.assignment_date BETWEEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1, 12, 1)
                                AND make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 5, 31)
          THEN 1
          else 0 end as uploaded_flag
        from users u
        join colleges c on c.id = u.college_id
        join departments d on d.id = u.department_id and d.college_id = c.id
        left join learning_resources t on t.assigned_student_id = u.id
        where u.status = 'active' and u.role = 'student' and c.id = $1
       )a
      group by college_id, college_name, department_id, department_name,department_code
    )b
    left join colleges c on c.id = b.college_id
    left join departments d on d.id = b.department_id and d.college_id = c.id
    order by participation_rate desc
  `;

  const result = await pool.query(query, [collegeId]);
  return result.rows;
};

/**
 * Get consolidated principal dashboard data in a single API call
 * This endpoint optimizes performance by reducing multiple API calls to one
 */
export const getPrincipalDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'principal') {
      res.status(403).json({
        success: false,
        message: 'Principal access required',
      });
      return;
    }

    const collegeId = req.user.collegeId;
    if (!collegeId) {
      res.status(400).json({
        success: false,
        message: 'College ID not found for Principal',
      });
      return;
    }

    // Get department-wise data using custom query
    const departmentWiseData = await getDepartmentWiseData(collegeId);

    // Get additional data for dashboard
    const [registrationRequests] = await Promise.all([
      registrationRequestRepository.getRegistrationRequestsWithDetails({ collegeId })
    ]);

    // Calculate college-wide statistics from department-wise data
    const totalStudents = departmentWiseData.reduce((sum: number, dept: any) => sum + parseInt(dept.total_students || 0), 0);
    const totalresourcesAssigned = departmentWiseData.reduce((sum: number, dept: any) => sum + parseInt(dept.resources_assigned || 0), 0);
    const totalDepartments = departmentWiseData.length;

    const collegeStats = {
      totalUsers: totalStudents, // Assuming all users are students for now
      totalStudents: totalStudents,
      totalStaff: 0, // Will be calculated separately if needed
      totalDepartments: totalDepartments,
      totalresources: totalresourcesAssigned, // resources assigned
      assignedresources: totalresourcesAssigned,
      availableresources: 0, // Will be calculated separately if needed
      pendingRequests: registrationRequests?.length || 0,
      participationRate: totalStudents > 0 ? Math.round((totalresourcesAssigned / totalStudents) * 100) : 0
    };

    // Process department data from custom query
    const departmentData = departmentWiseData.map((dept: any) => {
      const participationRate = parseFloat(dept.participation_rate || 0);
      const totalStudents = parseInt(dept.total_students || 0);
      const resourcesAssigned = parseInt(dept.resources_assigned || 0);

      return {
        id: dept.department_id,
        name: dept.department_name,
        code: dept.department_code || dept.department_name?.substring(0, 3)?.toUpperCase() || 'DEPT',
        dept: dept.department_code || dept.department_name?.substring(0, 3)?.toUpperCase() || 'DEPT', // For chart display
        hodName: dept.hod_name || 'Not Assigned',
        hodId: dept.hod_id || null,
        students: totalStudents,
        participated: resourcesAssigned,
        availableresources: 0, // Not available in current query
        totalresources: resourcesAssigned, // Using assigned resources as total for now
        percentage: Math.round(participationRate),
        missing: Math.max(0, totalStudents - resourcesAssigned),
        status: participationRate >= 90 ? 'excellent' :
          participationRate >= 70 ? 'good' :
            participationRate >= 50 ? 'fair' : 'needs_improvement',
        // Additional fields from query
        collegeName: dept.college_name,
        districtName: dept.district_name,
        stateName: dept.state_name,
        principalName: dept.principle_name,
        rank: participationRate
      };
    });

    // Generate recent activity data based on department data
    const recentActivity = departmentData
      .filter(dept => dept.participated > 0)
      .slice(0, 10)
      .map((dept) => ({
        type: 'resource_assignment' as const,
        message: `${dept.participated} resources assigned in ${dept.name}`,
        timestamp: new Date().toISOString(), // Using current time as placeholder
        status: 'active' as const,
        details: {
          departmentName: dept.name,
          resourcesAssigned: dept.participated,
          totalStudents: dept.students,
          participationRate: dept.percentage
        }
      }));

    // Prepare consolidated response
    const dashboardData = {
      stats: collegeStats,
      departmentData: departmentData,
      recentActivity: recentActivity,
      lastUpdated: new Date().toISOString()
    };

    console.log('📊 Consolidated Dashboard Data Summary:', {
      totalDepartments: departmentData.length,
      totalStudents: collegeStats.totalStudents,
      totalresources: collegeStats.totalresources,
      assignedresources: collegeStats.assignedresources,
      participationRate: collegeStats.participationRate,
      recentActivities: recentActivity.length
    });

    res.status(200).json({
      success: true,
      message: 'Principal dashboard data retrieved successfully',
      data: dashboardData,
    });

  } catch (error) {
    console.error('Error fetching principal dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch principal dashboard data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};
