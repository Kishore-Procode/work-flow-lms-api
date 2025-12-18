/**
 * OpenAPI/Swagger Configuration
 * 
 * This module configures comprehensive API documentation following
 * MNC enterprise standards for API documentation and developer experience.
 * 
 * Features:
 * - Complete API specification
 * - Interactive documentation
 * - Schema definitions
 * - Authentication documentation
 * - Error response documentation
 * - Example requests and responses
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import swaggerJsdoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';

/**
 * OpenAPI specification configuration
 */
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Student-ACT LMS API',
    version: '1.0.0',
    description: `
# Student-ACT LMS API

A comprehensive REST API for managing the Student-ACT LMS initiative at R.M.K Engineering College.

## Features

- **User Management**: Complete user lifecycle management with role-based access control
- **Invitation System**: Secure invitation-based user onboarding
- **resource Management**: Track and monitor resource assignments and growth
- **College & Department Management**: Hierarchical organization management
- **File Upload**: Secure image upload and management
- **Authentication**: JWT-based authentication with refresh tokens
- **Rate Limiting**: Built-in rate limiting for API protection
- **Comprehensive Logging**: Structured logging for monitoring and debugging

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Error Handling

All API responses follow a consistent format:

**Success Response:**
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid",
    "path": "/api/endpoint"
  }
}
\`\`\`

## Rate Limiting

API endpoints are rate limited to ensure fair usage:
- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **File upload endpoints**: 10 requests per minute

## Pagination

List endpoints support pagination with the following query parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`search\`: Search query
- \`sortBy\`: Sort field
- \`sortOrder\`: Sort direction (asc/desc)
    `,
    contact: {
      name: 'R.M.K Engineering College',
      email: 'support@rmkec.ac.in',
      url: 'https://rmkec.ac.in',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint',
      },
    },
    schemas: {
      // Common schemas
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            type: 'object',
            description: 'Response data payload',
          },
          message: {
            type: 'string',
            description: 'Human readable message',
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
              totalPages: { type: 'number' },
            },
          },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            enum: [false],
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code for programmatic handling',
              },
              message: {
                type: 'string',
                description: 'Human readable error message',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
              requestId: {
                type: 'string',
                format: 'uuid',
              },
              path: {
                type: 'string',
              },
            },
            required: ['code', 'message', 'timestamp'],
          },
        },
        required: ['success', 'error'],
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          phone: {
            type: 'string',
            description: 'User phone number',
            nullable: true,
          },
          role: {
            type: 'string',
            enum: ['admin', 'principal', 'hod', 'staff', 'student'],
            description: 'User role in the system',
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending', 'suspended'],
            description: 'User account status',
          },
          collegeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          departmentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          rollNumber: {
            type: 'string',
            nullable: true,
          },
          year: {
            type: 'number',
            nullable: true,
          },
          section: {
            type: 'string',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'email', 'name', 'role', 'status', 'createdAt', 'updatedAt'],
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
          },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 128,
            description: 'Must contain at least one uppercase, lowercase, number, and special character',
          },
          phone: {
            type: 'string',
            nullable: true,
          },
          role: {
            type: 'string',
            enum: ['admin', 'principal', 'hod', 'staff', 'student'],
          },
          collegeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          departmentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          rollNumber: {
            type: 'string',
            nullable: true,
          },
          year: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            nullable: true,
          },
          section: {
            type: 'string',
            nullable: true,
          },
        },
        required: ['email', 'name', 'password', 'role'],
      },
      // Authentication schemas
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
          },
        },
        required: ['email', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User',
          },
          token: {
            type: 'string',
            description: 'JWT access token',
          },
        },
        required: ['user', 'token'],
      },
      // Invitation schemas
      Invitation: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          role: {
            type: 'string',
            enum: ['admin', 'principal', 'hod', 'staff', 'student'],
          },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'rejected', 'expired'],
          },
          sentBy: {
            type: 'string',
            format: 'uuid',
          },
          collegeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          departmentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          invitationToken: {
            type: 'string',
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'email', 'role', 'status', 'sentBy', 'invitationToken', 'sentAt', 'expiresAt', 'createdAt', 'updatedAt'],
      },
      CreateInvitationRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          role: {
            type: 'string',
            enum: ['admin', 'principal', 'hod', 'staff', 'student'],
          },
          college_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
          department_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
          },
        },
        required: ['email', 'role'],
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                timestamp: '2024-01-01T00:00:00.000Z',
                requestId: 'uuid',
                path: '/api/endpoint',
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: {
                  fields: {
                    email: ['Invalid email format'],
                    password: ['Password is required'],
                  },
                },
                timestamp: '2024-01-01T00:00:00.000Z',
                requestId: 'uuid',
                path: '/api/endpoint',
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Invitations',
      description: 'Invitation management system',
    },
    {
      name: 'Colleges',
      description: 'College management operations',
    },
    {
      name: 'Departments',
      description: 'Department management operations',
    },
    {
      name: 'resources',
      description: 'resource management and monitoring',
    },
    {
      name: 'System',
      description: 'System health and monitoring',
    },
  ],
};

/**
 * Swagger JSDoc options
 */
const swaggerOptions: Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/modules/*/routes/*.ts',
    './src/middleware/*.ts',
  ],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Student-ACT LMS API Documentation',
};

export default swaggerSpec;
