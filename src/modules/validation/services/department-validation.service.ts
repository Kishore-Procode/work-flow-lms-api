/**
 * Department Validation Service
 * 
 * Comprehensive service for validating department count and selection
 * following MNC enterprise standards for business rule validation.
 * 
 * Features:
 * - Department count validation against selected departments
 * - Department availability validation
 * - College-department relationship validation
 * - Custom department handling ("Others" option)
 * - Business rule enforcement
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { appLogger } from '../../../utils/logger';

export interface DepartmentValidationRequest {
  collegeId: string;
  departmentCount: number;
  selectedDepartments: string[];
  customDepartments?: string[];
}

export interface DepartmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  collegeId: string;
  isActive: boolean;
  isCustom: boolean;
}

/**
 * Department Validation Service Class
 */
export class DepartmentValidationService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Validate department count and selection
   */
  async validateDepartmentSelection(request: DepartmentValidationRequest): Promise<DepartmentValidationResult> {
    try {
      const { collegeId, departmentCount, selectedDepartments, customDepartments = [] } = request;
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Basic validation
      if (departmentCount < 1 || departmentCount > 30) {
        errors.push('Department count must be between 1 and 30');
      }

      if (selectedDepartments.length === 0) {
        errors.push('At least one department must be selected');
      }

      // Validate department count matches selection
      const totalSelectedDepartments = selectedDepartments.length + customDepartments.length;
      if (totalSelectedDepartments !== departmentCount) {
        errors.push(
          `Department count (${departmentCount}) must match the number of selected departments (${totalSelectedDepartments})`
        );
      }

      // Validate college exists
      const collegeExists = await this.validateCollegeExists(collegeId);
      if (!collegeExists) {
        errors.push('Invalid college selected');
        return { valid: false, errors, warnings, suggestions };
      }

      // Validate selected departments belong to college
      const departmentValidation = await this.validateDepartmentsBelongToCollege(
        selectedDepartments,
        collegeId
      );

      if (!departmentValidation.valid) {
        errors.push(...departmentValidation.errors);
      }

      // Check for duplicate departments
      const duplicates = this.findDuplicateDepartments(selectedDepartments);
      if (duplicates.length > 0) {
        errors.push(`Duplicate departments selected: ${duplicates.join(', ')}`);
      }

      // Validate custom departments
      if (customDepartments.length > 0) {
        const customValidation = this.validateCustomDepartments(customDepartments);
        if (!customValidation.valid) {
          errors.push(...customValidation.errors);
        }
        warnings.push(...customValidation.warnings);
      }

      // Business rule validations
      const businessRuleValidation = await this.validateBusinessRules(request);
      errors.push(...businessRuleValidation.errors);
      warnings.push(...businessRuleValidation.warnings);
      suggestions.push(...businessRuleValidation.suggestions);

      // Generate suggestions for improvement
      if (errors.length === 0) {
        const improvementSuggestions = await this.generateImprovementSuggestions(request);
        suggestions.push(...improvementSuggestions);
      }

      const result: DepartmentValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };

      // Log validation result
      appLogger.info('Department validation completed', {
        collegeId,
        departmentCount,
        selectedCount: selectedDepartments.length,
        customCount: customDepartments.length,
        valid: result.valid,
        errorCount: errors.length,
        warningCount: warnings.length,
      });

      return result;
    } catch (error) {
      appLogger.error('Department validation failed', {
        error,
        request,
      });
      throw error;
    }
  }

  /**
   * Get available departments for a college
   */
  async getAvailableDepartments(collegeId: string): Promise<DepartmentInfo[]> {
    try {
      const query = `
        SELECT id, name, code, college_id, is_active, is_custom
        FROM departments
        WHERE college_id = $1 AND is_active = true
        ORDER BY is_custom ASC, name ASC
      `;

      const result = await this.db.query(query, [collegeId]);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        collegeId: row.college_id,
        isActive: row.is_active,
        isCustom: row.is_custom,
      }));
    } catch (error) {
      appLogger.error('Failed to get available departments', {
        error,
        collegeId,
      });
      throw error;
    }
  }

  /**
   * Create custom department
   */
  async createCustomDepartment(
    collegeId: string,
    departmentName: string,
    createdBy: string
  ): Promise<DepartmentInfo> {
    try {
      // Validate department name
      if (!departmentName || departmentName.trim().length < 2) {
        throw new Error('Department name must be at least 2 characters long');
      }

      // Check if department already exists
      const existingQuery = `
        SELECT id FROM departments
        WHERE college_id = $1 AND LOWER(name) = LOWER($2)
      `;
      const existingResult = await this.db.query(existingQuery, [collegeId, departmentName.trim()]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('Department with this name already exists');
      }

      // Generate department code
      const code = this.generateDepartmentCode(departmentName);

      // Create department
      const insertQuery = `
        INSERT INTO departments (name, code, college_id, is_active, is_custom)
        VALUES ($1, $2, $3, true, true)
        RETURNING id, name, code, college_id, is_active, is_custom
      `;

      const result = await this.db.query(insertQuery, [
        departmentName.trim(),
        code,
        collegeId,
      ]);

      const department = result.rows[0];

      appLogger.info('Custom department created', {
        departmentId: department.id,
        departmentName: department.name,
        collegeId,
        createdBy,
      });

      return {
        id: department.id,
        name: department.name,
        code: department.code,
        collegeId: department.college_id,
        isActive: department.is_active,
        isCustom: department.is_custom,
      };
    } catch (error) {
      appLogger.error('Failed to create custom department', {
        error,
        collegeId,
        departmentName,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Validate college exists
   */
  private async validateCollegeExists(collegeId: string): Promise<boolean> {
    try {
      const query = 'SELECT id FROM colleges WHERE id = $1 AND status = $2';
      const result = await this.db.query(query, [collegeId, 'active']);
      return result.rows.length > 0;
    } catch (error) {
      appLogger.error('Failed to validate college exists', { error, collegeId });
      return false;
    }
  }

  /**
   * Validate departments belong to college
   */
  private async validateDepartmentsBelongToCollege(
    departmentIds: string[],
    collegeId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      if (departmentIds.length === 0) {
        return { valid: true, errors: [] };
      }

      const query = `
        SELECT id, name FROM departments
        WHERE id = ANY($1) AND college_id = $2 AND is_active = true
      `;

      const result = await this.db.query(query, [departmentIds, collegeId]);
      const foundIds = result.rows.map(row => row.id);
      const missingIds = departmentIds.filter(id => !foundIds.includes(id));

      if (missingIds.length > 0) {
        return {
          valid: false,
          errors: [`Invalid departments selected: ${missingIds.join(', ')}`],
        };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      appLogger.error('Failed to validate departments belong to college', {
        error,
        departmentIds,
        collegeId,
      });
      return {
        valid: false,
        errors: ['Failed to validate department selection'],
      };
    }
  }

  /**
   * Find duplicate departments
   */
  private findDuplicateDepartments(departmentIds: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const id of departmentIds) {
      if (seen.has(id)) {
        duplicates.add(id);
      } else {
        seen.add(id);
      }
    }

    return Array.from(duplicates);
  }

  /**
   * Validate custom departments
   */
  private validateCustomDepartments(customDepartments: string[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const dept of customDepartments) {
      if (!dept || dept.trim().length < 2) {
        errors.push('Custom department names must be at least 2 characters long');
      } else if (dept.trim().length > 100) {
        errors.push('Custom department names must be less than 100 characters');
      } else if (!/^[a-zA-Z0-9\s&-]+$/.test(dept.trim())) {
        errors.push(`Invalid characters in custom department name: ${dept}`);
      }
    }

    // Check for duplicate custom departments
    const duplicates = customDepartments.filter(
      (dept, index) => customDepartments.indexOf(dept) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate custom departments: ${duplicates.join(', ')}`);
    }

    if (customDepartments.length > 5) {
      warnings.push('Consider using predefined departments instead of many custom ones');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(request: DepartmentValidationRequest): Promise<{
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Rule: Engineering colleges should have at least 4 departments
    if (request.departmentCount < 4) {
      warnings.push('Engineering colleges typically have at least 4 departments');
    }

    // Rule: Too many departments might indicate data entry error
    if (request.departmentCount > 20) {
      warnings.push('Large number of departments detected. Please verify the count.');
    }

    // Rule: Custom departments should be used sparingly
    const customCount = request.customDepartments?.length || 0;
    if (customCount > request.departmentCount * 0.3) {
      warnings.push('High number of custom departments. Consider using predefined options.');
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(
    request: DepartmentValidationRequest
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest common departments if count is low
    if (request.departmentCount < 6) {
      suggestions.push('Consider adding common departments like Computer Science, Electronics, Mechanical');
    }

    // Suggest department organization
    if (request.departmentCount > 15) {
      suggestions.push('Consider organizing departments into schools or faculties for better management');
    }

    return suggestions;
  }

  /**
   * Generate department code from name
   */
  private generateDepartmentCode(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
  }
}

// Export singleton instance
export const departmentValidationService = new DepartmentValidationService(
  require('../../../config/database').pool
);
