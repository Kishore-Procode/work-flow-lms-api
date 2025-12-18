import { userRepository } from '../../user/repositories/user.repository';
import { collegeRepository } from '../../college/repositories/college.repository';
import { departmentRepository } from '../../department/repositories/department.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { invitationRepository } from '../../invitation/repositories/invitation.repository';
import { registrationRepository } from '../../registration/repositories/registration.repository';
import { pool } from '../../../config/database';

export interface DashboardStats {
  totalUsers: number;
  totalColleges: number;
  totalDepartments: number;
  totalresources: number;
  activeUsers: number;
  pendingInvitations: number;
  pendingRegistrations: number;
  usersByRole: {
    admin: number;
    principal: number;
    hod: number;
    staff: number;
    student: number;
  };
  resourcesByStatus: {
    started: number;
    growing: number;
    mature: number;
    dead: number;
  };
  // Optional cross-institutional reports for improvement analysis
  crossCollegeReports?: any[];
  crossDepartmentReports?: any[];
  otherCollegeDepartments?: any[];
  collegeDepartments?: any[];
}

export interface RecentActivity {
  id: string;
  type: 'user_created' | 'resource_started' | 'invitation_sent' | 'registration_request';
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
}

export class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(context: { role: string; collegeId?: string; departmentId?: string }): Promise<DashboardStats> {
    try {
      // Get basic counts
      const [
        userStats,
        collegeStats,
        departmentStats,
        resourcestats,
        invitationStats,
        registrationStats
      ] = await Promise.all([
        userRepository.getStatistics(),
        collegeRepository.getStatistics(),
        departmentRepository.getStatistics(),
        learningResourceRepository.getStatistics(),
        invitationRepository.getStatistics(),
        registrationRepository.getStatistics()
      ]);

      // Apply role-based filtering for specific stats
      let filteredStats = {
        totalUsers: userStats.totalUsers || 0,
        totalColleges: collegeStats.totalColleges || 0,
        totalDepartments: departmentStats.totalDepartments || 0,
        totalresources: resourcestats.totalresources || 0,
        activeUsers: userStats.usersByStatus?.active || 0,
        pendingInvitations: invitationStats.invitationsByStatus?.pending || 0,
        pendingRegistrations: registrationStats.registrationsByStatus?.pending || 0,
        usersByRole: {
          admin: userStats.usersByRole?.admin || 0,
          principal: userStats.usersByRole?.principal || 0,
          hod: userStats.usersByRole?.hod || 0,
          staff: userStats.usersByRole?.staff || 0,
          student: userStats.usersByRole?.student || 0,
        },
        resourcesByStatus: {
          started: resourcestats.resourcesByStatus?.assigned || 0,
          growing: resourcestats.resourcesByStatus?.healthy || 0,
          mature: resourcestats.resourcesByStatus?.healthy || 0,
          dead: resourcestats.resourcesByStatus?.deceased || 0,
        },
      };

      // Apply role-based filtering with cross-institutional visibility for improvement
      if (context.role === 'principal' && context.collegeId) {
        const collegeStats = await this.getCollegeSpecificStats(context.collegeId);
        filteredStats = { ...filteredStats, ...collegeStats };
        
        // Add cross-college reports for improvement analysis
        (filteredStats as DashboardStats).crossCollegeReports = await this.getCrossCollegeReports(context.collegeId);
      } else if (context.role === 'hod' && context.departmentId) {
        const departmentStats = await this.getDepartmentSpecificStats(context.departmentId);
        filteredStats = { ...filteredStats, ...departmentStats };
        
        // Add cross-department reports for improvement analysis
        (filteredStats as DashboardStats).crossDepartmentReports = await this.getCrossDepartmentReports(context.departmentId);
        (filteredStats as DashboardStats).otherCollegeDepartments = await this.getSameDepartmentOtherColleges(context.departmentId);
      } else if (context.role === 'staff' && context.departmentId) {
        const departmentStats = await this.getDepartmentSpecificStats(context.departmentId);
        filteredStats = { ...filteredStats, ...departmentStats };
        
        // Staff can see other department reports in same college for learning
        (filteredStats as DashboardStats).collegeDepartments = await this.getCollegeDepartmentReports(context.departmentId);
      }

      return filteredStats;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      // Return default stats if there's an error
      return {
        totalUsers: 0,
        totalColleges: 0,
        totalDepartments: 0,
        totalresources: 0,
        activeUsers: 0,
        pendingInvitations: 0,
        pendingRegistrations: 0,
        usersByRole: {
          admin: 0,
          principal: 0,
          hod: 0,
          staff: 0,
          student: 0,
        },
        resourcesByStatus: {
          started: 0,
          growing: 0,
          mature: 0,
          dead: 0,
        },
      };
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(context: { role: string; collegeId?: string; departmentId?: string }): Promise<RecentActivity[]> {
    try {
      // This is a simplified implementation
      // In a real application, you might have an activity log table
      const activities: RecentActivity[] = [];

      // Get recent users (last 10)
      const recentUsers = await userRepository.findAll({ limit: 5, sortBy: 'created_at', sortOrder: 'desc' });
      recentUsers.data.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'user_created',
          description: `New ${user.role} ${user.name} joined`,
          timestamp: user.createdAt,
          userId: user.id,
          userName: user.name,
        });
      });

      // Get recent resources (last 5)
      const recentresources = await learningResourceRepository.findAll({ limit: 5, sortBy: 'created_at', sortOrder: 'desc' });
      recentresources.data.forEach(resource => {
        activities.push({
          id: `resource_${resource.id}`,
          type: 'resource_started',
          description: `New ${resource.category} resource started at ${resource.locationDescription}`,
          timestamp: resource.createdAt,
          userId: resource.assignedStudentId,
          userName: resource.assignedStudentId, // Using ID as name since name is not available
        });
      });

      // Sort by timestamp and return latest 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get college-specific statistics
   */
  private async getCollegeSpecificStats(collegeId: string): Promise<Partial<DashboardStats>> {
    try {
      const [userCount, departmentCount, resourceCount] = await Promise.all([
        userRepository.findAll({ collegeId, limit: 1 }).then(result => result.pagination.total),
        departmentRepository.findByCollege(collegeId, { limit: 1 }).then(result => result.pagination.total),
        learningResourceRepository.getStatistics()
      ]);

      return {
        totalUsers: userCount,
        totalDepartments: departmentCount,
        totalresources: resourceCount.totalresources || 0,
        resourcesByStatus: {
          started: resourceCount.resourcesByStatus?.assigned || 0,
          growing: resourceCount.resourcesByStatus?.healthy || 0,
          mature: resourceCount.resourcesByStatus?.healthy || 0,
          dead: resourceCount.resourcesByStatus?.deceased || 0,
        },
      };
    } catch (error) {
      console.error('Error getting college-specific stats:', error);
      return {};
    }
  }

  /**
   * Get department-specific statistics
   */
  private async getDepartmentSpecificStats(departmentId: string): Promise<Partial<DashboardStats>> {
    try {
      const [userCount, resourceCount] = await Promise.all([
        userRepository.findAll({ departmentId, limit: 1 }).then(result => result.pagination.total),
        learningResourceRepository.getStatistics()
      ]);

      return {
        totalUsers: userCount,
        totalresources: resourceCount.totalresources || 0,
        resourcesByStatus: {
          started: resourceCount.resourcesByStatus?.assigned || 0,
          growing: resourceCount.resourcesByStatus?.healthy || 0,
          mature: resourceCount.resourcesByStatus?.healthy || 0,
          dead: resourceCount.resourcesByStatus?.deceased || 0,
        },
      };
    } catch (error) {
      console.error('Error getting department-specific stats:', error);
      return {};
    }
  }

  /**
   * Get cross-college reports for principal comparison and improvement
   */
  private async getCrossCollegeReports(currentCollegeId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT d.id) as total_departments,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT t.id) as total_resources,
          COUNT(DISTINCT CASE WHEN t.status = 'healthy' THEN t.id END) as healthy_resources
        FROM colleges c
        LEFT JOIN users u ON c.id = u.college_id
        LEFT JOIN departments d ON c.id = d.college_id
        LEFT JOIN resources t ON u.id = t.assigned_student_id
        WHERE c.id != $1
        GROUP BY c.id, c.name
        ORDER BY total_students DESC
        LIMIT 10
      `;
      
      const result = await pool.query(query, [currentCollegeId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting cross-college reports:', error);
      return [];
    }
  }

  /**
   * Get cross-department reports for HOD comparison within college
   */
  private async getCrossDepartmentReports(currentDepartmentId: string): Promise<any[]> {
    try {
      // First get the college ID of current department
      const departmentQuery = `SELECT college_id FROM departments WHERE id = $1`;
      const deptResult = await pool.query(departmentQuery, [currentDepartmentId]);
      
      if (deptResult.rows.length === 0) return [];
      
      const collegeId = deptResult.rows[0].college_id;
      
      const query = `
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT CASE WHEN u.role = 'staff' THEN u.id END) as total_staff,
          COUNT(DISTINCT t.id) as total_resources,
          COUNT(DISTINCT CASE WHEN t.status = 'healthy' THEN t.id END) as healthy_resources
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id
        LEFT JOIN resources t ON u.id = t.assigned_student_id
        WHERE d.college_id = $1 AND d.id != $2
        GROUP BY d.id, d.name
        ORDER BY total_students DESC
      `;
      
      const result = await pool.query(query, [collegeId, currentDepartmentId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting cross-department reports:', error);
      return [];
    }
  }

  /**
   * Get same department from other colleges for HOD learning
   */
  private async getSameDepartmentOtherColleges(currentDepartmentId: string): Promise<any[]> {
    try {
      // Get current department name and college
      const currentDeptQuery = `SELECT name, college_id FROM departments WHERE id = $1`;
      const currentDeptResult = await pool.query(currentDeptQuery, [currentDepartmentId]);
      
      if (currentDeptResult.rows.length === 0) return [];
      
      const departmentName = currentDeptResult.rows[0].name;
      const currentCollegeId = currentDeptResult.rows[0].college_id;
      
      const query = `
        SELECT 
          d.id,
          d.name,
          c.name as college_name,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT t.id) as total_resources,
          COUNT(DISTINCT CASE WHEN t.status = 'healthy' THEN t.id END) as healthy_resources
        FROM departments d
        JOIN colleges c ON d.college_id = c.id
        LEFT JOIN users u ON d.id = u.department_id
        LEFT JOIN resources t ON u.id = t.assigned_student_id
        WHERE d.name ILIKE $1 AND d.college_id != $2
        GROUP BY d.id, d.name, c.name
        ORDER BY total_students DESC
        LIMIT 10
      `;
      
      const result = await pool.query(query, [`%${departmentName}%`, currentCollegeId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting same department other colleges:', error);
      return [];
    }
  }

  /**
   * Get other department reports in same college for staff learning
   */
  private async getCollegeDepartmentReports(currentDepartmentId: string): Promise<any[]> {
    try {
      // First get the college ID of current department
      const departmentQuery = `SELECT college_id FROM departments WHERE id = $1`;
      const deptResult = await pool.query(departmentQuery, [currentDepartmentId]);
      
      if (deptResult.rows.length === 0) return [];
      
      const collegeId = deptResult.rows[0].college_id;
      
      const query = `
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT t.id) as total_resources,
          COUNT(DISTINCT CASE WHEN t.status = 'healthy' THEN t.id END) as healthy_resources
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id
        LEFT JOIN resources t ON u.id = t.assigned_student_id
        WHERE d.college_id = $1 AND d.id != $2
        GROUP BY d.id, d.name
        ORDER BY total_students DESC
      `;
      
      const result = await pool.query(query, [collegeId, currentDepartmentId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting college department reports:', error);
      return [];
    }
  }
}
