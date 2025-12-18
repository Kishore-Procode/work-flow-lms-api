import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { userRepository } from '../../user/repositories/user.repository';
import { learningResourceRepository } from '../../learning-resource/repositories/learning-resource.repository';
import { resourceImageRepository } from '../../upload/repositories/tree-image.repository';
import { convertKeysToCamelCase } from '../../../utils/convertKeys';

/**
 * Get staff dashboard data - only shows students from sections they are assigned as class in-charge
 */
export const getStaffDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'staff') {
      res.status(403).json({
        success: false,
        message: 'Staff access required',
      });
      return;
    }

    const staffId = req.user.id;
    const departmentId = req.user.departmentId;

    if (!departmentId) {
      res.status(400).json({
        success: false,
        message: 'Staff member must be assigned to a department',
      });
      return;
    }

    // Get sections assigned to this staff member as class in-charge
    const assignedSectionsQuery = `
      SELECT 
        s.id as section_id,
        s.name as section_name,
        s.max_students,
        s.current_students,
        c.name as course_name,
        c.code as course_code,
        ay.year_name as academic_year,
        ay.year_number,
        d.name as department_name
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      JOIN departments d ON s.department_id = d.id
      WHERE s.class_in_charge_id = $1 AND s.status = 'active'
      ORDER BY ay.year_number, c.name, s.name
    `;

    const assignedSectionsResult = await pool.query(assignedSectionsQuery, [staffId]);
    const assignedSections = assignedSectionsResult.rows;

    if (assignedSections.length === 0) {
      // Staff has no assigned sections
      res.status(200).json({
        success: true,
        message: 'Staff dashboard data retrieved successfully',
        data: {
          departmentName: 'Department',
          assignedSections: [],
          statistics: {
            assignedSections: 0,
            totalStudents: 0,
            studentsWithresources: 0,
            recentUploads: 0,
            uploadCompletionRate: 0
          },
          students: [],
          recentActivity: [],
          studentsWithMissingUploads: []
        }
      });
      return;
    }

    const sectionIds = assignedSections.map(s => s.section_id);

    // Get students from assigned sections only
    const studentsQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.roll_number,
        u.year_of_study,
        u.section_id,
        u.status,
        u.created_at,
        s.name as section_name,
        c.name as course_name,
        ay.year_name as academic_year
      FROM users u
      JOIN sections s ON u.section_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE u.role = 'student' 
        AND u.status = 'active'
        AND u.section_id = ANY($1)
      ORDER BY s.name, u.name
    `;

    const studentsResult = await pool.query(studentsQuery, [sectionIds]);
    const students = studentsResult.rows;

    // Get resources assigned to these students
    const studentIds = students.map(s => s.id);
    let assignedresources = [];
    let recentresourceImages = [];

    if (studentIds.length > 0) {
      const resourcesQuery = `
        SELECT 
          t.*,
          u.name as student_name,
          u.roll_number as student_roll_number
        FROM resources t
        JOIN users u ON t.assigned_student_id = u.id
        WHERE t.assigned_student_id = ANY($1)
        ORDER BY t.assigned_date DESC
      `;

      const resourcesResult = await pool.query(resourcesQuery, [studentIds]);
      assignedresources = resourcesResult.rows;

      // Get recent resource images (last 30 days)
      const recentImagesQuery = `
        SELECT 
          ti.*,
          u.name as student_name,
          u.roll_number as student_roll_number,
          t.resource_code, ti.upload_date as uploaded_at
        FROM resource_media ti
        JOIN resources t ON ti.resource_id = t.id
        JOIN users u ON t.assigned_student_id = u.id
        WHERE t.assigned_student_id = ANY($1)
          AND ti.upload_date >= NOW() - INTERVAL '30 days'
        ORDER BY ti.upload_date DESC
        LIMIT 50
      `;

      const imagesResult = await pool.query(recentImagesQuery, [studentIds]);
      recentresourceImages = imagesResult.rows;
    }

    // Calculate statistics
    const studentsWithresources = assignedresources.length;
    const studentsWithRecentUploads = new Set(recentresourceImages.map(img => img.assigned_student_id));
    const uploadCompletionRate = students.length > 0 
      ? Math.round((studentsWithRecentUploads.size / students.length) * 100) 
      : 0;

    // Find students with missing uploads
    const studentsWithMissingUploads = students
      .filter(student => !studentsWithRecentUploads.has(student.id))
      .map(student => {
        const studentresources = assignedresources.filter(t => t.assigned_student_id === student.id);
        const lastUpload = recentresourceImages
          .filter(img => img.assigned_student_id === student.id)
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
        
        return {
          studentName: student.name,
          name: student.name,
          registrationNumber: student.roll_number,
          rollNumber: student.roll_number,
          yearOfStudy: student.year_of_study,
          sectionName: student.section_name,
          courseName: student.course_name,
          assignedresources: studentresources.length,
          lastUpload: lastUpload ? new Date(lastUpload.uploaded_at).toLocaleDateString() : 'Never',
          lastUploadDate: lastUpload ? lastUpload.uploaded_at : null,
          daysSinceLastUpload: lastUpload 
            ? Math.floor((Date.now() - new Date(lastUpload.uploaded_at).getTime()) / (1000 * 60 * 60 * 24)) 
            : null
        };
      })
      .slice(0, 10);

    // Generate recent activity
    const recentActivity = recentresourceImages
      .slice(0, 10)
      .map(img => ({
        id: img.id,
        type: 'resource_upload',
        description: `${img.student_name} uploaded resource progress photo`,
        timestamp: img.uploaded_at,
        studentName: img.student_name,
        resourceCode: img.resource_code,
        imageType: img.image_type
      }));

    // Get department name
    const departmentQuery = `SELECT name FROM departments WHERE id = $1`;
    const departmentResult = await pool.query(departmentQuery, [departmentId]);
    const departmentName = departmentResult.rows[0]?.name || 'Department';

    // Prepare response data
    const dashboardData = {
      departmentName,
      assignedSections: convertKeysToCamelCase(assignedSections),
      statistics: {
        assignedSections: assignedSections.length,
        totalStudents: students.length,
        studentsWithresources,
        recentUploads: recentresourceImages.length,
        uploadCompletionRate
      },
      students: convertKeysToCamelCase(students.slice(0, 50)), // Limit for performance
      studentsWithMissingUploads: convertKeysToCamelCase(studentsWithMissingUploads),
      recentActivity: convertKeysToCamelCase(recentActivity),
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Staff dashboard data retrieved successfully',
      data: dashboardData,
    });

  } catch (error) {
    console.error('Get staff dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff dashboard data',
    });
  }
};

/**
 * Get students assigned to staff member's sections
 */
export const getMyStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'staff') {
      res.status(403).json({
        success: false,
        message: 'Staff access required',
      });
      return;
    }

    const staffId = req.user.id;
    const { section, year, status } = req.query;

    // Build query to get students from staff's assigned sections
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.roll_number,
        u.year_of_study,
        u.section_id,
        u.status,
        u.created_at,
        s.name as section_name,
        c.name as course_name,
        ay.year_name as academic_year,
        COUNT(t.id) as assigned_resources_count,
        COUNT(CASE WHEN t.status = 'healthy' THEN 1 END) as healthy_resources_count
      FROM users u
      JOIN sections s ON u.section_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      LEFT JOIN resources t ON t.assigned_student_id = u.id
      WHERE u.role = 'student' 
        AND s.class_in_charge_id = $1
        AND s.status = 'active'
    `;

    const queryParams = [staffId];
    let paramIndex = 2;

    // Add filters
    if (section) {
      query += ` AND s.id = $${paramIndex}`;
      queryParams.push(section as string);
      paramIndex++;
    }

    if (year) {
      query += ` AND ay.year_name = $${paramIndex}`;
      queryParams.push(year as string);
      paramIndex++;
    }

    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      queryParams.push(status as string);
      paramIndex++;
    }

    query += `
      GROUP BY u.id, u.name, u.email, u.roll_number, u.year_of_study, 
               u.section_id, u.status, u.created_at, s.name, c.name, ay.year_name
      ORDER BY s.name, u.name
    `;

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: convertKeysToCamelCase(result.rows),
    });

  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
    });
  }
};

/**
 * Get filter options for staff's assigned sections
 */
export const getStaffFilterOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'staff') {
      res.status(403).json({
        success: false,
        message: 'Staff access required',
      });
      return;
    }

    const staffId = req.user.id;

    // Get sections and years for this staff member
    const query = `
      SELECT DISTINCT
        s.id as section_id,
        s.name as section_name,
        ay.year_name,
        ay.year_number,
        c.name as course_name
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.class_in_charge_id = $1 AND s.status = 'active'
      ORDER BY ay.year_number, c.name, s.name
    `;

    const result = await pool.query(query, [staffId]);

    const sections = result.rows.map(row => ({
      id: row.section_id,
      name: row.section_name,
      courseName: row.course_name,
      yearName: row.year_name
    }));

    const years = [...new Set(result.rows.map(row => row.year_name))];

    res.status(200).json({
      success: true,
      message: 'Filter options retrieved successfully',
      data: {
        sections: convertKeysToCamelCase(sections),
        years,
        statuses: ['active', 'inactive', 'pending']
      },
    });

  } catch (error) {
    console.error('Get staff filter options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filter options',
    });
  }
};
