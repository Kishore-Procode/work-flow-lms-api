/**
 * Auth Controller (Interface Adapter)
 * 
 * HTTP controller that adapts web requests to use cases.
 * Maintains identical API contracts while using Clean Architecture.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
// import { GetUserProfileUseCase } from '../../application/use-cases/auth/GetUserProfileUseCase';
import { LoginUserRequest } from '../../application/dtos/auth/LoginUserRequest';
// import { RefreshTokenRequest } from '../../application/dtos/auth/RefreshTokenRequest';
// import { GetUserProfileRequest } from '../../application/dtos/auth/GetUserProfileRequest';
import { DomainError } from '../../domain/errors/DomainError';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';

export class AuthController {
  constructor(
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    // private readonly getUserProfileUseCase: GetUserProfileUseCase
  ) {}

  /**
   * User login endpoint
   * POST /api/v1/auth/login
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Convert HTTP request to use case request
      const loginRequest = LoginUserRequest.fromPlainObject({
        email: req.body.email,
        password: req.body.password,
        selectedRole: req.body.selectedRole,
        allowedRoles: req.body.allowedRoles,
      });

      // Validate request
      const validationErrors = loginRequest.validate();
      if (validationErrors.length > 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.error('Validation failed', validationErrors)
        );
        return;
      }

      // Execute use case
      const result = await this.loginUserUseCase.execute(loginRequest);

      // Return response (maintaining current API format)
      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Login successful',
        data: result.toPlainObject(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // /**
  //  * Refresh token endpoint
  //  * POST /api/v1/auth/refresh
  //  */
  // public refreshToken = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const refreshRequest = RefreshTokenRequest.fromPlainObject({
  //       refreshToken: req.body.refreshToken,
  //     });

  //     const validationErrors = refreshRequest.validate();
  //     if (validationErrors.length > 0) {
  //       res.status(HttpStatusCode.BAD_REQUEST).json(
  //         ApiResponse.error('Validation failed', validationErrors)
  //       );
  //       return;
  //     }

  //     const result = await this.refreshTokenUseCase.execute(refreshRequest);

  //     res.status(HttpStatusCode.OK).json({
  //       success: true,
  //       message: 'Token refreshed successfully',
  //       data: result.toPlainObject(),
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  // /**
  //  * Get user profile endpoint
  //  * GET /api/v1/auth/profile
  //  */
  // public getProfile = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     if (!req.user) {
  //       res.status(HttpStatusCode.UNAUTHORIZED).json(
  //         ApiResponse.error('Authentication required')
  //       );
  //       return;
  //     }

  //     const profileRequest = GetUserProfileRequest.fromAuthenticatedUser(req.user);
  //     const result = await this.getUserProfileUseCase.execute(profileRequest);

  //     res.status(HttpStatusCode.OK).json({
  //       success: true,
  //       message: 'Profile retrieved successfully',
  //       data: result.toPlainObject(),
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  // /**
  //  * Check authentication status endpoint
  //  * GET /api/v1/auth/check
  //  */
  // public checkAuth = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     if (!req.user) {
  //       res.status(HttpStatusCode.UNAUTHORIZED).json({
  //         success: false,
  //         message: 'Not authenticated',
  //       });
  //       return;
  //     }

  //     const profileRequest = GetUserProfileRequest.fromAuthenticatedUser(req.user);
  //     const profile = await this.getUserProfileUseCase.execute(profileRequest);

  //     res.status(HttpStatusCode.OK).json({
  //       success: true,
  //       message: 'Authenticated',
  //       data: {
  //         user: profile.toPlainObject(),
  //         permissions: {
  //           role: req.user.role,
  //           collegeId: req.user.collegeId,
  //           departmentId: req.user.departmentId,
  //         },
  //       },
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  /**
   * Handle errors and convert to appropriate HTTP responses
   */
  private handleError(error: unknown, res: Response): void {
    console.error('Auth Controller Error:', error);

    if (error instanceof DomainError) {
      const statusCode = this.getStatusCodeForDomainError(error);
      const message = error.message;

      // Maintain current error response format for compatibility
      if (this.isAuthenticationError(error)) {
        res.status(statusCode).json({
          success: false,
          message,
        });
      } else {
        res.status(statusCode).json(
          ApiResponse.error(message, undefined, error.code)
        );
      }
      return;
    }

    // Generic error handling
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }

  /**
   * Map domain errors to HTTP status codes
   */
  private getStatusCodeForDomainError(error: DomainError): number {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return HttpStatusCode.BAD_REQUEST;
      case 'AUTHORIZATION_ERROR':
        return HttpStatusCode.UNAUTHORIZED;
      case 'NOT_FOUND':
        return HttpStatusCode.NOT_FOUND;
      case 'CONFLICT':
        return HttpStatusCode.CONFLICT;
      default:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Check if error is authentication-related (for response format compatibility)
   */
  private isAuthenticationError(error: DomainError): boolean {
    const authMessages = [
      'No account found',
      'Incorrect password',
      'Invalid email',
      'pending',
      'suspended',
      'inactive',
      'not active',
      'cannot access',
      'Access denied',
      'restricted to',
    ];

    return authMessages.some(msg => error.message.includes(msg));
  }
}
