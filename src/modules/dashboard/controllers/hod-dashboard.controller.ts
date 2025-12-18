import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { userRepository } from '../../user/repositories/user.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { registrationRepository } from '../../registration/repositories/registration.repository';
import { resourceImageRepository } from '../../upload/repositories/tree-image.repository';

/**
 * Get consolidated HOD dashboard data with single API call
 */
export const getHODDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== 'hod') {
      res.status(403).json({
        success: false,
        message: 'HOD access required',
      });
      return;
    }

    const departmentId = req.user.departmentId;
    if (!departmentId) {
      res.status(400).json({
        success: false,
        message: 'Department ID not found for HOD',
      });
      return;
    }

    // Consolidate all data fetching into parallel queries
    const [
      departmentUsers,
      departmentresources,
      registrationRequestsResult,
      recentresourceImages,
      departmentStats
    ] = await Promise.all([
      userRepository.findByDepartment(departmentId, { limit: 1000 }),
      learningResourceRepository.findByDepartment(departmentId, { limit: 1000 }),
      registrationRepository.findByDepartment(departmentId),
      resourceImageRepository.getRecentByDepartment ?
        resourceImageRepository.getRecentByDepartment(departmentId, 30) :
        Promise.resolve([]), // Fallback if method doesn't exist
      userRepository.getDepartmentStatistics(departmentId)
    ]);

    // Extract registration requests from paginated result
    const registrationRequests = registrationRequestsResult.data || [];

    // Process users data - only count active users for consistency with Class In-Charge interface
    const students = departmentUsers.data.filter(u => u.role === 'student' && u.status === 'active');
    const staff = departmentUsers.data.filter(u => (u.role === 'staff' || u.role === 'hod') && u.status === 'active');

    // Process resources data - initial status distribution
    const allresourcesByStatus = departmentresources.data.reduce((acc: any, resource) => {
      acc[resource.status] = (acc[resource.status] || 0) + 1;
      return acc;
    }, {});

    // Helper function to get assigned student ID from resource (following Principal Dashboard pattern)
    const getAssignedStudentId = (resource: any) => {
      return resource.assignedStudentId || resource.assigned_student_id;
    };

    // Filter resources by assignment status
    const assignedresources = departmentresources.data.filter(t => getAssignedStudentId(t));
    const availableresources = departmentresources.data.filter(t => !getAssignedStudentId(t));

    // Calculate year-wise student distribution with proper resource assignments
    const yearWiseStats = ['1st Year', '2nd Year', '3rd Year', '4th Year'].map(yearName => {
      const yearStudents = students.filter(s => s.year_of_study === yearName);
      const yearAssignedresources = assignedresources.filter(t =>
        yearStudents.some(s => s.id === getAssignedStudentId(t))
      );

      return {
        yearName,
        year: yearName,
        totalStudents: yearStudents.length,
        participatedStudents: yearAssignedresources.length,
        participated: yearAssignedresources.length,
        resourcesAssigned: yearAssignedresources.length,
        recentUploads: recentresourceImages.filter(img =>
          yearStudents.some(s => s.id === img.studentId)
        ).length,
        percentage: yearStudents.length > 0 ? Math.round((yearAssignedresources.length / yearStudents.length) * 100) : 0
      };
    });

    // Calculate resource status distribution (only for assigned resources)
    const resourcesByStatus = assignedresources.reduce((acc, resource) => {
      const status = resource.status || 'assigned';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find students with missing uploads (no uploads in last 30 days)
    const studentsWithRecentUploads = new Set(recentresourceImages.map(img => img.studentId));
    const studentsWithMissingUploads = students
      .filter(student => !studentsWithRecentUploads.has(student.id))
      .map(student => {
        const studentAssignedresources = assignedresources.filter(t => getAssignedStudentId(t) === student.id);
        const lastUpload = recentresourceImages
          .filter(img => img.studentId === student.id)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

        return {
          studentName: student.name,
          name: student.name,
          registrationNumber: student.roll_number,
          registerNumber: student.roll_number,
          regNo: student.roll_number,
          yearOfStudy: student.year_of_study,
          year: student.year_of_study,
          assignedresources: studentAssignedresources.length,
          lastUpload: lastUpload ? new Date(lastUpload.uploadedAt).toLocaleDateString() : 'Never',
          lastUploadDate: lastUpload ? lastUpload.uploadedAt : null,
          semestersMissed: lastUpload ? 0 : Math.floor(Math.random() * 5) + 1, // Placeholder calculation
          semMissed: lastUpload ? 0 : Math.floor(Math.random() * 5) + 1,
          daysSinceLastUpload: lastUpload ? Math.floor((Date.now() - new Date(lastUpload.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)) : null
        };
      })
      .slice(0, 10); // Top 10

    // Calculate performance metrics
    const uploadCompletionRate = students.length > 0 
      ? Math.round((studentsWithRecentUploads.size / students.length) * 100) 
      : 0;

    // Calculate resource health rate (healthy + growing resources out of assigned resources)
    const healthyresourceCount = (resourcesByStatus.healthy || 0) + (resourcesByStatus.growing || 0);
    const resourceHealthRate = assignedresources.length > 0
      ? Math.round((healthyresourceCount / assignedresources.length) * 100)
      : 0;

    // Recent activity from resource uploads
    const recentActivity = recentresourceImages
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 10)
      .map(img => {
        const student = students.find(s => s.id === img.studentId);
        return {
          id: img.id,
          type: 'resource_upload',
          description: `${student?.name || 'Student'} uploaded resource progress photo`,
          timestamp: img.uploadedAt,
          studentName: student?.name,
          resourceId: img.resourceId,
          imageType: img.imageType
        };
      });

    // Students summary with comprehensive data using assigned resources
    const studentsSummary = students.map(student => {
      const studentAssignedresources = assignedresources.filter(t => getAssignedStudentId(t) === student.id);
      const studentImages = recentresourceImages.filter(img => img.studentId === student.id);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.roll_number,
        yearOfStudy: student.year_of_study,
        section: (student as any).section,
        assignedresources: studentAssignedresources.length,
        healthyresources: studentAssignedresources.filter(t => t.status === 'healthy').length,
        recentUploads: studentImages.length,
        lastUploadDate: studentImages.length > 0
          ? studentImages.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0].uploadedAt
          : null,
        status: student.status,
        semester: student.semester
      };
    });

    // Get department name from database
    const departmentQuery = `
      SELECT name FROM departments WHERE id = $1
    `;
    const departmentResult = await pool.query(departmentQuery, [departmentId]);
    const departmentName = departmentResult.rows[0]?.name || 'Unknown Department';

    // Consolidated dashboard response
    const dashboardData = {
      departmentName,
      statistics: {
        departmentStaff: staff.length,
        departmentStudents: students.length,
        pendingRequests: registrationRequests.filter(r => r.status === 'pending').length,
        totalresources: departmentresources.data.length,
        assignedresources: assignedresources.length,
        availableresources: availableresources.length,
        activeresources: assignedresources.length, // resources that are assigned to students
        resourcesstarted: assignedresources.length, // Same as assigned resources for HOD dashboard
        uploadCompletionRate,
        resourceHealthRate
      },
      yearWiseStats,
      resourcesByStatus,
      studentsWithMissingUploads,
      recentActivity,
      studentsSummary: studentsSummary.slice(0, 50), // Limit for performance
      performanceMetrics: {
        averageresourcesPerStudent: students.length > 0 ? Math.round(assignedresources.length / students.length * 10) / 10 : 0,
        uploadFrequency: recentresourceImages.length,
        departmentRanking: departmentStats?.ranking || 'N/A',
        improvementAreas: [
          uploadCompletionRate < 80 ? 'Upload Completion' : null,
          resourceHealthRate < 85 ? 'resource Health' : null,
          studentsWithMissingUploads.length > 10 ? 'Student Engagement' : null
        ].filter(Boolean)
      },
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'HOD dashboard data retrieved successfully',
      data: dashboardData,
    });

  } catch (error) {
    console.error('Error getting HOD dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve HOD dashboard data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get department progress monitoring data
 */
export const getDepartmentProgressMonitoring = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'hod') {
      res.status(403).json({
        success: false,
        message: 'HOD access required',
      });
      return;
    }

    const departmentId = req.user.departmentId;
    const { year, section, status } = req.query;

    // Build filters
    const filters: any = { departmentId };
    if (year) filters.yearOfStudy = parseInt(year as string);
    if (section) filters.section = section as string;
    if (status) filters.status = status as string;

    // Get filtered students with their resource data
    const students = await (userRepository as any).findStudentsWithresourceData(filters);

    res.status(200).json({
      success: true,
      message: 'Department progress monitoring data retrieved successfully',
      data: students,
    });

  } catch (error) {
    console.error('Error getting department progress monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve progress monitoring data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Add staff member to department
 */
export const addDepartmentStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'hod') {
      res.status(403).json({
        success: false,
        message: 'HOD access required',
      });
      return;
    }

    const { name, email, phone, designation, qualification, experience } = req.body;
    const departmentId = req.user.departmentId;
    const collegeId = req.user.collegeId;

    // Create staff user
    const staffData = {
      name,
      email,
      phone,
      role: 'staff',
      status: 'active',
      collegeId,
      departmentId,
      designation,
      qualification,
      experience: experience ? parseInt(experience) : null,
      password: 'TempPassword@123' // Temporary password
    };

    const staffDataWithHash = {
      ...staffData,
      passwordHash: staffData.password,
      role: staffData.role as any, // Cast to UserRole type
      status: staffData.status as any // Cast to UserStatus type
    };
    delete (staffDataWithHash as any).password;
    const newStaff = await userRepository.createUser(staffDataWithHash);

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      data: newStaff,
    });

  } catch (error) {
    console.error('Error adding department staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add staff member',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};
