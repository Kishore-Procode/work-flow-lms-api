/**
 * API Response DTO
 * 
 * Standardized API response format for the Student-ACT LMS system.
 * Maintains consistency with existing API contracts.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

export class ApiResponse<T = any> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;
  public readonly error?: {
    code?: string;
    details?: any;
  };
  public readonly pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  constructor(data: {
    success: boolean;
    message: string;
    data?: T;
    error?: {
      code?: string;
      details?: any;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }) {
    this.success = data.success;
    this.message = data.message;
    this.data = data.data;
    this.error = data.error;
    this.pagination = data.pagination;
  }

  /**
   * Create a successful response
   */
  public static success<T>(
    message: string,
    data?: T,
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): ApiResponse<T> {
    return new ApiResponse({
      success: true,
      message,
      data,
      pagination,
    });
  }

  /**
   * Create an error response
   */
  public static error(
    message: string,
    details?: any,
    code?: string
  ): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code,
        details,
      },
    });
  }

  /**
   * Create a bad request response
   */
  public static badRequest(message: string, details?: any): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'BAD_REQUEST',
        details,
      },
    });
  }

  /**
   * Create a validation error response
   */
  public static validationError(
    message: string,
    validationErrors: string[]
  ): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'VALIDATION_ERROR',
        details: validationErrors,
      },
    });
  }

  /**
   * Create an unauthorized response
   */
  public static unauthorized(message: string = 'Unauthorized'): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  }

  /**
   * Create a forbidden response
   */
  public static forbidden(message: string = 'Forbidden'): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'FORBIDDEN',
      },
    });
  }

  /**
   * Create a not found response
   */
  public static notFound(message: string = 'Resource not found'): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'NOT_FOUND',
      },
    });
  }

  /**
   * Create a conflict response
   */
  public static conflict(message: string): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'CONFLICT',
      },
    });
  }

  /**
   * Create an internal server error response
   */
  public static internalServerError(
    message: string = 'Internal server error'
  ): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }

  /**
   * Convert to plain object for JSON serialization
   */
  public toJSON(): object {
    const response: any = {
      success: this.success,
      message: this.message,
    };

    if (this.data !== undefined) {
      response.data = this.data;
    }

    if (this.error) {
      response.error = this.error;
    }

    if (this.pagination) {
      response.pagination = this.pagination;
    }

    return response;
  }
}
