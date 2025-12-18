import { Request, Response } from 'express';
import { userRepository } from '../../user/repositories/user.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { courseRepository } from '../../course/repositories/course.repository';
import { departmentRepository } from '../../department/repositories/department.repository';

/**
 * Get comprehensive progress monitoring data for Principal role
 */
export const getPrincipalProgressMonitoring = async (req: Request, res: Response): Promise<void> => {
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

    const { courseId, departmentId, year, status } = req.query;

    // Build filters
    const filters: any = { collegeId };
    if (courseId && courseId !== 'all') filters.courseId = courseId as string;
    if (departmentId && departmentId !== 'all') filters.departmentId = departmentId as string;
    if (year && year !== 'all') filters.yearOfStudy = parseInt(year as string);
    if (status && status !== 'all') filters.status = status as string;

    // Get all courses in the college
    const collegeCourses = await courseRepository.findByCollege(collegeId, { limit: 100 });

    // Build hierarchical progress data
    const progressData = await Promise.all(
      collegeCourses.data.map(async (course) => {
        // Skip if course filter is applied and doesn't match
        if (courseId && courseId !== 'all' && course.id !== courseId) {
          return null;
        }

        // Get departments for this course
        const courseDepartments = await (departmentRepository as any).findByCourse(course.id, { limit: 100 });

        const departments = await Promise.all(
          courseDepartments.data.map(async (department) => {
            // Skip if department filter is applied and doesn't match
            if (departmentId && departmentId !== 'all' && department.id !== departmentId) {
              return null;
            }

            // Get students for this department with resource data
            const departmentStudents = await (userRepository as any).findStudentsWithresourceData({
              ...filters,
              departmentId: department.id,
              role: 'student'
            });

            // Group students by year and section
            const yearGroups: { [key: number]: { [key: string]: any[] } } = {};
            
            departmentStudents.forEach((student: any) => {
              const year = student.yearOfStudy || 1;
              const section = student.section || 'A';
              
              if (!yearGroups[year]) yearGroups[year] = {};
              if (!yearGroups[year][section]) yearGroups[year][section] = [];
              
              // Calculate resource assignment status
              const assignedresources = student.resources?.length || 0;
              const healthyresources = student.resources?.filter((t: any) => t.status === 'healthy' || t.status === 'growing').length || 0;
              const recentUploads = student.recentUploads || 0;
              
              const resourceAssignmentStatus = assignedresources > 0 ? 'assigned' : 
                                         student.status === 'pending' ? 'pending' : 'not_assigned';

              yearGroups[year][section].push({
                id: student.id,
                name: student.name,
                email: student.email,
                rollNumber: student.rollNumber,
                yearOfStudy: year,
                section: section,
                courseName: course.name,
                departmentName: department.name,
                assignedresources,
                healthyresources,
                recentUploads,
                lastUploadDate: student.lastUploadDate,
                status: student.status,
                resourceAssignmentStatus
              });
            });

            // Convert to required format
            const years = Object.keys(yearGroups).map(yearKey => {
              const year = parseInt(yearKey);
              const sections = Object.keys(yearGroups[year]).map(sectionKey => {
                const students = yearGroups[year][sectionKey];
                const totalStudents = students.length;
                const assignedresources = students.reduce((sum, s) => sum + s.assignedresources, 0);
                const activeStudents = students.filter(s => s.status === 'active').length;
                const completionRate = totalStudents > 0 
                  ? Math.round((students.filter(s => s.assignedresources > 0).length / totalStudents) * 100)
                  : 0;

                return {
                  section: sectionKey,
                  students,
                  stats: {
                    totalStudents,
                    assignedresources,
                    activeStudents,
                    completionRate
                  }
                };
              });

              return { year, sections };
            });

            return {
              departmentId: department.id,
              departmentName: department.name,
              years
            };
          })
        );

        return {
          courseId: course.id,
          courseName: course.name,
          departments: departments.filter(d => d !== null)
        };
      })
    );

    const filteredProgressData = progressData.filter(p => p !== null);

    res.status(200).json({
      success: true,
      message: 'Principal progress monitoring data retrieved successfully',
      data: filteredProgressData,
    });

  } catch (error) {
    console.error('Error getting principal progress monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve progress monitoring data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get filter options for progress monitoring
 */
export const getProgressFilterOptions = async (req: Request, res: Response): Promise<void> => {
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

    // Get all courses and departments for the college
    const [collegeCourses, collegeDepartments] = await Promise.all([
      courseRepository.findByCollege(collegeId, { limit: 100 }),
      departmentRepository.findByCollege(collegeId, { limit: 100 })
    ]);

    const filterOptions = {
      courses: collegeCourses.data.map(course => ({
        id: course.id,
        name: course.name,
        code: course.code
      })),
      departments: collegeDepartments.data.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        courseId: dept.course_id
      })),
      years: [
        { value: 1, label: '1st Year' },
        { value: 2, label: '2nd Year' },
        { value: 3, label: '3rd Year' },
        { value: 4, label: '4th Year' }
      ],
      statuses: [
        { value: 'assigned', label: 'resources Assigned' },
        { value: 'pending', label: 'Assignment Pending' },
        { value: 'not_assigned', label: 'Not Assigned' }
      ]
    };

    res.status(200).json({
      success: true,
      message: 'Filter options retrieved successfully',
      data: filterOptions,
    });

  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filter options',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

/**
 * Get detailed student progress information
 */
export const getStudentProgressDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'principal') {
      res.status(403).json({
        success: false,
        message: 'Principal access required',
      });
      return;
    }

    const { studentId } = req.params;
    const collegeId = req.user.collegeId;

    // Get student details with resource information
    const student = await (userRepository as any).findByIdWithresourceData(studentId);
    
    if (!student || student.collegeId !== collegeId) {
      res.status(404).json({
        success: false,
        message: 'Student not found or not in your college',
      });
      return;
    }

    // Get student's resource history and uploads
    const [studentresources, resourceUploads] = await Promise.all([
      learningResourceRepository.findByStudent(studentId, { limit: 100 }),
      (learningResourceRepository as any).getStudentresourceUploads(studentId, { limit: 50 })
    ]);

    const progressDetails = {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        yearOfStudy: student.yearOfStudy,
        section: student.section,
        courseName: student.courseName,
        departmentName: student.departmentName,
        status: student.status,
        joinedDate: student.createdAt
      },
      resourcestats: {
        totalAssigned: studentresources.data.length,
        healthy: studentresources.data.filter(t => t.status === 'healthy').length,
        growing: studentresources.data.filter(t => t.status === 'assigned').length,
        needsAttention: studentresources.data.filter(t => t.status === 'needs_attention').length,
        deceased: studentresources.data.filter(t => t.status === 'deceased').length
      },
      recentActivity: resourceUploads.slice(0, 10).map(upload => ({
        id: upload.id,
        resourceId: upload.resourceId,
        uploadDate: upload.uploadedAt,
        imageType: upload.imageType,
        notes: upload.notes,
        resourcestatus: upload.resourcestatus
      })),
      resources: studentresources.data.map(resource => ({
        id: resource.id,
        category: resource.category,
        startedDate: resource.startedDate,
        location: (resource as any).location,
        status: resource.status,
        lastPhotoUpload: (resource as any).lastPhotoUpload,
        healthScore: (resource as any).healthScore || 0,
        growthRate: (resource as any).growthRate || 0
      }))
    };

    res.status(200).json({
      success: true,
      message: 'Student progress details retrieved successfully',
      data: progressDetails,
    });

  } catch (error) {
    console.error('Error getting student progress details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student progress details',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};
