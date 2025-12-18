/**
 * ACT Schema Repository Implementation
 * 
 * Infrastructure layer implementation for querying ACT application data
 * from the workflowmgmt schema. Provides read-only access to departments,
 * regulations, semesters, and subjects from the main ACT application.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { DomainError } from '../../domain/errors/DomainError';

export interface ACTDepartment {
  id: string; // Will be converted from integer to string
  name: string;
  code: string;
  isActive: boolean;
}

export interface ACTRegulation {
  id: string; // Represents academic_year_id, converted from integer to string
  name: string; // Academic year name
  code: string; // Academic year code
  departmentId: string; // Department ID, converted from integer to string
  academicYear: string; // Academic year display name
  isActive: boolean;
}

export interface ACTSemester {
  id: string;
  semesterNumber: number;
  semesterName: string;
  regulationId: string;
  totalSubjects: number;
}

export interface ACTSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  semesterId: string;
  regulationId: string;
  departmentId: string;
  isActive: boolean;
}

export interface ACTSchemaFilter {
  departmentId?: string;
  regulationId?: string;
  semesterId?: string;
  isActive?: boolean;
}

export interface IACTSchemaRepository {
  getDepartments(levelId?: string): Promise<ACTDepartment[]>;
  getRegulationsByDepartment(departmentId: string): Promise<ACTRegulation[]>;
  getSemestersByRegulation(regulationId: string, departmentId?: string): Promise<ACTSemester[]>;
  getSubjectsBySemester(semesterId: string): Promise<ACTSubject[]>;
  getSubjectsByRegulation(regulationId: string): Promise<ACTSubject[]>;
  getSubjectsByDepartmentRegulationSemester(departmentId: string, regulationId: string, semesterNumber: number): Promise<ACTSubject[]>;
  getAllCourses(): Promise<ACTSubject[]>;
  getDepartmentById(id: string): Promise<ACTDepartment | null>;
  getRegulationById(id: string): Promise<ACTRegulation | null>;
  getSemesterById(id: string): Promise<ACTSemester | null>;
  getSubjectById(id: string): Promise<ACTSubject | null>;
}

export class ACTSchemaRepository implements IACTSchemaRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Get all active departments from ACT schema
   * @param levelId Optional level ID to filter departments by course level (1=Diploma, 2=UG, etc.)
   */
  public async getDepartments(levelId?: string): Promise<ACTDepartment[]> {
    let query = `
      SELECT
        id::text as id,
        name,
        code,
        is_active as "isActive"
      FROM workflowmgmt.departments
      WHERE is_active = true
    `;

    const params: any[] = [];

    // Add level filter if provided
    if (levelId) {
      params.push(parseInt(levelId));
      query += ` AND level_id = $${params.length}`;
    }

    query += ` ORDER BY name ASC`;

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT departments: ${error}`);
    }
  }

  /**
   * Get regulations (academic years) by department from ACT schema
   * Note: workflowmgmt schema doesn't have a regulations table, so we use academic_years
   */
  public async getRegulationsByDepartment(departmentId: string): Promise<ACTRegulation[]> {
    const query = `
      SELECT DISTINCT
        ay.id::text as id,
        ay.name as name,
        ay.code as code,
        $1 as "departmentId",
        ay.name as "academicYear",
        ay.is_active as "isActive",
        ay.start_year as "startYear"
      FROM workflowmgmt.academic_years ay
      WHERE ay.is_active = true
      ORDER BY ay.start_year DESC, ay.name DESC
    `;

    try {
      const result = await this.pool.query(query, [departmentId]);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        departmentId: row.departmentId,
        academicYear: row.academicYear,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT regulations by department: ${error}`);
    }
  }

  /**
   * Get semesters by regulation (academic year) and optionally by department from ACT schema
   * Note: Semesters are linked to academic_year_id and department_id in workflowmgmt schema
   * @param regulationId The academic year ID
   * @param departmentId Optional department ID to filter semesters
   */
  public async getSemestersByRegulation(regulationId: string, departmentId?: string): Promise<ACTSemester[]> {
    let query = `
      SELECT
        s.id::text as id,
        CAST(SUBSTRING(s.name FROM '[0-9]+') AS INTEGER) as "semesterNumber",
        s.name as "semesterName",
        s.academic_year_id::text as "regulationId",
        COUNT(DISTINCT syl.id) as "totalSubjects"
      FROM workflowmgmt.semesters s
      LEFT JOIN workflowmgmt.syllabi syl ON s.id = syl.semester_id AND syl.is_active = true
      WHERE s.academic_year_id = $1::integer AND s.is_active = true
    `;

    const params: any[] = [regulationId];

    // Add department filter if provided
    if (departmentId) {
      params.push(parseInt(departmentId));
      query += ` AND s.department_id = $${params.length}`;
    }

    query += `
      GROUP BY s.id, s.name, s.academic_year_id
      ORDER BY s.name ASC
    `;

    try {
      const result = await this.pool.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        semesterNumber: row.semesterNumber || 1,
        semesterName: row.semesterName,
        regulationId: row.regulationId,
        totalSubjects: parseInt(row.totalSubjects) || 0
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT semesters by regulation: ${error}`);
    }
  }

  /**
   * Get subjects (courses) by semester from ACT schema
   * Note: workflowmgmt uses syllabi table to link courses to semesters
   * We fetch course information from the courses table
   */
  public async getSubjectsBySemester(semesterId: string): Promise<ACTSubject[]> {
    const query = `
      SELECT
        c.id::text as id,
        c.code as "subjectCode",
        c.name as "subjectName",
        c.credits,
        syl.semester_id::text as "semesterId",
        syl.department_id::text as "regulationId",
        syl.department_id::text as "departmentId",
        c.is_active as "isActive"
      FROM workflowmgmt.syllabi syl
      INNER JOIN workflowmgmt.courses c ON syl.course_id = c.id
      WHERE syl.semester_id = $1::integer
        AND syl.is_active = true
        AND c.is_active = true
      ORDER BY c.code ASC
    `;

    try {
      const result = await this.pool.query(query, [semesterId]);
      return result.rows.map(row => ({
        id: row.id,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        credits: row.credits,
        semesterId: row.semesterId,
        regulationId: row.regulationId,
        departmentId: row.departmentId,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT subjects by semester: ${error}`);
    }
  }

  /**
   * Get all subjects by regulation from ACT schema
   */
  public async getSubjectsByRegulation(regulationId: string): Promise<ACTSubject[]> {
    const query = `
      SELECT
        sub.id,
        sub.subject_code as "subjectCode",
        sub.subject_name as "subjectName",
        sub.credits,
        sub.semester_id as "semesterId",
        sub.regulation_id as "regulationId",
        sub.department_id as "departmentId",
        sub.is_active as "isActive"
      FROM workflowmgmt.subjects sub
      WHERE sub.regulation_id = $1 AND sub.is_active = true
      ORDER BY sub.subject_code ASC
    `;

    try {
      const result = await this.pool.query(query, [regulationId]);
      return result.rows.map(row => ({
        id: row.id,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        credits: row.credits,
        semesterId: row.semesterId,
        regulationId: row.regulationId,
        departmentId: row.departmentId,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT subjects by regulation: ${error}`);
    }
  }

  /**
   * Get subjects by department, regulation, and semester number
   * Returns subjects that exist in workflowmgmt.semesters for the specific combination
   * This is used for content mapping to show only relevant subjects for assignment
   */
  public async getSubjectsByDepartmentRegulationSemester(
    departmentId: string,
    regulationId: string,
    semesterNumber: number
  ): Promise<ACTSubject[]> {
    const query = `
      SELECT DISTINCT
        c.id::text as id,
        c.code as "subjectCode",
        c.name as "subjectName",
        c.credits,
        s.id::text as "semesterId",
        s.academic_year_id::text as "regulationId",
        s.department_id::text as "departmentId",
        c.is_active as "isActive"
      FROM workflowmgmt.courses c
      INNER JOIN workflowmgmt.semesters s ON c.id = ANY(s.course_id)
      WHERE s.department_id = $1::integer
        AND s.academic_year_id = $2::integer
        AND s.name ILIKE '%' || $3::text || '%'
        AND c.is_active = true
        AND s.is_active = true
      ORDER BY c.code ASC
    `;

    try {
      const result = await this.pool.query(query, [departmentId, regulationId, semesterNumber.toString()]);
      return result.rows.map(row => ({
        id: row.id,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        credits: row.credits,
        semesterId: row.semesterId,
        regulationId: row.regulationId,
        departmentId: row.departmentId,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT subjects by department/regulation/semester: ${error}`);
    }
  }

  /**
   * Get all courses from ACT schema
   * Returns all active courses from workflowmgmt.courses table
   * This is used for content mapping where users select which courses belong to each semester
   */
  public async getAllCourses(): Promise<ACTSubject[]> {
    const query = `
      SELECT
        c.id::text as id,
        c.code as "subjectCode",
        c.name as "subjectName",
        c.credits,
        NULL as "semesterId",
        NULL as "regulationId",
        NULL as "departmentId",
        c.is_active as "isActive"
      FROM workflowmgmt.courses c
      WHERE c.is_active = true
      ORDER BY c.code ASC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        credits: row.credits,
        semesterId: row.semesterId,
        regulationId: row.regulationId,
        departmentId: row.departmentId,
        isActive: row.isActive
      }));
    } catch (error) {
      throw new DomainError(`Failed to get all ACT courses: ${error}`);
    }
  }

  /**
   * Get department by ID from ACT schema
   */
  public async getDepartmentById(id: string): Promise<ACTDepartment | null> {
    const query = `
      SELECT
        id,
        name,
        code,
        is_active as "isActive"
      FROM workflowmgmt.departments
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        isActive: row.isActive
      };
    } catch (error) {
      throw new DomainError(`Failed to get ACT department by ID: ${error}`);
    }
  }

  /**
   * Get regulation by ID from ACT schema
   */
  public async getRegulationById(id: string): Promise<ACTRegulation | null> {
    const query = `
      SELECT
        id,
        name,
        code,
        department_id as "departmentId",
        academic_year as "academicYear",
        is_active as "isActive"
      FROM workflowmgmt.regulations
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        departmentId: row.departmentId,
        academicYear: row.academicYear,
        isActive: row.isActive
      };
    } catch (error) {
      throw new DomainError(`Failed to get ACT regulation by ID: ${error}`);
    }
  }

  /**
   * Get semester by ID from ACT schema
   */
  public async getSemesterById(id: string): Promise<ACTSemester | null> {
    const query = `
      SELECT
        s.id,
        s.semester_number as "semesterNumber",
        s.semester_name as "semesterName",
        s.regulation_id as "regulationId",
        COUNT(sub.id) as "totalSubjects"
      FROM workflowmgmt.semesters s
      LEFT JOIN workflowmgmt.subjects sub ON s.id = sub.semester_id AND sub.is_active = true
      WHERE s.id = $1
      GROUP BY s.id, s.semester_number, s.semester_name, s.regulation_id
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        semesterNumber: row.semesterNumber,
        semesterName: row.semesterName,
        regulationId: row.regulationId,
        totalSubjects: parseInt(row.totalSubjects) || 0
      };
    } catch (error) {
      throw new DomainError(`Failed to get ACT semester by ID: ${error}`);
    }
  }

  /**
   * Get subject by ID from ACT schema
   */
  public async getSubjectById(id: string): Promise<ACTSubject | null> {
    const query = `
      SELECT
        id,
        subject_code as "subjectCode",
        subject_name as "subjectName",
        credits,
        semester_id as "semesterId",
        regulation_id as "regulationId",
        department_id as "departmentId",
        is_active as "isActive"
      FROM workflowmgmt.subjects
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        credits: row.credits,
        semesterId: row.semesterId,
        regulationId: row.regulationId,
        departmentId: row.departmentId,
        isActive: row.isActive
      };
    } catch (error) {
      throw new DomainError(`Failed to get ACT subject by ID: ${error}`);
    }
  }
}
