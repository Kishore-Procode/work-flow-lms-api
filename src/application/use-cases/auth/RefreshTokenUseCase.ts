/**
 * Refresh Token Use Case
 * 
 * Application service that handles JWT token refresh.
 * Validates refresh tokens and issues new access tokens.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ITokenService } from '../../interfaces/ITokenService';
import { User } from '../../../domain/entities/User';
import { DomainError } from '../../../domain/errors/DomainError';

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    collegeId?: string;
    departmentId?: string;
  };
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  /**
   * Execute the refresh token use case
   */
  public async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    // Validate request
    if (!request.refreshToken?.trim()) {
      throw DomainError.validation('Refresh token is required');
    }

    // Verify refresh token
    let tokenPayload;
    try {
      tokenPayload = await this.tokenService.verifyRefreshToken(request.refreshToken);
    } catch (error) {
      throw DomainError.authentication('Invalid or expired refresh token');
    }

    // Get user from token payload
    const user = await this.userRepository.findById(tokenPayload.userId);
    if (!user) {
      throw DomainError.authentication('User not found');
    }

    // Check if user is still active
    if (!user.status.canLogin()) {
      throw DomainError.authentication('User account is not active');
    }

    // Generate new tokens
    const newAccessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role.value,
      collegeId: user.collegeId,
      departmentId: user.departmentId,
    });

    const newRefreshToken = await this.tokenService.generateRefreshToken({
      userId: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role.value,
      collegeId: user.collegeId,
      departmentId: user.departmentId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        role: user.role.value,
        status: user.status.value,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
      },
    };
  }
}
