import { User, LoginRequest, LoginResponse, AuthTokenPayload } from '../../../types';

export interface AuthUser extends Omit<User, 'password_hash'> {
  // User without password hash for safe responses
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: string;
  collegeId?: string;
  departmentId?: string;
  loginTime: Date;
  lastActivity: Date;
}

export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  userId: string;
  token: string;
}

export class AuthModel {
  /**
   * Create safe user object without password
   */
  static createSafeUser(user: User): AuthUser {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Create token payload from user
   */
  static createTokenPayload(user: User): AuthTokenPayload {
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      collegeId: user.college_id,
      departmentId: user.department_id,
    };
  }

  /**
   * Create login response
   */
  static createLoginResponse(user: User, tokens: TokenPair): LoginResponse {
    return {
      user: this.createSafeUser(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Validate login request
   */
  static validateLoginRequest(data: any): data is LoginRequest {
    return (
      typeof data === 'object' &&
      typeof data.email === 'string' &&
      typeof data.password === 'string' &&
      data.email.length > 0 &&
      data.password.length > 0
    );
  }

  /**
   * Create auth session
   */
  static createAuthSession(user: User): AuthSession {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: user.college_id,
      departmentId: user.department_id,
      loginTime: new Date(),
      lastActivity: new Date(),
    };
  }
}
