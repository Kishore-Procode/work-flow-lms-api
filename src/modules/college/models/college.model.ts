import { College, CollegeStatus } from '../../../types';

export interface CreateCollegeRequest {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  established?: string;
  principalId?: string;
  status?: CollegeStatus;
}

export interface UpdateCollegeRequest {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  established?: string;
  principalId?: string;
  status?: CollegeStatus;
}

export interface CollegeWithDetails extends College {
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  departmentCount?: number;
  studentCount?: number;
  staffCount?: number;
  resourceCount?: number;
}

export interface CollegeStatistics {
  totalColleges: number;
  collegesByStatus: Record<CollegeStatus, number>;
  collegesWithPrincipal: number;
  collegesWithoutPrincipal: number;
  averageDepartmentsPerCollege: number;
  averageStudentsPerCollege: number;
}

export class CollegeModel {
  /**
   * Validate create college request
   */
  static validateCreateCollegeRequest(data: any): data is CreateCollegeRequest {
    return (
      typeof data === 'object' &&
      typeof data.name === 'string' &&
      typeof data.address === 'string' &&
      typeof data.phone === 'string' &&
      typeof data.email === 'string' &&
      data.name.length > 0 &&
      data.address.length > 0 &&
      data.phone.length > 0 &&
      this.isValidEmail(data.email)
    );
  }

  /**
   * Validate update college request
   */
  static validateUpdateCollegeRequest(data: any): data is UpdateCollegeRequest {
    if (typeof data !== 'object') return false;
    
    const validFields = ['name', 'address', 'phone', 'email', 'website', 'established', 'principalId', 'status'];
    const hasValidFields = Object.keys(data).every(key => validFields.includes(key));
    
    if (!hasValidFields) return false;
    
    // Validate email if provided
    if (data.email && !this.isValidEmail(data.email)) return false;
    
    // Validate status if provided
    if (data.status && !['active', 'inactive', 'suspended'].includes(data.status)) return false;
    
    return true;
  }

  /**
   * Create college with details
   */
  static createCollegeWithDetails(
    college: College,
    principalName?: string,
    principalEmail?: string,
    principalPhone?: string,
    departmentCount?: number,
    studentCount?: number,
    staffCount?: number,
    resourceCount?: number
  ): CollegeWithDetails {
    return {
      ...college,
      principalName,
      principalEmail,
      principalPhone,
      departmentCount,
      studentCount,
      staffCount,
      resourceCount,
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Validate website URL
   */
  static isValidWebsite(website: string): boolean {
    try {
      new URL(website);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format college display name
   */
  static formatDisplayName(college: College): string {
    return `${college.name} (${college.established || 'Est. Unknown'})`;
  }

  /**
   * Get college status display
   */
  static getStatusDisplay(status: CollegeStatus): string {
    const statusMap = {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
    };
    return statusMap[status] || status;
  }

  /**
   * Check if college can be deleted
   */
  static canDelete(college: College, departmentCount: number, studentCount: number): boolean {
    // College can only be deleted if it has no departments or students
    return departmentCount === 0 && studentCount === 0;
  }

  /**
   * Generate college code from name
   */
  static generateCollegeCode(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 6);
  }

  /**
   * Calculate college metrics
   */
  static calculateMetrics(
    departmentCount: number,
    studentCount: number,
    staffCount: number,
    resourceCount: number
  ) {
    return {
      studentsPerDepartment: departmentCount > 0 ? Math.round(studentCount / departmentCount) : 0,
      resourcesPerStudent: studentCount > 0 ? Math.round(resourceCount / studentCount) : 0,
      staffToStudentRatio: studentCount > 0 ? Math.round(studentCount / Math.max(staffCount, 1)) : 0,
    };
  }

  /**
   * Validate establishment year
   */
  static isValidEstablishmentYear(year: string): boolean {
    const yearNum = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    return yearNum >= 1800 && yearNum <= currentYear;
  }
}
