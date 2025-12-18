/**
 * Enrollment Domain Service
 * 
 * Domain service that handles complex enrollment business logic
 * that spans multiple entities and doesn't belong to a single entity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { User } from '../entities/User';
import { LearningResource } from '../entities/LearningResource';
import { Department } from '../entities/Department';
import { College } from '../entities/College';
import { UserRole } from '../value-objects/UserRole';
import { DomainError } from '../errors/DomainError';

export interface EnrollmentEligibility {
  isEligible: boolean;
  reasons: string[];
  requirements: string[];
}

export interface EnrollmentResult {
  success: boolean;
  enrollmentId?: string;
  message: string;
  warnings?: string[];
}

export interface BulkEnrollmentResult {
  successful: Array<{ studentId: string; resourceId: string; enrollmentId: string }>;
  failed: Array<{ studentId: string; resourceId: string; reason: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class EnrollmentService {
  /**
   * Check if a student is eligible for a learning resource
   */
  public static checkEligibility(
    student: User,
    resource: LearningResource,
    department?: Department,
    college?: College
  ): EnrollmentEligibility {
    const reasons: string[] = [];
    const requirements: string[] = [];

    // Check if user is a student
    if (!student.role.equals(UserRole.student())) {
      reasons.push('Only students can be enrolled in learning resources');
      return { isEligible: false, reasons, requirements };
    }

    // Check if student is active
    if (!student.status.canAccessResources()) {
      reasons.push('Student account must be active to enroll');
      requirements.push('Activate student account');
    }

    // Check if resource is available
    if (!resource.isAvailable()) {
      reasons.push('Learning resource is not available for enrollment');
      requirements.push('Resource must be in available status');
    }

    // Check college association
    if (student.collegeId !== resource.getCollegeId()) {
      reasons.push('Student and resource must belong to the same college');
      requirements.push('Ensure student and resource are in the same college');
    }

    // Check department association if resource has department
    if (resource.getDepartmentId()) {
      if (!student.departmentId) {
        reasons.push('Student must be assigned to a department for this resource');
        requirements.push('Assign student to a department');
      } else if (student.departmentId !== resource.getDepartmentId()) {
        reasons.push('Student and resource must belong to the same department');
        requirements.push('Ensure student and resource are in the same department');
      }
    }

    // Check if student already has too many active enrollments
    // This would require repository access, so we'll add it as a requirement
    requirements.push('Check student enrollment limits');

    // Check if resource has capacity (if applicable)
    requirements.push('Verify resource capacity availability');

    const isEligible = reasons.length === 0;
    return { isEligible, reasons, requirements };
  }

  /**
   * Validate enrollment prerequisites
   */
  public static validatePrerequisites(
    student: User,
    resource: LearningResource,
    completedResources: string[] = []
  ): { isValid: boolean; missingPrerequisites: string[] } {
    const missingPrerequisites: string[] = [];

    // Check if student has required role permissions
    if (!student.role.getPermissions().includes('enroll_in_resources')) {
      missingPrerequisites.push('Student role must have enrollment permissions');
    }

    // Check if student has completed prerequisite resources
    // This would be based on resource category or specific prerequisites
    const resourceCategory = resource.getCategory();

    // Example: Advanced courses require basic courses
    if (resourceCategory.toLowerCase().includes('advanced')) {
      const hasBasicCourse = completedResources.some(code =>
        code.toLowerCase().includes('basic') || code.toLowerCase().includes('intro')
      );

      if (!hasBasicCourse) {
        missingPrerequisites.push('Basic or introductory course completion required');
      }
    }

    // Check academic year requirements (if student has year information)
    const studentYear = student.year;
    if (studentYear) {
      const resourceCode = resource.getResourceCode();

      // Extract year requirement from resource code (e.g., CS201 for 2nd year)
      const yearMatch = resourceCode.match(/(\d)0\d$/);
      if (yearMatch) {
        const requiredYear = parseInt(yearMatch[1], 10);
        const currentYear = studentYear;

        if (currentYear < requiredYear) {
          missingPrerequisites.push(`Student must be in year ${requiredYear} or higher`);
        }
      }
    }

    return {
      isValid: missingPrerequisites.length === 0,
      missingPrerequisites,
    };
  }

  /**
   * Calculate enrollment priority score
   */
  public static calculateEnrollmentPriority(
    student: User,
    resource: LearningResource,
    waitingTime: number = 0
  ): number {
    let priority = 0;

    // Base priority by student year (higher year = higher priority)
    const studentYear = student.year;
    if (studentYear) {
      priority += studentYear * 10;
    }

    // Priority boost for same department
    if (student.departmentId === resource.getDepartmentId()) {
      priority += 20;
    }

    // Priority boost for waiting time (1 point per day)
    priority += Math.floor(waitingTime / (24 * 60 * 60 * 1000)); // Convert ms to days

    // Priority boost for resource category alignment
    const resourceCategory = resource.getCategory().toLowerCase();
    const studentSection = student.section?.toLowerCase();

    if (studentSection && resourceCategory.includes(studentSection)) {
      priority += 15;
    }

    // Penalty for already assigned resources (would need repository access)
    // This would be calculated based on current enrollment count

    return Math.max(0, priority);
  }

  /**
   * Determine optimal enrollment batch size
   */
  public static calculateOptimalBatchSize(
    totalStudents: number,
    availableResources: number,
    processingCapacity: number = 100
  ): number {
    // Calculate based on resource availability and processing capacity
    const resourceRatio = availableResources / totalStudents;
    const baseBatchSize = Math.min(processingCapacity, totalStudents);

    // Adjust batch size based on resource availability
    if (resourceRatio < 0.5) {
      // Limited resources, smaller batches for better control
      return Math.max(10, Math.floor(baseBatchSize * 0.3));
    } else if (resourceRatio > 2) {
      // Abundant resources, larger batches for efficiency
      return Math.min(processingCapacity, Math.floor(baseBatchSize * 1.5));
    }

    return Math.floor(baseBatchSize * 0.7);
  }

  /**
   * Generate enrollment recommendations
   */
  public static generateRecommendations(
    student: User,
    availableResources: LearningResource[],
    completedResources: string[] = []
  ): Array<{ resource: LearningResource; score: number; reasons: string[] }> {
    const recommendations: Array<{ resource: LearningResource; score: number; reasons: string[] }> = [];

    for (const resource of availableResources) {
      const eligibility = this.checkEligibility(student, resource);
      
      if (!eligibility.isEligible) {
        continue; // Skip ineligible resources
      }

      let score = 0;
      const reasons: string[] = [];

      // Score based on department match
      if (student.departmentId === resource.getDepartmentId()) {
        score += 30;
        reasons.push('Matches your department');
      }

      // Score based on resource category
      const category = resource.getCategory().toLowerCase();
      const studentYear = student.year;

      if (studentYear) {
        const year = studentYear;

        // Prefer resources appropriate for student's year
        if (category.includes('basic') && year === 1) {
          score += 25;
          reasons.push('Suitable for first year students');
        } else if (category.includes('intermediate') && year === 2) {
          score += 25;
          reasons.push('Suitable for second year students');
        } else if (category.includes('advanced') && year >= 3) {
          score += 25;
          reasons.push('Suitable for advanced students');
        }
      }

      // Score based on prerequisites completion
      const prerequisites = this.validatePrerequisites(student, resource, completedResources);
      if (prerequisites.isValid) {
        score += 20;
        reasons.push('All prerequisites met');
      }

      // Score based on resource availability (newer resources might be preferred)
      const daysSinceCreated = Math.floor(
        (Date.now() - resource.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCreated < 30) {
        score += 10;
        reasons.push('Recently added resource');
      }

      // Bonus for resources with learning context
      if (resource.getLearningContext()) {
        score += 5;
        reasons.push('Has detailed learning context');
      }

      recommendations.push({ resource, score, reasons });
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Validate bulk enrollment request
   */
  public static validateBulkEnrollment(
    enrollments: Array<{ studentId: string; resourceId: string }>,
    students: Map<string, User>,
    resources: Map<string, LearningResource>
  ): Array<{ studentId: string; resourceId: string; isValid: boolean; errors: string[] }> {
    const results: Array<{ studentId: string; resourceId: string; isValid: boolean; errors: string[] }> = [];

    for (const enrollment of enrollments) {
      const errors: string[] = [];
      
      const student = students.get(enrollment.studentId);
      const resource = resources.get(enrollment.resourceId);

      if (!student) {
        errors.push('Student not found');
      }

      if (!resource) {
        errors.push('Resource not found');
      }

      if (student && resource) {
        const eligibility = this.checkEligibility(student, resource);
        if (!eligibility.isEligible) {
          errors.push(...eligibility.reasons);
        }
      }

      results.push({
        studentId: enrollment.studentId,
        resourceId: enrollment.resourceId,
        isValid: errors.length === 0,
        errors,
      });
    }

    return results;
  }

  /**
   * Calculate enrollment statistics
   */
  public static calculateEnrollmentStats(
    enrollments: Array<{ studentId: string; resourceId: string; enrolledAt: Date }>,
    students: Map<string, User>,
    resources: Map<string, LearningResource>
  ): {
    totalEnrollments: number;
    byDepartment: Record<string, number>;
    byResourceCategory: Record<string, number>;
    byStudentYear: Record<string, number>;
    averageEnrollmentsPerStudent: number;
    averageEnrollmentsPerResource: number;
  } {
    const stats = {
      totalEnrollments: enrollments.length,
      byDepartment: {} as Record<string, number>,
      byResourceCategory: {} as Record<string, number>,
      byStudentYear: {} as Record<string, number>,
      averageEnrollmentsPerStudent: 0,
      averageEnrollmentsPerResource: 0,
    };

    const studentEnrollmentCounts = new Map<string, number>();
    const resourceEnrollmentCounts = new Map<string, number>();

    for (const enrollment of enrollments) {
      const student = students.get(enrollment.studentId);
      const resource = resources.get(enrollment.resourceId);

      if (student) {
        // Count by department
        const deptId = student.departmentId || 'unknown';
        stats.byDepartment[deptId] = (stats.byDepartment[deptId] || 0) + 1;

        // Count by student year
        const year = student.year?.toString() || 'unknown';
        stats.byStudentYear[year] = (stats.byStudentYear[year] || 0) + 1;

        // Track student enrollment count
        studentEnrollmentCounts.set(
          enrollment.studentId,
          (studentEnrollmentCounts.get(enrollment.studentId) || 0) + 1
        );
      }

      if (resource) {
        // Count by resource category
        const category = resource.getCategory();
        stats.byResourceCategory[category] = (stats.byResourceCategory[category] || 0) + 1;

        // Track resource enrollment count
        resourceEnrollmentCounts.set(
          enrollment.resourceId,
          (resourceEnrollmentCounts.get(enrollment.resourceId) || 0) + 1
        );
      }
    }

    // Calculate averages
    if (studentEnrollmentCounts.size > 0) {
      const totalStudentEnrollments = Array.from(studentEnrollmentCounts.values()).reduce((a, b) => a + b, 0);
      stats.averageEnrollmentsPerStudent = totalStudentEnrollments / studentEnrollmentCounts.size;
    }

    if (resourceEnrollmentCounts.size > 0) {
      const totalResourceEnrollments = Array.from(resourceEnrollmentCounts.values()).reduce((a, b) => a + b, 0);
      stats.averageEnrollmentsPerResource = totalResourceEnrollments / resourceEnrollmentCounts.size;
    }

    return stats;
  }
}
