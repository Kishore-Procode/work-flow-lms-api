/**
 * Resource Code Value Object
 * 
 * Represents a learning resource code with validation and business rules.
 * Immutable value object that ensures resource code integrity.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DomainError } from '../errors/DomainError';

export class ResourceCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a resource code
   */
  public static create(value: string): ResourceCode {
    if (!value?.trim()) {
      throw DomainError.validation('Resource code is required');
    }

    const trimmedValue = value.trim().toUpperCase();

    // Validate format: 3-50 alphanumeric characters
    if (!/^[A-Z0-9]{3,50}$/.test(trimmedValue)) {
      throw DomainError.validation('Resource code must be 3-50 alphanumeric characters');
    }

    return new ResourceCode(trimmedValue);
  }

  /**
   * Get the resource code value
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Get the prefix (first 2-3 characters)
   */
  public get prefix(): string {
    return this._value.substring(0, Math.min(3, this._value.length));
  }

  /**
   * Get the numeric suffix if present
   */
  public get numericSuffix(): string | null {
    const match = this._value.match(/(\d+)$/);
    return match ? match[1] : null;
  }

  /**
   * Check if code follows course pattern (e.g., CS101, MATH201)
   */
  public isCoursePattern(): boolean {
    return /^[A-Z]{2,4}\d{3,4}$/.test(this._value);
  }

  /**
   * Check if code follows module pattern (e.g., CS101M1, MATH201L2)
   */
  public isModulePattern(): boolean {
    return /^[A-Z]{2,4}\d{3,4}[A-Z]\d+$/.test(this._value);
  }

  /**
   * Check if code follows lab pattern (e.g., CS101LAB, PHYSLAB1)
   */
  public isLabPattern(): boolean {
    return /LAB/i.test(this._value);
  }

  /**
   * Check if code follows project pattern (e.g., CS101PROJ, FINALPROJ)
   */
  public isProjectPattern(): boolean {
    return /PROJ/i.test(this._value);
  }

  /**
   * Generate next sequential code (if numeric suffix exists)
   */
  public getNextSequential(): ResourceCode | null {
    const numericSuffix = this.numericSuffix;
    if (!numericSuffix) {
      return null;
    }

    const prefix = this._value.substring(0, this._value.length - numericSuffix.length);
    const nextNumber = parseInt(numericSuffix, 10) + 1;
    const nextCode = prefix + nextNumber.toString().padStart(numericSuffix.length, '0');

    return ResourceCode.create(nextCode);
  }

  /**
   * Check if this code is sequential to another
   */
  public isSequentialTo(other: ResourceCode): boolean {
    const thisNumeric = this.numericSuffix;
    const otherNumeric = other.numericSuffix;

    if (!thisNumeric || !otherNumeric) {
      return false;
    }

    const thisPrefix = this._value.substring(0, this._value.length - thisNumeric.length);
    const otherPrefix = other._value.substring(0, other._value.length - otherNumeric.length);

    if (thisPrefix !== otherPrefix) {
      return false;
    }

    const thisNum = parseInt(thisNumeric, 10);
    const otherNum = parseInt(otherNumeric, 10);

    return Math.abs(thisNum - otherNum) === 1;
  }

  /**
   * Get category based on code pattern
   */
  public getCategory(): string {
    if (this.isLabPattern()) {
      return 'Laboratory';
    }
    if (this.isProjectPattern()) {
      return 'Project';
    }
    if (this.isModulePattern()) {
      return 'Module';
    }
    if (this.isCoursePattern()) {
      return 'Course';
    }
    return 'General';
  }

  /**
   * Get subject code (prefix without numbers)
   */
  public getSubjectCode(): string {
    const match = this._value.match(/^([A-Z]+)/);
    return match ? match[1] : this._value;
  }

  /**
   * Check if belongs to same subject as another code
   */
  public isSameSubject(other: ResourceCode): boolean {
    return this.getSubjectCode() === other.getSubjectCode();
  }

  /**
   * Format for display
   */
  public format(): string {
    if (this.isCoursePattern()) {
      const subject = this.getSubjectCode();
      const number = this._value.substring(subject.length);
      return `${subject} ${number}`;
    }
    return this._value;
  }

  /**
   * Validate code format for specific patterns
   */
  public static validatePattern(value: string, pattern: 'course' | 'module' | 'lab' | 'project'): boolean {
    const code = value.trim().toUpperCase();
    
    switch (pattern) {
      case 'course':
        return /^[A-Z]{2,4}\d{3,4}$/.test(code);
      case 'module':
        return /^[A-Z]{2,4}\d{3,4}[A-Z]\d+$/.test(code);
      case 'lab':
        return /LAB/i.test(code);
      case 'project':
        return /PROJ/i.test(code);
      default:
        return false;
    }
  }

  /**
   * Generate code suggestions based on existing codes
   */
  public static generateSuggestions(existingCodes: ResourceCode[], subject: string): string[] {
    const subjectCodes = existingCodes.filter(code => code.getSubjectCode() === subject.toUpperCase());
    const suggestions: string[] = [];

    if (subjectCodes.length === 0) {
      // First code for this subject
      suggestions.push(`${subject.toUpperCase()}101`);
      suggestions.push(`${subject.toUpperCase()}001`);
    } else {
      // Find the highest number and suggest next
      const numbers = subjectCodes
        .map(code => code.numericSuffix)
        .filter(suffix => suffix !== null)
        .map(suffix => parseInt(suffix!, 10))
        .sort((a, b) => b - a);

      if (numbers.length > 0) {
        const nextNumber = numbers[0] + 1;
        suggestions.push(`${subject.toUpperCase()}${nextNumber.toString().padStart(3, '0')}`);
      }
    }

    return suggestions;
  }

  /**
   * Equality check
   */
  public equals(other: ResourceCode): boolean {
    return this._value === other._value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this._value;
  }

  /**
   * JSON serialization
   */
  public toJSON(): string {
    return this._value;
  }
}
