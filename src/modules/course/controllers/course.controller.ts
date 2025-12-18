import { Request, Response } from 'express';
import { pool } from '../../../config/database';
import { Course, AcademicYear, Section } from '../../../types';
import { courseRepository } from '../repositories/course.repository';

export class CourseController {
  constructor() {
    // Using direct database pool connection
  }

  /**
   * Get all courses (enhanced for course-first signup flow)
   */
  async getCourses(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId, departmentId, limit = 1000, offset = 0 } = req.query;

      let query = `
        SELECT
          c.id,
          c.name,
          c.code,
          c.course_type as type,
          c.duration_years,
          c.college_id,
          c.department_id,
          c.description,
          d.name as department_name,
          d.code as department_code,
          col.name as college_name
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN colleges col ON c.college_id = col.id
        WHERE c.is_active = true
      `;
      const params: any[] = [];

      if (collegeId) {
        query += ` AND c.college_id = $${params.length + 1}`;
        params.push(collegeId);
      }

      if (departmentId) {
        query += ` AND c.department_id = $${params.length + 1}`;
        params.push(departmentId);
      }

      query += ' ORDER BY c.name ASC';

      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string));
      }

      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(parseInt(offset as string));
      }

      const result = await pool.query(query, params);
      const courses = result.rows;

      res.json({
        success: true,
        data: courses,
        message: 'Courses retrieved successfully',
        count: courses.length,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get courses by college (optimized for signup form)
   */
  async getCoursesByCollege(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId } = req.params;

      if (!collegeId) {
        res.status(400).json({
          success: false,
          message: 'College ID is required',
        });
        return;
      }

      const query = 'SELECT * FROM get_courses_by_college($1)';
      const result = await pool.query(query, [collegeId]);
      const courses = result.rows;

      res.json({
        success: true,
        data: courses,
        message: 'Courses retrieved successfully',
        count: courses.length,
      });
    } catch (error) {
      console.error('Error fetching courses by college:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get departments by course (for course-first signup flow)
   */
  async getDepartmentsByCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
        return;
      }

      const query = 'SELECT * FROM get_departments_by_course($1)';
      const result = await pool.query(query, [courseId]);
      const departments = result.rows;

      res.json({
        success: true,
        data: departments,
        message: 'Departments retrieved successfully',
        count: departments.length,
      });
    } catch (error) {
      console.error('Error fetching departments by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get departments by college (for login screen filtering)
   */
  async getDepartmentsByCollege(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId } = req.params;

      if (!collegeId) {
        res.status(400).json({
          success: false,
          message: 'College ID is required',
        });
        return;
      }

      const query = `
        SELECT
          d.id,
          d.name,
          d.code,
          d.college_id,
          d.established,
          c.name as college_name
        FROM departments d
        LEFT JOIN colleges c ON d.college_id = c.id
        WHERE d.college_id = $1
        ORDER BY d.name ASC
      `;

      const result = await pool.query(query, [collegeId]);
      const departments = result.rows;

      res.json({
        success: true,
        data: departments,
        message: 'Departments retrieved successfully',
        count: departments.length,
      });
    } catch (error) {
      console.error('Error fetching departments by college:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get courses by department (for HOD content creation)
   */
  async getCoursesByDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId } = req.params;

      if (!departmentId) {
        res.status(400).json({
          success: false,
          message: 'Department ID is required',
        });
        return;
      }

      const query = `
        SELECT
          c.id,
          c.name,
          c.code,
          c.course_type as type,
          c.duration_years,
          c.college_id,
          c.department_id,
          c.description,
          d.name as department_name,
          d.code as department_code,
          col.name as college_name
        FROM lmsact.courses c
        LEFT JOIN lmsact.departments d ON c.department_id = d.id
        LEFT JOIN lmsact.colleges col ON c.college_id = col.id
        WHERE c.department_id = $1 AND c.is_active = true
        ORDER BY c.name ASC
      `;

      const result = await pool.query(query, [departmentId]);
      const courses = result.rows;

      res.json({
        success: true,
        data: courses,
        message: 'Courses retrieved successfully',
        count: courses.length,
      });
    } catch (error) {
      console.error('Error fetching courses by department:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get courses by college and department (for login screen filtering)
   */
  async getCoursesByCollegeAndDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId, departmentId } = req.params;

      if (!collegeId || !departmentId) {
        res.status(400).json({
          success: false,
          message: 'College ID and Department ID are required',
        });
        return;
      }

      const query = `
        SELECT
          c.id,
          c.name,
          c.code,
          c.course_type as type,
          c.duration_years,
          c.college_id,
          c.department_id,
          c.description,
          d.name as department_name,
          d.code as department_code,
          col.name as college_name
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN colleges col ON c.college_id = col.id
        WHERE c.college_id = $1 AND c.department_id = $2 AND c.is_active = true
        ORDER BY c.name ASC
      `;

      const result = await pool.query(query, [collegeId, departmentId]);
      const courses = result.rows;

      res.json({
        success: true,
        data: courses,
        message: 'Courses retrieved successfully',
        count: courses.length,
      });
    } catch (error) {
      console.error('Error fetching courses by college and department:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get course by ID
   */
  async getCourseById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = 'SELECT * FROM courses WHERE id = $1 AND is_active = true';
      const result = await pool.query(query, [id]);
      const courses = result.rows;

      if (courses.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Course not found',
        });
        return;
      }

      res.json({
        success: true,
        data: courses[0],
        message: 'Course retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch course',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get academic years by course
   */
  async getAcademicYears(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM academic_years WHERE is_active = true';
      const params: any[] = [];

      if (courseId) {
        query += ' AND course_id = $1';
        params.push(courseId);
      }

      query += ' ORDER BY year_number ASC';

      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string));
      }

      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(parseInt(offset as string));
      }

      const result = await pool.query(query, params);
      const academicYears = result.rows;

      res.json({
        success: true,
        data: academicYears,
        message: 'Academic years retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching academic years:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch academic years',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get academic years by course (for content creation)
   */
  async getAcademicYearsByCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
        return;
      }

      const query = `
        SELECT * FROM lmsact.academic_years
        WHERE course_id = $1 AND is_active = true
        ORDER BY year_number DESC
      `;

      const result = await pool.query(query, [courseId]);
      const academicYears = result.rows;

      res.json({
        success: true,
        data: academicYears,
        message: 'Academic years retrieved successfully',
        count: academicYears.length,
      });
    } catch (error) {
      console.error('Error fetching academic years by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch academic years',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sections (enhanced for course-first signup flow)
   */
  async getSections(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, departmentId, academicYearId, yearName, limit = 1000, offset = 0 } = req.query;

      let query = `
        SELECT
          s.id,
          s.name,
          s.course_id,
          s.department_id,
          s.academic_year_id,
          s.max_students,
          s.current_students,
          s.status,
          s.academic_session,
          c.name as course_name,
          c.code as course_code,
          d.name as department_name,
          ay.year_name,
          ay.year_number
        FROM sections s
        JOIN courses c ON s.course_id = c.id
        JOIN departments d ON s.department_id = d.id
        JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE s.status = 'active' AND c.is_active = true
      `;
      const params: any[] = [];

      if (courseId) {
        query += ' AND s.course_id = $' + (params.length + 1);
        params.push(courseId);
      }

      if (departmentId) {
        query += ' AND s.department_id = $' + (params.length + 1);
        params.push(departmentId);
      }

      if (academicYearId) {
        query += ' AND s.academic_year_id = $' + (params.length + 1);
        params.push(academicYearId);
      }

      if (yearName) {
        query += ' AND ay.year_name = $' + (params.length + 1);
        params.push(yearName);
      }

      query += ' ORDER BY s.name ASC';

      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string));
      }

      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(parseInt(offset as string));
      }

      const result = await pool.query(query, params);
      const sections = result.rows;

      res.json({
        success: true,
        data: sections,
        message: 'Sections retrieved successfully',
        count: sections.length,
      });
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sections',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sections by course and year (optimized for signup form)
   */
  async getSectionsByCourseAndYear(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, yearName } = req.params;

      if (!courseId || !yearName) {
        res.status(400).json({
          success: false,
          message: 'Course ID and year name are required',
        });
        return;
      }

      const query = 'SELECT * FROM get_sections_by_course_and_year($1, $2)';
      const result = await pool.query(query, [courseId, yearName]);
      const sections = result.rows;

      res.json({
        success: true,
        data: sections,
        message: 'Sections retrieved successfully',
        count: sections.length,
      });
    } catch (error) {
      console.error('Error fetching sections by course and year:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sections',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get section by ID
   */
  async getSectionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        SELECT
          s.id,
          s.name,
          s.course_id,
          s.department_id,
          s.academic_year_id,
          s.max_students,
          s.current_students,
          s.status,
          s.academic_session,
          c.name as course_name,
          c.code as course_code,
          d.name as department_name,
          ay.year_name,
          ay.year_number
        FROM sections s
        JOIN courses c ON s.course_id = c.id
        JOIN departments d ON s.department_id = d.id
        JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE s.id = $1 AND s.status = 'active' AND c.is_active = true
      `;
      const result = await pool.query(query, [id]);
      const sections = result.rows;

      if (sections.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Section not found',
        });
        return;
      }

      res.json({
        success: true,
        data: sections[0],
        message: 'Section retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching section:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch section',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new course (Admin/Principal only)
   */
  async createCourse(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, type, courseType, collegeId, description, department_id, departmentId, durationYears } = req.body;
      console.log('Creating course with data:', req.body);

      // Handle both camelCase and snake_case for department
      const departmentIdValue = departmentId || department_id;

      // Handle both 'type' and 'courseType' from request
      const courseTypeValue = courseType || type;

      // Validate required fields
      if (!name || !code || !courseTypeValue || !collegeId) {
        res.status(400).json({
          success: false,
          message: 'Name, code, courseType, and collegeId are required',
        });
        return;
      }

      const query = `
        INSERT INTO courses (name, code, course_type, college_id, description, department_id, duration_years)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const params = [name, code, courseTypeValue, collegeId, description, departmentIdValue, durationYears || 4];
      const result = await pool.query(query, params);
      const courses = result.rows;

      res.status(201).json({
        success: true,
        data: courses[0],
        message: 'Course created successfully',
      });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateCourse(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, type, collegeId } = req.body;
      console.log('Update course with data:', req.body);

      // Validate required fields
      if (!name || !code || !type || !collegeId) {
        res.status(400).json({
          success: false,
          message: 'Name, code, type, and collegeId are required',
        });
        return;
      }

      const { id } = req.params;
      const courseData = req.body;

      const courses = await courseRepository.update(id, courseData)
      res.status(201).json({
        success: true,
        data: courses[0],
        message: 'Course created successfully',
      });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create academic years for a course
   */
  async createAcademicYears(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { fromYear, toYear } = req.body;

      // Validate required fields
      if (!fromYear || !toYear) {
        res.status(400).json({
          success: false,
          message: 'From year and to year are required',
        });
        return;
      }

      // Validate year format and range
      const currentYear = new Date().getFullYear();
      const fromYearNum = parseInt(fromYear);
      const toYearNum = parseInt(toYear);

      if (isNaN(fromYearNum) || isNaN(toYearNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid year format',
        });
        return;
      }

      if (fromYearNum >= toYearNum) {
        res.status(400).json({
          success: false,
          message: 'From year must be less than to year',
        });
        return;
      }

      // Don't allow older than 5 years
      if (fromYearNum < currentYear - 5) {
        res.status(400).json({
          success: false,
          message: 'Cannot create academic years older than 5 years',
        });
        return;
      }

      const yearName = `${fromYear} - ${toYear}`;

      // Check if academic year with this name already exists for this course
      const existingQuery = `
        SELECT * FROM academic_years
        WHERE course_id = $1 AND year_name = $2
      `;
      const existingResult = await pool.query(existingQuery, [courseId, yearName]);

      if (existingResult.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: `Academic year "${yearName}" already exists for this course`,
        });
        return;
      }

      const query = `
        INSERT INTO academic_years (course_id, year_number, year_name)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const params = [courseId, fromYearNum, yearName];

      const result = await pool.query(query, params);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Academic year created successfully',
      });
    } catch (error) {
      console.error('Error creating academic years:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create academic years',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new section
   */
  async createSection(req: Request, res: Response): Promise<void> {
    try {
      // Handle both camelCase and snake_case field names
      const {
        name,
        course_id,
        courseId,
        department_id,
        departmentId,
        academic_year_id,
        academicYearId,
        max_students,
        maxStudents,
        academic_session,
        academicSession
      } = req.body;

      // Use camelCase first, fallback to snake_case
      const courseIdValue = courseId || course_id;
      const departmentIdValue = departmentId || department_id;
      const academicYearIdValue = academicYearId || academic_year_id;
      const maxStudentsValue = maxStudents || max_students;
      const academicSessionValue = academicSession || academic_session;

      // Validate required fields
      if (!name || !courseIdValue || !departmentIdValue || !academicYearIdValue) {
        res.status(400).json({
          success: false,
          message: 'Name, courseId (or course_id), departmentId (or department_id), and academicYearId (or academic_year_id) are required',
        });
        return;
      }

      const query = `
        INSERT INTO sections (name, course_id, department_id, academic_year_id, max_students, academic_session, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;

      const params = [name, courseIdValue, departmentIdValue, academicYearIdValue, maxStudentsValue || 60, academicSessionValue];
      const result = await pool.query(query, params);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Section created successfully',
      });
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create section',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a section
   */
  async updateSection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Handle both camelCase and snake_case field names
      const {
        name,
        course_id,
        courseId,
        department_id,
        departmentId,
        academic_year_id,
        academicYearId,
        max_students,
        maxStudents,
        academic_session,
        academicSession,
        status
      } = req.body;

      // Use camelCase first, fallback to snake_case
      const courseIdValue = courseId || course_id;
      const departmentIdValue = departmentId || department_id;
      const academicYearIdValue = academicYearId || academic_year_id;
      const maxStudentsValue = maxStudents || max_students;
      const academicSessionValue = academicSession || academic_session;

      // Check if section exists
      const existingQuery = 'SELECT * FROM sections WHERE id = $1';
      const existingResult = await pool.query(existingQuery, [id]);

      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Section not found',
        });
        return;
      }

      // Build dynamic update query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(name);
      }
      if (courseIdValue !== undefined) {
        updateFields.push(`course_id = $${paramIndex++}`);
        params.push(courseIdValue);
      }
      if (departmentIdValue !== undefined) {
        updateFields.push(`department_id = $${paramIndex++}`);
        params.push(departmentIdValue);
      }
      if (academicYearIdValue !== undefined) {
        updateFields.push(`academic_year_id = $${paramIndex++}`);
        params.push(academicYearIdValue);
      }
      if (maxStudentsValue !== undefined) {
        updateFields.push(`max_students = $${paramIndex++}`);
        params.push(maxStudentsValue);
      }
      if (academicSessionValue !== undefined) {
        updateFields.push(`academic_session = $${paramIndex++}`);
        params.push(academicSessionValue);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No fields provided for update',
        });
        return;
      }

      const query = `
        UPDATE sections
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      params.push(id);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Section updated successfully',
      });
    } catch (error) {
      console.error('Error updating section:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update section',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const courseController = new CourseController();
