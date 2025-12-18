/**
 * Password Service Interface
 * 
 * Application layer interface for password-related operations.
 * Defines the contract for password hashing and verification.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export interface IPasswordService {
  /**
   * Hash a plain text password
   */
  hash(password: string): Promise<string>;

  /**
   * Compare a plain text password with a hash
   */
  compare(password: string, hash: string): Promise<boolean>;

  /**
   * Generate a random password
   */
  generateRandom(length?: number): string;

  /**
   * Validate password strength
   */
  validateStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  };

  /**
   * Check if password meets minimum requirements
   */
  meetsRequirements(password: string): boolean;
}
