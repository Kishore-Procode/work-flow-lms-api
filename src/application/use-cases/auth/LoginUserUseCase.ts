/**
 * Login User Use Case
 * 
 * Application layer use case for user authentication.
 * Orchestrates domain entities and external services for login functionality.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordService } from '../../interfaces/IPasswordService';
import { ITokenService } from '../../interfaces/ITokenService';
import { Email } from '../../../domain/value-objects/Email';
import { UserRole } from '../../../domain/value-objects/UserRole';
import { User } from '../../../domain/entities/User';
import { DomainError } from '../../../domain/errors/DomainError';
import { LoginUserRequest } from '../../dtos/auth/LoginUserRequest';
import { LoginUserResponse } from '../../dtos/auth/LoginUserResponse';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService
  ) {}

  async execute(request: LoginUserRequest): Promise<LoginUserResponse> {
    // Validate input
    this.validateRequest(request);

    // Find user by email
    const email = Email.create(request.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw DomainError.authorization('No account found with this email address');
    }

    // Check if user is active
    if (!user.isActive()) {
      throw DomainError.authorization(`Account is ${user.status.value}. Please contact administrator.`);
    }

    // Verify password
    if (!user.hasPasswordHash()) {
      throw DomainError.authorization('Account setup is incomplete. Please contact administrator.');
    }

    const isPasswordValid = await this.passwordService.compare(
      request.password,
      user.toPersistence().password_hash
    );

    if (!isPasswordValid) {
      throw DomainError.authorization('Incorrect password');
    }

    // Validate selected role
    if (request.selectedRole) {
      const selectedRole = UserRole.create(request.selectedRole);
      if (!selectedRole.equals(user.role)) {
        throw DomainError.authorization('Selected role does not match user role');
      }
    }

    // Check role restrictions if allowedRoles provided
    if (request.allowedRoles && request.allowedRoles.length > 0) {
      const userRoleValue = user.role.value;
      if (!request.allowedRoles.includes(userRoleValue)) {
        throw DomainError.authorization(`Access denied. This login is restricted to: ${request.allowedRoles.join(', ')}`);
      }
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email.value,
      name: user.name,
      role: user.role.value,
      collegeId: user.collegeId,
      departmentId: user.departmentId,
    };

    const accessToken = await this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = await this.tokenService.generateRefreshToken(tokenPayload);

    // Return response
    return new LoginUserResponse({
      user: this.mapUserToResponse(user),
      token: accessToken,
      refreshToken: refreshToken,
    });
  }

  private validateRequest(request: LoginUserRequest): void {
    if (!request.email) {
      throw DomainError.validation('Email is required');
    }

    if (!request.password) {
      throw DomainError.validation('Password is required');
    }

    if (request.password.length < 6) {
      throw DomainError.validation('Password must be at least 6 characters');
    }
  }

  private mapUserToResponse(user: User): any {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
      phone: user.phone,
      role: user.role.value,
      status: user.status.value,
      collegeId: user.collegeId,
      departmentId: user.departmentId,
      rollNumber: user.rollNumber,
      year: user.year,
      section: user.section,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
