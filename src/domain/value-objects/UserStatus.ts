/**
 * UserStatus Value Object
 * 
 * Represents user status in the Student-ACT LMS system.
 * Immutable value object that encapsulates status-related business rules.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainError } from '../errors/DomainError';

export type UserStatusType = 'active' | 'inactive' | 'pending' | 'suspended';

export class UserStatus {
  private readonly _value: UserStatusType;

  private constructor(value: UserStatusType) {
    this._value = value;
  }

  /**
   * Create a new UserStatus value object
   */
  public static create(value: string): UserStatus {
    if (!value) {
      throw new DomainError('User status is required');
    }

    const normalizedValue = value.toLowerCase().trim() as UserStatusType;
    
    if (!this.isValidStatus(normalizedValue)) {
      throw new DomainError(`Invalid user status: ${value}`);
    }

    return new UserStatus(normalizedValue);
  }

  /**
   * Factory methods for each status
   */
  public static active(): UserStatus {
    return new UserStatus('active');
  }

  public static inactive(): UserStatus {
    return new UserStatus('inactive');
  }

  public static pending(): UserStatus {
    return new UserStatus('pending');
  }

  public static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  /**
   * Validate if the status is valid
   */
  private static isValidStatus(status: string): status is UserStatusType {
    return ['active', 'inactive', 'pending', 'suspended'].includes(status);
  }

  /**
   * Get the status value
   */
  public get value(): UserStatusType {
    return this._value;
  }

  /**
   * Status type checks
   */
  public isActive(): boolean {
    return this._value === 'active';
  }

  public isInactive(): boolean {
    return this._value === 'inactive';
  }

  public isPending(): boolean {
    return this._value === 'pending';
  }

  public isSuspended(): boolean {
    return this._value === 'suspended';
  }

  /**
   * Check if user can login with this status
   */
  public canLogin(): boolean {
    return this.isActive();
  }

  /**
   * Check if user can access system resources
   */
  public canAccessResources(): boolean {
    return this.isActive();
  }

  /**
   * Check if status can be changed to another status
   */
  public canChangeTo(newStatus: UserStatus): boolean {
    // Define valid status transitions
    const validTransitions: Record<UserStatusType, UserStatusType[]> = {
      'pending': ['active', 'inactive'],
      'active': ['inactive', 'suspended'],
      'inactive': ['active', 'suspended'],
      'suspended': ['active', 'inactive'],
    };

    return validTransitions[this._value]?.includes(newStatus._value) ?? false;
  }

  /**
   * Get display name for the status
   */
  public getDisplayName(): string {
    const displayNames: Record<UserStatusType, string> = {
      'active': 'Active',
      'inactive': 'Inactive',
      'pending': 'Pending Approval',
      'suspended': 'Suspended',
    };

    return displayNames[this._value];
  }

  /**
   * Get description for the status
   */
  public getDescription(): string {
    const descriptions: Record<UserStatusType, string> = {
      'active': 'User account is active and can access the system',
      'inactive': 'User account is inactive and cannot access the system',
      'pending': 'User account is pending approval from administrators',
      'suspended': 'User account has been suspended due to policy violations',
    };

    return descriptions[this._value];
  }

  /**
   * Get CSS class for status display
   */
  public getCssClass(): string {
    const cssClasses: Record<UserStatusType, string> = {
      'active': 'status-active',
      'inactive': 'status-inactive',
      'pending': 'status-pending',
      'suspended': 'status-suspended',
    };

    return cssClasses[this._value];
  }

  /**
   * Get color code for status display
   */
  public getColorCode(): string {
    const colorCodes: Record<UserStatusType, string> = {
      'active': '#10B981', // Green
      'inactive': '#6B7280', // Gray
      'pending': '#F59E0B', // Yellow
      'suspended': '#EF4444', // Red
    };

    return colorCodes[this._value];
  }

  /**
   * Check equality with another UserStatus
   */
  public equals(other: UserStatus): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this._value;
  }
}
