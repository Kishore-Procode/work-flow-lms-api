import { Request, Response } from 'express';
import { departmentRepository } from '../repositories/department.repository';
import { userRepository } from '../../user/repositories/user.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';

/**
 * Get comprehensive department summary for HOD and Principal roles
 */
export const getDepartmentSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.params;
    const { user } = req;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Verify access permissions
    if (user.role === 'hod' && user.departmentId !== departmentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. HODs can only view their own department.',
      });
      return;
    }

    if (user.role === 'principal') {
      // Verify department belongs to principal's college
      const department = await departmentRepository.findById(departmentId);
      if (!department || department.collegeId !== user.collegeId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Department not found in your college.',
        });
        return;
      }
    }

    // Get department details
    const department = await departmentRepository.findByIdWithDetails(departmentId);
    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Department not found',
      });
      return;
    }

    // Get department users (students and staff)
    const [departmentUsers, departmentresources] = await Promise.all([
      userRepository.findByDepartment(departmentId, { limit: 1000 }),
      learningResourceRepository.findByDepartment(departmentId, { limit: 1000 })
    ]);

    // Separate students and staff
    const students = departmentUsers.data.filter(u => u.role === 'student');
    const staff = departmentUsers.data.filter(u => u.role === 'staff' || u.role === 'hod');

    // Calculate year-wise distribution
    const yearWiseStats = [1, 2, 3, 4].map(year => {
      const yearStudents = students.filter(s => s.year_of_study === String(year));
      const yearresources = departmentresources.data.filter(t => 
        yearStudents.some(s => s.id === t.assignedStudentId)
      );
      
      return {
        year,
        totalStudents: yearStudents.length,
        resourcesstarted: yearresources.length,
        activeStudents: yearresources.filter(t => t.status === 'assigned').length,
        percentage: students.length > 0 ? Math.round((yearStudents.length / students.length) * 100) : 0
      };
    });

    // Calculate resource statistics
    const resourcestats = {
      total: departmentresources.data.length,
      healthy: departmentresources.data.filter(t => t.status === 'healthy').length,
      growing: departmentresources.data.filter(t => t.status === 'assigned').length,
      needsAttention: departmentresources.data.filter(t => t.status === 'needs_attention').length,
      assigned: departmentresources.data.filter(t => t.assignedStudentId).length,
      unassigned: departmentresources.data.filter(t => !t.assignedStudentId).length
    };

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUploads = departmentresources.data.filter(t => {
      const uploadDate = new Date((t as any).lastPhotoUpload || t.createdAt);
      return uploadDate >= thirtyDaysAgo;
    }).length;

    // Find students with missing uploads
    const studentsWithMissingUploads = students.filter(student => {
      const studentresources = departmentresources.data.filter(t => t.assignedStudentId === student.id);
      if (studentresources.length === 0) return true;
      
      const hasRecentUpload = studentresources.some(t => {
        const uploadDate = new Date((t as any).lastPhotoUpload || t.createdAt);
        return uploadDate >= thirtyDaysAgo;
      });
      
      return !hasRecentUpload;
    }).map(student => ({
      ...student,
      daysSinceLastUpload: Math.floor((Date.now() - new Date((student as any).lastPhotoUpload || student.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => (b.daysSinceLastUpload || 0) - (a.daysSinceLastUpload || 0));

    // Calculate performance metrics
    const performanceMetrics = {
      participationRate: students.length > 0 ? Math.round((resourcestats.assigned / students.length) * 100) : 0,
      uploadCompletionRate: students.length > 0 ? Math.round((recentUploads / students.length) * 100) : 0,
      resourceHealthRate: resourcestats.total > 0 ? Math.round(((resourcestats.healthy + resourcestats.growing) / resourcestats.total) * 100) : 0,
      averageUploadsPerStudent: students.length > 0 ? Math.round((recentUploads / students.length) * 10) / 10 : 0
    };

    const summaryData = {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        collegeName: department.collegeName,
        hodName: department.hodName,
        established: department.established
      },
      statistics: {
        totalStudents: students.length,
        totalStaff: staff.length,
        totalresources: resourcestats.total,
        activeresources: resourcestats.healthy + resourcestats.growing,
        recentUploads,
        missingUploads: studentsWithMissingUploads.length
      },
      yearWiseStats,
      resourcestats,
      performanceMetrics,
      studentsWithMissingUploads: studentsWithMissingUploads.slice(0, 10), // Top 10
      recentActivity: departmentresources.data
        .filter(t => new Date((t as any).lastPhotoUpload || t.createdAt) >= thirtyDaysAgo)
        .sort((a, b) => new Date((b as any).lastPhotoUpload || b.createdAt).getTime() - new Date((a as any).lastPhotoUpload || a.createdAt).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          studentName: students.find(s => s.id === t.assignedStudentId)?.name || 'Unknown',
          resourcecategory: t.category,
          uploadDate: (t as any).lastPhotoUpload || t.createdAt,
          status: t.status
        }))
    };

    res.status(200).json({
      success: true,
      message: 'Department summary retrieved successfully',
      data: summaryData,
    });

  } catch (error) {
    console.error('Error getting department summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department summary',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get department comparison data for Principal role
 */
export const getDepartmentComparison = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req;

    if (!user || user.role !== 'principal') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Principal role required.',
      });
      return;
    }

    // Get all departments in principal's college
    const collegeDepartments = await departmentRepository.findByCollegeWithCounts(user.collegeId!, { limit: 100 });

    const comparisonData = await Promise.all(
      collegeDepartments.data.map(async (dept) => {
        const [deptUsers, deptresources] = await Promise.all([
          userRepository.findByDepartment(dept.id, { limit: 1000 }),
          learningResourceRepository.findByDepartment(dept.id, { limit: 1000 })
        ]);

        const students = deptUsers.data.filter(u => u.role === 'student');
        const activeresources = deptresources.data.filter(t => t.status === 'assigned');

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          totalStudents: students.length,
          totalresources: deptresources.data.length,
          activeresources: activeresources.length,
          participationRate: students.length > 0 ? Math.round((deptresources.data.length / students.length) * 100) : 0,
          healthRate: deptresources.data.length > 0 ? Math.round((activeresources.length / deptresources.data.length) * 100) : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Department comparison data retrieved successfully',
      data: comparisonData,
    });

  } catch (error) {
    console.error('Error getting department comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department comparison',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};
