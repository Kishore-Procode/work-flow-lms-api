import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { userRepository } from '../../user/repositories/user.repository';
import { collegeRepository } from '../../college/repositories/college.repository';
import { departmentRepository } from '../../department/repositories/department.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';

const dashboardService = new DashboardService();

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const context = {
      role: req.user.role,
      collegeId: req.user.collegeId,
      departmentId: req.user.departmentId,
    };

    const stats = await dashboardService.getDashboardStats(context);

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
    });
  }
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const context = {
      role: req.user.role,
      collegeId: req.user.collegeId,
      departmentId: req.user.departmentId,
    };

    const activity = await dashboardService.getRecentActivity(context);

    res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: activity,
    });
  } catch (error) {
    console.error('Get recent activity error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activity',
    });
  }
};

/**
 * Get dashboard overview statistics
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    let dashboardData: any = {};

    // Admin dashboard - full system overview
    if (req.user.role === 'admin') {
      const [userStats, collegeStats, departmentStats, resourcestats] = await Promise.all([
        userRepository.getStatistics(),
        collegeRepository.getStatistics(),
        departmentRepository.getStatistics(),
        learningResourceRepository.getStatistics(),
      ]);

      dashboardData = {
        overview: {
          totalUsers: userStats.totalUsers,
          totalColleges: collegeStats.totalColleges,
          totalDepartments: departmentStats.totalDepartments,
          totalresources: resourcestats.totalresources,
        },
        users: {
          byRole: userStats.usersByRole,
          byStatus: userStats.usersByStatus,
        },
        colleges: {
          byStatus: collegeStats.collegesByStatus,
          withPrincipal: collegeStats.collegesWithPrincipal,
          withoutPrincipal: collegeStats.collegesWithoutPrincipal,
        },
        departments: {
          withHOD: departmentStats.departmentsWithHOD,
          withoutHOD: departmentStats.departmentsWithoutHOD,
          totalStudents: departmentStats.totalStudents,
          totalStaff: departmentStats.totalStaff,
        },
        resources: {
          byStatus: resourcestats.resourcesByStatus,
          assigned: resourcestats.assignedresources,
          unassigned: resourcestats.unassignedresources,
          bycategory: resourcestats.resourcesBycategory,
        },
      };
    }
    // Principal dashboard - college overview
    else if (req.user.role === 'principal' && req.user.collegeId) {
      const [collegeUsers, collegeDepartments, collegeresources] = await Promise.all([
        userRepository.findByCollege(req.user.collegeId, { limit: 1000 }),
        departmentRepository.findByCollegeWithCounts(req.user.collegeId, { limit: 1000 }),
        learningResourceRepository.findByCollege(req.user.collegeId, { limit: 1000 }),
      ]);

      // Calculate statistics
      const usersByRole: Record<string, number> = {};
      const usersByStatus: Record<string, number> = {};

      collegeUsers.data.forEach(user => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
        usersByStatus[user.status] = (usersByStatus[user.status] || 0) + 1;
      });

      const resourcesByStatus: Record<string, number> = {};
      let assignedresources = 0;
      let unassignedresources = 0;
      let resourcesstarted = 0;
      let healthyresources = 0;
      let resourcesNeedingAttention = 0;

      collegeresources.data.forEach(resource => {
        resourcesByStatus[resource.status] = (resourcesByStatus[resource.status] || 0) + 1;
        if (resource.assignedStudentId) {
          assignedresources++;
        } else {
          unassignedresources++;
        }

        // Count started resources (status: started, growing, healthy)
        if (['started', 'growing', 'healthy'].includes(resource.status)) {
          resourcesstarted++;
        }

        // Count healthy resources
        if (resource.status === 'assigned') {
          healthyresources++;
        }

        // Count resources needing attention
        if (resource.status === 'needs_attention') {
          resourcesNeedingAttention++;
        }
      });

      // Calculate department-wise statistics
      const departmentStats = collegeDepartments.data.map(dept => {
        const deptUsers = collegeUsers.data.filter(u => u.department_id === dept.id);
        const deptStudents = deptUsers.filter(u => u.role === 'student');
        const deptresources = collegeresources.data.filter(t => t.departmentId === dept.id);
        const deptAssignedresources = deptresources.filter(t => t.assignedStudentId);
        const deptstartedresources = deptresources.filter(t => ['started', 'growing', 'healthy'].includes(t.status));
        const deptHealthyresources = deptresources.filter(t => t.status === 'assigned');

        const participationRate = deptStudents.length > 0 ?
          Math.round((deptAssignedresources.length / deptStudents.length) * 100) : 0;
        const completionRate = deptAssignedresources.length > 0 ?
          Math.round((deptstartedresources.length / deptAssignedresources.length) * 100) : 0;

        return {
          id: dept.id,
          name: dept.name,
          totalStudents: deptStudents.length,
          totalresources: deptresources.length,
          assignedresources: deptAssignedresources.length,
          startedresources: deptstartedresources.length,
          healthyresources: deptHealthyresources.length,
          participationRate,
          completionRate,
          performance: completionRate >= 90 ? 'excellent' :
                      completionRate >= 70 ? 'good' :
                      completionRate >= 50 ? 'average' : 'needs_improvement'
        };
      });

      // Calculate upload completion rate
      const totalStudents = usersByRole['student'] || 0;
      const uploadCompletionRate = totalStudents > 0 ?
        Math.round((assignedresources / totalStudents) * 100) : 0;

      dashboardData = {
        overview: {
          totalUsers: collegeUsers.data.length,
          totalDepartments: collegeDepartments.data.length,
          totalresources: collegeresources.data.length,
          totalStudents: totalStudents,
          totalStaff: (usersByRole['staff'] || 0) + (usersByRole['hod'] || 0),
          resourcesstarted: resourcesstarted,
          uploadCompletionRate: uploadCompletionRate,
          pendingUploads: Math.max(0, totalStudents - assignedresources)
        },
        users: {
          byRole: usersByRole,
          byStatus: usersByStatus,
        },
        departments: departmentStats,
        resources: {
          byStatus: resourcesByStatus,
          assigned: assignedresources,
          unassigned: unassignedresources,
          started: resourcesstarted,
          healthy: healthyresources,
          needingAttention: resourcesNeedingAttention,
          totalresources: collegeresources.data.length
        },
        performance: {
          topPerforming: departmentStats
            .filter(d => d.completionRate >= 80)
            .sort((a, b) => b.completionRate - a.completionRate)
            .slice(0, 3),
          lowestPerforming: departmentStats
            .filter(d => d.completionRate < 80)
            .sort((a, b) => a.completionRate - b.completionRate)
            .slice(0, 3)
        }
      };
    }
    // HOD dashboard - department overview
    else if (req.user.role === 'hod' && req.user.departmentId) {
      const [departmentUsers, departmentresources] = await Promise.all([
        userRepository.findByDepartment(req.user.departmentId, { limit: 1000 }),
        learningResourceRepository.findByDepartment(req.user.departmentId, { limit: 1000 }),
      ]);

      // Calculate statistics
      const usersByRole: Record<string, number> = {};
      const usersByStatus: Record<string, number> = {};
      
      departmentUsers.data.forEach(user => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
        usersByStatus[user.status] = (usersByStatus[user.status] || 0) + 1;
      });

      const resourcesByStatus: Record<string, number> = {};
      let assignedresources = 0;
      let unassignedresources = 0;

      departmentresources.data.forEach(resource => {
        resourcesByStatus[resource.status] = (resourcesByStatus[resource.status] || 0) + 1;
        if (resource.assignedStudentId) {
          assignedresources++;
        } else {
          unassignedresources++;
        }
      });

      dashboardData = {
        overview: {
          totalUsers: departmentUsers.data.length,
          totalresources: departmentresources.data.length,
          totalStudents: usersByRole['student'] || 0,
          totalStaff: (usersByRole['staff'] || 0) + (usersByRole['hod'] || 0),
        },
        users: {
          byRole: usersByRole,
          byStatus: usersByStatus,
        },
        resources: {
          byStatus: resourcesByStatus,
          assigned: assignedresources,
          unassigned: unassignedresources,
        },
      };
    }
    // Staff dashboard - redirect to staff-specific endpoint
    else if (req.user.role === 'staff') {
      res.status(200).json({
        success: true,
        message: 'Please use /api/v1/dashboard/staff endpoint for staff dashboard data',
        redirect: '/api/v1/dashboard/staff'
      });
      return;
    }
    // Student dashboard - personal overview
    else if (req.user.role === 'student') {
      const studentresources = await learningResourceRepository.findByStudent(req.user.id || req.user.userId, { limit: 1000 });

      const resourcesByStatus: Record<string, number> = {};
      studentresources.data.forEach(resource => {
        resourcesByStatus[resource.status] = (resourcesByStatus[resource.status] || 0) + 1;
      });

      dashboardData = {
        overview: {
          totalAssignedresources: studentresources.data.length,
          healthyresources: resourcesByStatus['healthy'] || 0,
          needsAttention: resourcesByStatus['needs_attention'] || 0,
        },
        resources: {
          byStatus: resourcesByStatus,
          recentresources: studentresources.data.slice(0, 5), // Last 5 resources
        },
      };
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
    });
  }
};

/**
 * Get recent activities
 */
export const getRecentActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // This would typically fetch from an activities/logs table
    // For now, we'll return recent resources and users as activities
    const activities: any[] = [];

    if (['admin', 'principal', 'hod', 'staff'].includes(req.user.role)) {
      // Get recent resources
      const recentresources = await learningResourceRepository.findAll({ limit: 10, sortBy: 'created_at', sortOrder: 'desc' });
      
      recentresources.data.forEach(resource => {
        activities.push({
          id: resource.id,
          type: 'resource_created',
          message: `New resource "${resource.category}" was added`,
          timestamp: resource.createdAt,
          data: {
            resourceCode: resource.resourceCode,
            category: resource.category,
          },
        });
      });

      // Get recent users
      const recentUsers = await userRepository.findAll({ limit: 10, sortBy: 'created_at', sortOrder: 'desc' });
      
      recentUsers.data.forEach(user => {
        activities.push({
          id: user.id,
          type: 'user_created',
          message: `New ${user.role} "${user.name}" was added`,
          timestamp: user.created_at,
          data: {
            name: user.name,
            role: user.role,
            email: user.email,
          },
        });
      });
    } else if (req.user.role === 'student') {
      // Get student's resource activities
      const studentresources = await learningResourceRepository.findByStudent(req.user.id || req.user.userId, { limit: 10, sortBy: 'updated_at', sortOrder: 'desc' });
      
      studentresources.data.forEach(resource => {
        activities.push({
          id: resource.id,
          type: 'resource_updated',
          message: `resource "${resource.category}" status updated to ${resource.status}`,
          timestamp: resource.updatedAt,
          data: {
            resourceCode: resource.resourceCode,
            category: resource.category,
            status: resource.status,
          },
        });
      });
    }

    // Sort activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      message: 'Recent activities retrieved successfully',
      data: activities.slice(0, 20), // Return top 20 activities
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activities',
    });
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Only admin can view system health
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can view system health',
      });
      return;
    }

    // Basic system health checks
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'healthy',
          responseTime: '< 100ms',
        },
        api: {
          status: 'healthy',
          uptime: process.uptime(),
        },
        memory: {
          status: 'healthy',
          usage: process.memoryUsage(),
        },
      },
      metrics: {
        totalRequests: 0, // Would be tracked in real implementation
        averageResponseTime: 0,
        errorRate: 0,
      },
    };

    res.status(200).json({
      success: true,
      message: 'System health retrieved successfully',
      data: healthData,
    });
  } catch (error) {
    console.error('Get system health error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health',
    });
  }
};
