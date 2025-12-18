/**
 * College Domain Entity
 * 
 * Core business entity representing a college in the Student-ACT LMS system.
 * Contains business rules and validation logic for educational institutions.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainEntity } from './base/DomainEntity';
import { DomainError } from '../errors/DomainError';

export interface CollegeProps {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  website?: string;
  principalId?: string;
  isActive: boolean;
  establishedYear?: number;
  affiliatedUniversity?: string;
  accreditation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class College extends DomainEntity<CollegeProps> {
  private constructor(props: CollegeProps) {
    super(props);
  }

  /**
   * Factory method to create a new College
   */
  public static create(props: Omit<CollegeProps, 'id' | 'createdAt' | 'updatedAt'>): College {
    const now = new Date();
    const collegeProps: CollegeProps = {
      ...props,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };

    const college = new College(collegeProps);
    college.validate();
    return college;
  }

  /**
   * Factory method to reconstitute College from persistence
   */
  public static fromPersistence(props: CollegeProps): College {
    return new College(props);
  }

  /**
   * Business rule validation
   */
  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new DomainError('College name is required');
    }

    if (this.props.name.length > 200) {
      throw new DomainError('College name cannot exceed 200 characters');
    }

    if (!this.props.code || this.props.code.trim().length === 0) {
      throw new DomainError('College code is required');
    }

    if (this.props.code.length > 20) {
      throw new DomainError('College code cannot exceed 20 characters');
    }

    if (!this.props.address || this.props.address.trim().length === 0) {
      throw new DomainError('College address is required');
    }

    if (!this.props.city || this.props.city.trim().length === 0) {
      throw new DomainError('College city is required');
    }

    if (!this.props.state || this.props.state.trim().length === 0) {
      throw new DomainError('College state is required');
    }

    if (!this.props.pincode || this.props.pincode.trim().length === 0) {
      throw new DomainError('College pincode is required');
    }

    if (!/^\d{6}$/.test(this.props.pincode)) {
      throw new DomainError('College pincode must be 6 digits');
    }

    if (this.props.establishedYear && this.props.establishedYear > new Date().getFullYear()) {
      throw new DomainError('Established year cannot be in the future');
    }

    if (this.props.establishedYear && this.props.establishedYear < 1800) {
      throw new DomainError('Established year must be after 1800');
    }

    if (this.props.email && !this.isValidEmail(this.props.email)) {
      throw new DomainError('Invalid college email format');
    }

    if (this.props.website && !this.isValidWebsite(this.props.website)) {
      throw new DomainError('Invalid college website URL');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidWebsite(website: string): boolean {
    try {
      new URL(website);
      return true;
    } catch {
      return false;
    }
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public get name(): string {
    return this.props.name;
  }

  public get code(): string {
    return this.props.code;
  }

  public get address(): string {
    return this.props.address;
  }

  public get city(): string {
    return this.props.city;
  }

  public get state(): string {
    return this.props.state;
  }

  public get pincode(): string {
    return this.props.pincode;
  }

  public get phone(): string | undefined {
    return this.props.phone;
  }

  public get email(): string | undefined {
    return this.props.email;
  }

  public get website(): string | undefined {
    return this.props.website;
  }

  public get principalId(): string | undefined {
    return this.props.principalId;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get establishedYear(): number | undefined {
    return this.props.establishedYear;
  }

  public get affiliatedUniversity(): string | undefined {
    return this.props.affiliatedUniversity;
  }

  public get accreditation(): string | undefined {
    return this.props.accreditation;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  public changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new DomainError('College name is required');
    }
    if (newName.length > 200) {
      throw new DomainError('College name cannot exceed 200 characters');
    }
    
    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  public changeCode(newCode: string): void {
    if (!newCode || newCode.trim().length === 0) {
      throw new DomainError('College code is required');
    }
    if (newCode.length > 20) {
      throw new DomainError('College code cannot exceed 20 characters');
    }
    
    this.props.code = newCode.trim().toUpperCase();
    this.props.updatedAt = new Date();
  }

  public updateAddress(address: string, city: string, state: string, pincode: string): void {
    if (!address || address.trim().length === 0) {
      throw new DomainError('College address is required');
    }
    if (!city || city.trim().length === 0) {
      throw new DomainError('College city is required');
    }
    if (!state || state.trim().length === 0) {
      throw new DomainError('College state is required');
    }
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      throw new DomainError('College pincode must be 6 digits');
    }
    
    this.props.address = address.trim();
    this.props.city = city.trim();
    this.props.state = state.trim();
    this.props.pincode = pincode.trim();
    this.props.updatedAt = new Date();
  }

  public updateContactInfo(phone?: string, email?: string, website?: string): void {
    if (email && !this.isValidEmail(email)) {
      throw new DomainError('Invalid college email format');
    }
    if (website && !this.isValidWebsite(website)) {
      throw new DomainError('Invalid college website URL');
    }
    
    this.props.phone = phone?.trim();
    this.props.email = email?.trim().toLowerCase();
    this.props.website = website?.trim();
    this.props.updatedAt = new Date();
  }

  public assignPrincipal(principalId: string): void {
    if (!principalId) {
      throw new DomainError('Principal ID is required');
    }
    
    this.props.principalId = principalId;
    this.props.updatedAt = new Date();
  }

  public removePrincipal(): void {
    this.props.principalId = undefined;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    if (this.props.isActive) {
      throw new DomainError('College is already active');
    }
    
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    if (!this.props.isActive) {
      throw new DomainError('College is already inactive');
    }
    
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public updateEstablishedYear(year: number): void {
    if (year > new Date().getFullYear()) {
      throw new DomainError('Established year cannot be in the future');
    }
    if (year < 1800) {
      throw new DomainError('Established year must be after 1800');
    }
    
    this.props.establishedYear = year;
    this.props.updatedAt = new Date();
  }

  public updateAffiliation(university: string, accreditation?: string): void {
    this.props.affiliatedUniversity = university?.trim();
    this.props.accreditation = accreditation?.trim();
    this.props.updatedAt = new Date();
  }

  // Business rule checks
  public hasPrincipal(): boolean {
    return !!this.props.principalId;
  }

  public canAcceptStudents(): boolean {
    return this.props.isActive;
  }

  public getAge(): number {
    if (!this.props.establishedYear) {
      return 0;
    }
    return new Date().getFullYear() - this.props.establishedYear;
  }

  /**
   * Convert to plain object for persistence
   */
  public toPersistence(): any {
    return {
      id: this.props.id,
      name: this.props.name,
      code: this.props.code,
      address: this.props.address,
      city: this.props.city,
      state: this.props.state,
      pincode: this.props.pincode,
      phone: this.props.phone,
      email: this.props.email,
      website: this.props.website,
      principal_id: this.props.principalId,
      is_active: this.props.isActive,
      established_year: this.props.establishedYear,
      affiliated_university: this.props.affiliatedUniversity,
      accreditation: this.props.accreditation,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }
}
