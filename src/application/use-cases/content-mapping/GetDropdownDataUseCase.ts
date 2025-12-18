/**
 * Get Dropdown Data Use Case
 * 
 * Application layer use case for retrieving dropdown data for the content mapping screen.
 * Provides data for cascading dropdowns: Course Types, LMS data, and ACT data.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IDepartmentRepository } from '../../../domain/repositories/IDepartmentRepository';
import { IACTSchemaRepository, ACTDepartment, ACTRegulation } from '../../../infrastructure/repositories/ACTSchemaRepository';
import { ICourseTypeRepository } from '../../../domain/repositories/ICourseTypeRepository';
import { DomainError } from '../../../domain/errors/DomainError';

export interface GetDropdownDataRequest {
  requestingUserId: string;
  courseType?: string; // Filter courses by course type
  lmsCourseId?: string; // Filter LMS departments and academic years by course
  lmsDepartmentId?: string; // Filter academic years by department
  actDepartmentId?: string; // Filter ACT regulations by department
}

export interface DropdownOption {
  value: string;
  label: string;
  code?: string;
}

export interface GetDropdownDataResponse {
  courseTypes: DropdownOption[];
  lmsCourses: DropdownOption[];
  lmsDepartments: DropdownOption[];
  lmsAcademicYears: DropdownOption[];
  actDepartments: DropdownOption[];
  actRegulations: DropdownOption[];
}

export class GetDropdownDataUseCase {
  constructor(
    private readonly departmentRepository: IDepartmentRepository,
    private readonly actSchemaRepository: IACTSchemaRepository,
    private readonly courseTypeRepository: ICourseTypeRepository
  ) {}

  async execute(request: GetDropdownDataRequest): Promise<GetDropdownDataResponse> {
    // Validate input
    this.validateRequest(request);

    console.log('🔍 GetDropdownData - Request:', request);

    // Get all dropdown data with proper cascading logic
    // 1. Course Types - always available
    // 2. LMS Courses - filter by course type if provided
    // 3. LMS Departments - filter by course if provided
    // 4. LMS Academic Years - filter by course if provided
    // 5. ACT Departments - filter by course type level if provided
    // 6. ACT Regulations - filter by ACT department if provided

    // Use Promise.allSettled to handle errors gracefully - if one dropdown fails, others still load
    const results = await Promise.allSettled([
      this.getCourseTypes(),
      this.getLMSCourses(request.courseType),
      this.getLMSDepartments(request.lmsCourseId),
      this.getLMSAcademicYears(request.lmsCourseId),
      this.getACTDepartments(request.courseType),
      this.getACTRegulations(request.actDepartmentId)
    ]);

    // Extract results, using empty arrays for failed promises
    const courseTypes = results[0].status === 'fulfilled' ? results[0].value : [];
    const lmsCourses = results[1].status === 'fulfilled' ? results[1].value : [];
    const lmsDepartments = results[2].status === 'fulfilled' ? results[2].value : [];
    const lmsAcademicYears = results[3].status === 'fulfilled' ? results[3].value : [];
    const actDepartments = results[4].status === 'fulfilled' ? results[4].value : [];
    const actRegulations = results[5].status === 'fulfilled' ? results[5].value : [];

    // Log any errors for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const dropdownNames = ['courseTypes', 'lmsCourses', 'lmsDepartments', 'lmsAcademicYears', 'actDepartments', 'actRegulations'];
        console.error(`❌ Failed to load ${dropdownNames[index]}:`, result.reason);
      }
    });

    console.log('🔍 GetDropdownData - Results:', {
      courseTypesCount: courseTypes.length,
      lmsCoursesCount: lmsCourses.length,
      lmsDepartmentsCount: lmsDepartments.length,
      lmsAcademicYearsCount: lmsAcademicYears.length,
      actDepartmentsCount: actDepartments.length,
      actRegulationsCount: actRegulations.length
    });

    return {
      courseTypes,
      lmsCourses,
      lmsDepartments,
      lmsAcademicYears,
      actDepartments,
      actRegulations
    };
  }

  private validateRequest(request: GetDropdownDataRequest): void {
    if (!request.requestingUserId) {
      throw new DomainError('Requesting user ID is required');
    }
  }

  private async getCourseTypes(): Promise<DropdownOption[]> {
    try {
      // Fetch course types from database
      const courseTypes = await this.courseTypeRepository.findAllActive();

      return courseTypes.map(ct => ({
        value: ct.code,
        label: ct.name,
        code: ct.code
      }));
    } catch (error) {
      throw new DomainError(`Failed to get course types: ${error}`);
    }
  }

  /**
   * Map course type code to enum values
   * Course type codes: UG, PG, Diploma, Certificate
   * Enum values: BTech, MTech, BE, ME, PhD, Diploma, Certificate
   */
  private mapCourseTypeToEnum(courseType?: string): string[] | undefined {
    if (!courseType) {
      return undefined;
    }

    const enumMap: Record<string, string[]> = {
      'UG': ['BTech', 'BE'],           // Undergraduate programs
      'PG': ['MTech', 'ME', 'PhD'],    // Postgraduate programs
      'Diploma': ['Diploma'],
      'Certificate': ['Certificate']
    };

    return enumMap[courseType];
  }

  private async getLMSCourses(courseType?: string): Promise<DropdownOption[]> {
    try {
      // Get courses from LMS schema
      // Note: courses table has course_type (enum) not course_type_id
      const pool = (this.courseTypeRepository as any).pool;

      let query = `
        SELECT
          id,
          name,
          code,
          course_type
        FROM lmsact.courses
        WHERE is_active = true
      `;

      const params: any[] = [];

      // Map course type code to enum values
      if (courseType) {
        const enumValues = this.mapCourseTypeToEnum(courseType);
        if (enumValues && enumValues.length > 0) {
          params.push(enumValues);
          query += ` AND course_type = ANY($${params.length})`;
        }
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);

      return result.rows.map((row: any) => ({
        value: row.id,
        label: row.name,
        code: row.code
      }));
    } catch (error) {
      throw new DomainError(`Failed to get LMS courses: ${error}`);
    }
  }

  private async getLMSDepartments(lmsCourseId?: string): Promise<DropdownOption[]> {
    try {
      console.log('🔍 getLMSDepartments - Called with lmsCourseId:', lmsCourseId);
      
      // Get departments directly from database
      const pool = (this.courseTypeRepository as any).pool;
      
      const query = `
        SELECT id, name, code 
        FROM lmsact.departments 
        ORDER BY name ASC
      `;
      
      const result = await pool.query(query);
      console.log('🔍 getLMSDepartments - Raw DB result count:', result.rows.length);
      console.log('🔍 getLMSDepartments - Sample rows:', JSON.stringify(result.rows.slice(0, 2), null, 2));
      
      const departments = result.rows.map((row: any) => ({
        value: row.id,
        label: row.name,
        code: row.code
      }));
      
      console.log('🔍 getLMSDepartments - Final departments:', departments.length);
      
      return departments;
    } catch (error) {
      console.error('❌ getLMSDepartments - Error:', error);
      console.error('❌ getLMSDepartments - Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw new DomainError(`Failed to get LMS departments: ${error}`);
    }
  }

  private async getLMSAcademicYears(lmsCourseId?: string): Promise<DropdownOption[]> {
    try {
      // Get academic years from LMS schema
      const pool = (this.courseTypeRepository as any).pool;

      const query = `
        SELECT
          id,
          year_name,
          year_name as code
        FROM lmsact.academic_years
        WHERE is_active = true
        ORDER BY year_name DESC
      `;

      const result = await pool.query(query);

      return result.rows
        .filter((row: any) => row.year_name) // Filter out rows with null year_name
        .map((row: any) => ({
          value: row.id,
          label: row.year_name,
          code: row.code
        }));
    } catch (error) {
      throw new DomainError(`Failed to get LMS academic years: ${error}`);
    }
  }

  /**
   * Map course type to ACT level ID
   * Based on workflowmgmt.levels table:
   * Diploma = 1, UG (Undergraduate) = 2
   * Note: PG and Certificate levels don't exist yet in the database
   */
  private getCourseTypeLevelId(courseType?: string): string | undefined {
    if (!courseType) {
      return undefined;
    }

    const levelMap: Record<string, string> = {
      'Diploma': '1',
      'UG': '2',
      'PG': '2', // Fallback to UG until PG level is added
      'Certificate': '1' // Fallback to Diploma until Certificate level is added
    };

    return levelMap[courseType];
  }

  private async getACTDepartments(courseType?: string): Promise<DropdownOption[]> {
    try {
      // Get level ID based on course type to filter departments
      const levelId = this.getCourseTypeLevelId(courseType);

      const actDepartments = await this.actSchemaRepository.getDepartments(levelId);

      return actDepartments.map(dept => ({
        value: dept.id,
        label: dept.name,
        code: dept.code
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT departments: ${error}`);
    }
  }

  private async getACTRegulations(actDepartmentId?: string): Promise<DropdownOption[]> {
    try {
      if (!actDepartmentId) {
        return []; // Return empty array if no department selected
      }

      const actRegulations = await this.actSchemaRepository.getRegulationsByDepartment(actDepartmentId);
      
      return actRegulations.map(reg => ({
        value: reg.id,
        label: `${reg.name} (${reg.academicYear})`,
        code: reg.code
      }));
    } catch (error) {
      throw new DomainError(`Failed to get ACT regulations: ${error}`);
    }
  }
}
