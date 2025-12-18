/**
 * JWT Token Service Implementation
 * 
 * Infrastructure implementation of ITokenService using jsonwebtoken.
 * Handles JWT token generation and verification operations.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import * as jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../application/interfaces/ITokenService';

export interface JWTTokenServiceConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export class JWTTokenService implements ITokenService {
  constructor(private readonly config: JWTTokenServiceConfig) {}

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    try {
      return jwt.sign(payload as any, this.config.secret, {
        expiresIn: this.config.expiresIn as string | number,
        issuer: 'student-act-lms',
        audience: 'student-act-lms-users',
      } as jwt.SignOptions);
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    try {
      return jwt.sign(payload as any, this.config.refreshSecret, {
        expiresIn: this.config.refreshExpiresIn as string | number,
        issuer: 'student-act-lms',
        audience: 'student-act-lms-users',
      } as jwt.SignOptions);
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: 'student-act-lms',
        audience: 'student-act-lms-users',
      }) as TokenPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        console.error('Error verifying access token:', error);
        throw new Error('Failed to verify token');
      }
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.config.refreshSecret, {
        issuer: 'student-act-lms',
        audience: 'student-act-lms-users',
      }) as TokenPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        console.error('Error verifying refresh token:', error);
        throw new Error('Failed to verify refresh token');
      }
    }
  }

  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    
    return expiration.getTime() < Date.now();
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify the refresh token
      const payload = await this.verifyRefreshToken(refreshToken);
      
      // Generate new tokens
      const newAccessToken = await this.generateAccessToken(payload);
      const newRefreshToken = await this.generateRefreshToken(payload);
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw error; // Re-throw the error from verifyRefreshToken
    }
  }
}
