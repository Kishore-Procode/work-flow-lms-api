/**
 * Token Service Interface
 * 
 * Application layer interface for JWT token operations.
 * Defines the contract for token generation and verification.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  collegeId?: string;
  departmentId?: string;
}

export interface ITokenService {
  /**
   * Generate an access token
   */
  generateAccessToken(payload: TokenPayload): Promise<string>;

  /**
   * Generate a refresh token
   */
  generateRefreshToken(payload: TokenPayload): Promise<string>;

  /**
   * Verify an access token
   */
  verifyAccessToken(token: string): Promise<TokenPayload>;

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): Promise<TokenPayload>;

  /**
   * Extract token from authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null;

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null;

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean;

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
}
