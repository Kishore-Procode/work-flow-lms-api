/**
 * User Domain Entity
 * 
 * Core business entity representing a user in the Student-ACT LMS system.
 * Contains business rules and validation logic independent of frameworks.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Email } from '../value-objects/Email';
import { UserRole } from '../value-objects/UserRole';
import { UserStatus } from '../value-objects/UserStatus';
import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export interface UserProps {
  id: string;
  email: Email;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  collegeId?: string;
  departmentId?: string;
  rollNumber?: string;
  year?: number;
  section?: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends DomainEntity<UserProps> {
  private constructor(props: UserProps) {
    super(props);
  }

  /**
   * Factory method to create a new User
   */
  public static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    const now = new Date();
    const userProps: UserProps = {
      ...props,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    const user = new User(userProps);
    user.validate();
    return user;
  }

  /**
   * Factory method to reconstitute User from persistence
   */
  public static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  /**
   * Business rule validation
   */
  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new DomainError('User name is required');
    }

    if (this.props.name.length > 100) {
      throw new DomainError('User name cannot exceed 100 characters');
    }

    // Student-specific validation
    if (this.props.role.isStudent()) {
      if (!this.props.collegeId) {
        throw new DomainError('Students must be associated with a college');
      }
      if (!this.props.departmentId) {
        throw new DomainError('Students must be associated with a department');
      }
      if (!this.props.rollNumber) {
        throw new DomainError('Students must have a roll number');
      }
    }

    // Staff-specific validation
    if (this.props.role.isStaff()) {
      if (!this.props.collegeId) {
        throw new DomainError('Staff must be associated with a college');
      }
      if (!this.props.departmentId) {
        throw new DomainError('Staff must be associated with a department');
      }
    }

    // Principal-specific validation
    if (this.props.role.isPrincipal()) {
      if (!this.props.collegeId) {
        throw new DomainError('Principals must be associated with a college');
      }
    }

    // HOD-specific validation
    if (this.props.role.isHOD()) {
      if (!this.props.collegeId) {
        throw new DomainError('HODs must be associated with a college');
      }
      if (!this.props.departmentId) {
        throw new DomainError('HODs must be associated with a department');
      }
    }
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public get id(): string {
    return this.props.id;
  }

  public get email(): Email {
    return this.props.email;
  }

  public get name(): string {
    return this.props.name;
  }

  public get phone(): string | undefined {
    return this.props.phone;
  }

  public get role(): UserRole {
    return this.props.role;
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get collegeId(): string | undefined {
    return this.props.collegeId;
  }

  public get departmentId(): string | undefined {
    return this.props.departmentId;
  }

  public get rollNumber(): string | undefined {
    return this.props.rollNumber;
  }

  public get year(): number | undefined {
    return this.props.year;
  }

  public get section(): string | undefined {
    return this.props.section;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  public changeEmail(newEmail: Email): void {
    this.props.email = newEmail;
    this.props.updatedAt = new Date();
  }

  public changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new DomainError('User name is required');
    }
    if (newName.length > 100) {
      throw new DomainError('User name cannot exceed 100 characters');
    }
    
    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  public changePhone(newPhone?: string): void {
    this.props.phone = newPhone;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    if (this.props.status.isActive()) {
      throw new DomainError('User is already active');
    }
    
    this.props.status = UserStatus.active();
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    if (!this.props.status.isActive()) {
      throw new DomainError('User is not active');
    }
    
    this.props.status = UserStatus.inactive();
    this.props.updatedAt = new Date();
  }

  public suspend(): void {
    if (this.props.status.isSuspended()) {
      throw new DomainError('User is already suspended');
    }
    
    this.props.status = UserStatus.suspended();
    this.props.updatedAt = new Date();
  }

  public changePassword(newPasswordHash: string): void {
    if (!newPasswordHash) {
      throw new DomainError('Password hash is required');
    }
    
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  public assignToCollege(collegeId: string): void {
    if (!collegeId) {
      throw new DomainError('College ID is required');
    }
    
    this.props.collegeId = collegeId;
    this.props.updatedAt = new Date();
  }

  public assignToDepartment(departmentId: string): void {
    if (!departmentId) {
      throw new DomainError('Department ID is required');
    }
    
    this.props.departmentId = departmentId;
    this.props.updatedAt = new Date();
  }

  public updateStudentDetails(rollNumber: string, year: number, section?: string): void {
    if (!this.props.role.isStudent()) {
      throw new DomainError('Only students can have student details updated');
    }
    
    if (!rollNumber) {
      throw new DomainError('Roll number is required for students');
    }
    
    if (!year || year < 1 || year > 4) {
      throw new DomainError('Year must be between 1 and 4');
    }
    
    this.props.rollNumber = rollNumber;
    this.props.year = year;
    this.props.section = section;
    this.props.updatedAt = new Date();
  }

  // Business rule checks
  public canAccessCollege(collegeId: string): boolean {
    // Super admin and admin can access any college
    if (this.props.role.isSuperAdmin() || this.props.role.isAdmin()) {
      return true;
    }
    
    // Others can only access their assigned college
    return this.props.collegeId === collegeId;
  }

  public canAccessDepartment(departmentId: string): boolean {
    // Super admin and admin can access any department
    if (this.props.role.isSuperAdmin() || this.props.role.isAdmin()) {
      return true;
    }
    
    // Principals can access any department in their college
    if (this.props.role.isPrincipal()) {
      return true; // College-level access check should be done separately
    }
    
    // Others can only access their assigned department
    return this.props.departmentId === departmentId;
  }

  public canManageUser(targetUser: User): boolean {
    // Super admin can manage anyone
    if (this.props.role.isSuperAdmin()) {
      return true;
    }
    
    // Admin can manage non-super-admin users
    if (this.props.role.isAdmin()) {
      return !targetUser.role.isSuperAdmin();
    }
    
    // Principal can manage users in their college (except admin and super admin)
    if (this.props.role.isPrincipal()) {
      return targetUser.collegeId === this.props.collegeId &&
             !targetUser.role.isAdmin() &&
             !targetUser.role.isSuperAdmin();
    }
    
    // HOD can manage users in their department (except admin, super admin, and principal)
    if (this.props.role.isHOD()) {
      return targetUser.departmentId === this.props.departmentId &&
             !targetUser.role.isAdmin() &&
             !targetUser.role.isSuperAdmin() &&
             !targetUser.role.isPrincipal();
    }
    
    // Staff and students cannot manage other users
    return false;
  }

  public isActive(): boolean {
    return this.props.status.isActive();
  }

  public hasPasswordHash(): boolean {
    return !!this.props.passwordHash;
  }

  /**
   * Convert to plain object for persistence
   */
  public toPersistence(): any {
    return {
      id: this.props.id,
      email: this.props.email.value,
      name: this.props.name,
      phone: this.props.phone,
      role: this.props.role.value,
      status: this.props.status.value,
      college_id: this.props.collegeId,
      department_id: this.props.departmentId,
      roll_number: this.props.rollNumber,
      year: this.props.year,
      section: this.props.section,
      password_hash: this.props.passwordHash,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }
}
