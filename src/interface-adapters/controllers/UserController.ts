/**
 * User Controller (Interface Adapter)
 * 
 * HTTP controller that adapts web requests to user-related use cases.
 * Maintains identical API contracts while using Clean Architecture.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { GetUsersUseCase } from '../../application/use-cases/user/GetUsersUseCase';
import { GetUserByIdUseCase, GetUserByIdRequest } from '../../application/use-cases/user/GetUserByIdUseCase';
// import { CreateUserUseCase } from '../../application/use-cases/user/CreateUserUseCase';
// import { UpdateUserUseCase } from '../../application/use-cases/user/UpdateUserUseCase';
// import { DeleteUserUseCase } from '../../application/use-cases/user/DeleteUserUseCase';
import { GetUsersRequest } from '../../application/dtos/user/GetUsersRequest';
// import { GetUserByIdRequest } from '../../application/dtos/user/GetUserByIdRequest';
// import { CreateUserRequest } from '../../application/dtos/user/CreateUserRequest';
// import { UpdateUserRequest } from '../../application/dtos/user/UpdateUserRequest';
// import { DeleteUserRequest } from '../../application/dtos/user/DeleteUserRequest';
import { DomainError } from '../../domain/errors/DomainError';
import { HttpStatusCode } from '../constants/HttpStatusCode';
import { ApiResponse } from '../dtos/ApiResponse';

export class UserController {
  constructor(
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    // private readonly createUserUseCase: CreateUserUseCase,
    // private readonly updateUserUseCase: UpdateUserUseCase,
    // private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  /**
   * Get users with filters and pagination
   * GET /api/v1/users
   */
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.error('Authentication required')
        );
        return;
      }

      // Convert HTTP request to use case request
      const getUsersRequest = GetUsersRequest.fromHttpRequest(req.query, {
        id: req.user.userId,
        role: req.user.role,
        collegeId: req.user.collegeId,
        departmentId: req.user.departmentId,
      });

      // Validate request
      const validationErrors = getUsersRequest.validate();
      if (validationErrors.length > 0) {
        res.status(HttpStatusCode.BAD_REQUEST).json(
          ApiResponse.error('Validation failed', validationErrors)
        );
        return;
      }

      // Execute use case
      const result = await this.getUsersUseCase.execute(getUsersRequest);

      // Return response (maintaining current API format)
      res.status(HttpStatusCode.OK).json(result.toApiResponse());
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json(
          ApiResponse.error('Authentication required')
        );
        return;
      }

      const getUserRequest: GetUserByIdRequest = {
        userId: req.params.id,
        requestingUser: {
          id: req.user.userId,
          role: req.user.role,
          collegeId: req.user.collegeId,
          departmentId: req.user.departmentId,
        },
      };

      const result = await this.getUserByIdUseCase.execute(getUserRequest);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'User retrieved successfully',
        data: result.user,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Create new user
   * POST /api/v1/users
   */
  // public createUser = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     if (!req.user) {
  //       res.status(HttpStatusCode.UNAUTHORIZED).json(
  //         ApiResponse.error('Authentication required')
  //       );
  //       return;
  //     }

  //     const createUserRequest = CreateUserRequest.fromHttpRequest(req.body, {
  //       id: req.user.userId,
  //       role: req.user.role,
  //       collegeId: req.user.collegeId,
  //       departmentId: req.user.departmentId,
  //     });

  //     const validationErrors = createUserRequest.validate();
  //     if (validationErrors.length > 0) {
  //       res.status(HttpStatusCode.BAD_REQUEST).json(
  //         ApiResponse.error('Validation failed', validationErrors)
  //       );
  //       return;
  //     }

  //     const result = await this.createUserUseCase.execute(createUserRequest);

  //     res.status(HttpStatusCode.CREATED).json({
  //       success: true,
  //       message: 'User created successfully',
  //       data: result.toPlainObject(),
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  // public updateUser = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     if (!req.user) {
  //       res.status(HttpStatusCode.UNAUTHORIZED).json(
  //         ApiResponse.error('Authentication required')
  //       );
  //       return;
  //     }

  //     const updateUserRequest = UpdateUserRequest.fromHttpRequest(
  //       req.params.id,
  //       req.body,
  //       {
  //         id: req.user.userId,
  //         role: req.user.role,
  //         collegeId: req.user.collegeId,
  //         departmentId: req.user.departmentId,
  //       }
  //     );

  //     const validationErrors = updateUserRequest.validate();
  //     if (validationErrors.length > 0) {
  //       res.status(HttpStatusCode.BAD_REQUEST).json(
  //         ApiResponse.error('Validation failed', validationErrors)
  //       );
  //       return;
  //     }

  //     const result = await this.updateUserUseCase.execute(updateUserRequest);

  //     res.status(HttpStatusCode.OK).json({
  //       success: true,
  //       message: 'User updated successfully',
  //       data: result.toPlainObject(),
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  // public deleteUser = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     if (!req.user) {
  //       res.status(HttpStatusCode.UNAUTHORIZED).json(
  //         ApiResponse.error('Authentication required')
  //       );
  //       return;
  //     }

  //     const deleteUserRequest = DeleteUserRequest.fromHttpRequest(req.params.id, {
  //       id: req.user.userId,
  //       role: req.user.role,
  //       collegeId: req.user.collegeId,
  //       departmentId: req.user.departmentId,
  //     });

  //     const validationErrors = deleteUserRequest.validate();
  //     if (validationErrors.length > 0) {
  //       res.status(HttpStatusCode.BAD_REQUEST).json(
  //         ApiResponse.error('Validation failed', validationErrors)
  //       );
  //       return;
  //     }

  //     await this.deleteUserUseCase.execute(deleteUserRequest);

  //     res.status(HttpStatusCode.OK).json({
  //       success: true,
  //       message: 'User deleted successfully',
  //     });
  //   } catch (error) {
  //     this.handleError(error, res);
  //   }
  // };

  /**
   * Handle errors and convert to appropriate HTTP responses
   */
  private handleError(error: unknown, res: Response): void {
    console.error('User Controller Error:', error);

    if (error instanceof DomainError) {
      const statusCode = this.getStatusCodeForDomainError(error);
      res.status(statusCode).json(
        ApiResponse.error(error.message, undefined, error.code)
      );
      return;
    }

    // Generic error handling
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      ApiResponse.error('Internal server error')
    );
  }

  /**
   * Map domain errors to HTTP status codes
   */
  private getStatusCodeForDomainError(error: DomainError): number {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return HttpStatusCode.BAD_REQUEST;
      case 'AUTHORIZATION_ERROR':
        return HttpStatusCode.FORBIDDEN;
      case 'NOT_FOUND':
        return HttpStatusCode.NOT_FOUND;
      case 'CONFLICT':
        return HttpStatusCode.CONFLICT;
      default:
        return HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
  }
}
