/**
 * Domain Error
 * 
 * Base error class for domain-specific errors in the Student-ACT LMS system.
 * Used to represent business rule violations and domain-level errors.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code || 'DOMAIN_ERROR';
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  /**
   * Create a validation error
   */
  public static validation(message: string): DomainError {
    return new DomainError(message, 'VALIDATION_ERROR');
  }

  /**
   * Create a business rule violation error
   */
  public static businessRule(message: string): DomainError {
    return new DomainError(message, 'BUSINESS_RULE_VIOLATION');
  }

  /**
   * Create an authorization error
   */
  public static authorization(message: string): DomainError {
    return new DomainError(message, 'AUTHORIZATION_ERROR');
  }

  /**
   * Create an authentication error
   */
  public static authentication(message: string): DomainError {
    return new DomainError(message, 'AUTHENTICATION_ERROR');
  }

  /**
   * Create a not found error
   */
  public static notFound(resource: string): DomainError {
    return new DomainError(`${resource} not found`, 'NOT_FOUND');
  }

  /**
   * Create a conflict error
   */
  public static conflict(message: string): DomainError {
    return new DomainError(message, 'CONFLICT');
  }

  /**
   * Convert to JSON for API responses
   */
  public toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
