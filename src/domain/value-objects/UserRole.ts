/**
 * UserRole Value Object
 * 
 * Represents user roles in the Student-ACT LMS system with hierarchy and permissions.
 * Immutable value object that encapsulates role-based business rules.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainError } from '../errors/DomainError';

export type UserRoleType = 'super_admin' | 'admin' | 'principal' | 'hod' | 'staff' | 'student';

export class UserRole {
  private readonly _value: UserRoleType;
  private readonly _hierarchy: number;

  // Role hierarchy levels
  private static readonly HIERARCHY_LEVELS: Record<UserRoleType, number> = {
    'super_admin': 100,
    'admin': 80,
    'principal': 60,
    'hod': 40,
    'staff': 20,
    'student': 10,
  };

  private constructor(value: UserRoleType) {
    this._value = value;
    this._hierarchy = UserRole.HIERARCHY_LEVELS[value];
  }

  /**
   * Create a new UserRole value object
   */
  public static create(value: string): UserRole {
    if (!value) {
      throw new DomainError('User role is required');
    }

    const normalizedValue = value.toLowerCase().trim() as UserRoleType;
    
    if (!this.isValidRole(normalizedValue)) {
      throw new DomainError(`Invalid user role: ${value}`);
    }

    return new UserRole(normalizedValue);
  }

  /**
   * Factory methods for each role
   */
  public static superAdmin(): UserRole {
    return new UserRole('super_admin');
  }

  public static admin(): UserRole {
    return new UserRole('admin');
  }

  public static principal(): UserRole {
    return new UserRole('principal');
  }

  public static hod(): UserRole {
    return new UserRole('hod');
  }

  public static staff(): UserRole {
    return new UserRole('staff');
  }

  public static student(): UserRole {
    return new UserRole('student');
  }

  /**
   * Validate if the role is valid
   */
  private static isValidRole(role: string): role is UserRoleType {
    return Object.keys(this.HIERARCHY_LEVELS).includes(role);
  }

  /**
   * Get the role value
   */
  public get value(): UserRoleType {
    return this._value;
  }

  /**
   * Get the role hierarchy level
   */
  public get hierarchyLevel(): number {
    return this._hierarchy;
  }

  /**
   * Role type checks
   */
  public isSuperAdmin(): boolean {
    return this._value === 'super_admin';
  }

  public isAdmin(): boolean {
    return this._value === 'admin';
  }

  public isPrincipal(): boolean {
    return this._value === 'principal';
  }

  public isHOD(): boolean {
    return this._value === 'hod';
  }

  public isStaff(): boolean {
    return this._value === 'staff';
  }

  public isStudent(): boolean {
    return this._value === 'student';
  }

  /**
   * Check if this role has higher or equal authority than another role
   */
  public hasAuthorityOver(otherRole: UserRole): boolean {
    return this._hierarchy > otherRole._hierarchy;
  }

  /**
   * Check if this role has equal or higher authority than another role
   */
  public hasEqualOrHigherAuthorityThan(otherRole: UserRole): boolean {
    return this._hierarchy >= otherRole._hierarchy;
  }

  /**
   * Check if this role can manage users of another role
   */
  public canManageRole(targetRole: UserRole): boolean {
    // Super admin can manage everyone
    if (this.isSuperAdmin()) {
      return true;
    }

    // Admin can manage everyone except super admin
    if (this.isAdmin()) {
      return !targetRole.isSuperAdmin();
    }

    // Principal can manage HOD, staff, and students
    if (this.isPrincipal()) {
      return targetRole.isHOD() || targetRole.isStaff() || targetRole.isStudent();
    }

    // HOD can manage staff and students
    if (this.isHOD()) {
      return targetRole.isStaff() || targetRole.isStudent();
    }

    // Staff and students cannot manage other roles
    return false;
  }

  /**
   * Get roles that this role can manage
   */
  public getManagedRoles(): UserRole[] {
    if (this.isSuperAdmin()) {
      return [
        UserRole.admin(),
        UserRole.principal(),
        UserRole.hod(),
        UserRole.staff(),
        UserRole.student(),
      ];
    }

    if (this.isAdmin()) {
      return [
        UserRole.principal(),
        UserRole.hod(),
        UserRole.staff(),
        UserRole.student(),
      ];
    }

    if (this.isPrincipal()) {
      return [
        UserRole.hod(),
        UserRole.staff(),
        UserRole.student(),
      ];
    }

    if (this.isHOD()) {
      return [
        UserRole.staff(),
        UserRole.student(),
      ];
    }

    return [];
  }

  /**
   * Check if this role requires college association
   */
  public requiresCollegeAssociation(): boolean {
    return !this.isSuperAdmin() && !this.isAdmin();
  }

  /**
   * Check if this role requires department association
   */
  public requiresDepartmentAssociation(): boolean {
    return this.isHOD() || this.isStaff() || this.isStudent();
  }

  /**
   * Get display name for the role
   */
  public getDisplayName(): string {
    const displayNames: Record<UserRoleType, string> = {
      'super_admin': 'Super Administrator',
      'admin': 'Administrator',
      'principal': 'Principal',
      'hod': 'Head of Department',
      'staff': 'Staff',
      'student': 'Student',
    };

    return displayNames[this._value];
  }

  /**
   * Get permissions for this role
   */
  public getPermissions(): string[] {
    const permissions: Record<UserRoleType, string[]> = {
      'super_admin': [
        'manage_all_users',
        'manage_all_colleges',
        'manage_all_departments',
        'manage_system_settings',
        'view_all_data',
        'manage_learning_resources',
      ],
      'admin': [
        'manage_users',
        'manage_colleges',
        'manage_departments',
        'view_all_data',
        'manage_learning_resources',
      ],
      'principal': [
        'manage_college_users',
        'manage_college_departments',
        'view_college_data',
        'manage_college_learning_resources',
      ],
      'hod': [
        'manage_department_users',
        'view_department_data',
        'manage_department_learning_resources',
      ],
      'staff': [
        'view_department_data',
        'manage_assigned_learning_resources',
      ],
      'student': [
        'view_own_data',
        'view_assigned_learning_resources',
      ],
    };

    return permissions[this._value];
  }

  /**
   * Check if this role has a specific permission
   */
  public hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  /**
   * Check equality with another UserRole
   */
  public equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this._value;
  }
}
