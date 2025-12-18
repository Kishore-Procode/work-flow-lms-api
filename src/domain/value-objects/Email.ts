/**
 * Email Value Object
 * 
 * Represents an email address with validation and business rules.
 * Immutable value object that ensures email validity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainError } from '../errors/DomainError';

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new Email value object
   */
  public static create(value: string): Email {
    if (!value) {
      throw new DomainError('Email is required');
    }

    const trimmedValue = value.trim().toLowerCase();
    
    if (!this.isValidEmail(trimmedValue)) {
      throw new DomainError('Invalid email format');
    }

    if (trimmedValue.length > 255) {
      throw new DomainError('Email cannot exceed 255 characters');
    }

    return new Email(trimmedValue);
  }

  /**
   * Validate email format using regex
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get the email value
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Get the domain part of the email
   */
  public get domain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Get the local part of the email
   */
  public get localPart(): string {
    return this._value.split('@')[0];
  }

  /**
   * Check if email belongs to a specific domain
   */
  public belongsToDomain(domain: string): boolean {
    return this.domain.toLowerCase() === domain.toLowerCase();
  }

  /**
   * Check if email is from an educational institution
   */
  public isEducationalEmail(): boolean {
    const educationalDomains = ['.edu', '.ac.', '.edu.'];
    return educationalDomains.some(domain => this._value.includes(domain));
  }

  /**
   * Check equality with another Email
   */
  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this._value;
  }
}
