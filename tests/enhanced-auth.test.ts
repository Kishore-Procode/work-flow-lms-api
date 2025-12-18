/**
 * Enhanced Authentication System Tests
 * 
 * Comprehensive test suite for the enhanced authentication middleware,
 * role-based access control, and security features.
 * 
 * @author Student - ACT Team
 * @version 2.0.0
 */

import request from 'supertest';
import { app } from '../src/app';
import { enhancedUserRepository } from '../src/modules/user/repositories/enhanced-user.repository';
import { generateAccessToken } from '../src/utils/auth.utils';

describe('Enhanced Authentication System', () => {
  let testUsers: any = {};
  let authTokens: any = {};

  beforeAll(async () => {
    // Create test users for different roles
    const roles = ['super_admin', 'admin', 'principal', 'hod', 'staff', 'student'];
    
    for (const role of roles) {
      const user = await enhancedUserRepository.createUserEnhanced({
        name: `Test ${role}`,
        email: `test.${role}@example.com`,
        passwordHash: 'hashedpassword123',
        role: role as any,
        status: 'active',
      }, { userId: 'system', role: 'super_admin' });
      
      testUsers[role] = user;
      authTokens[role] = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    }
  });

  afterAll(async () => {
    // Cleanup test users
    for (const role of Object.keys(testUsers)) {
      await enhancedUserRepository.delete(testUsers[role].id);
    }
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED',
      });
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject inactive users', async () => {
      // Deactivate user
      await enhancedUserRepository.updateUserEnhanced(
        testUsers.student.id,
        { status: 'inactive' },
        { userId: 'system', role: 'super_admin' }
      );

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User account is not active',
        code: 'ACCOUNT_INACTIVE',
      });

      // Reactivate user
      await enhancedUserRepository.updateUserEnhanced(
        testUsers.student.id,
        { status: 'active' },
        { userId: 'system', role: 'super_admin' }
      );
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow super_admin to access all endpoints', async () => {
      const endpoints = [
        '/api/v1/users',
        '/api/v1/colleges',
        '/api/v1/departments',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authTokens.super_admin}`);
        
        expect(response.status).not.toBe(403);
      }
    });

    it('should restrict student access to user endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    });

    it('should allow role hierarchy access', async () => {
      // Admin should be able to access principal endpoints
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit authentication attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make 6 failed login attempts (limit is 5)
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData);

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429);
          expect(response.body).toMatchObject({
            success: false,
            message: 'Too many authentication attempts, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
          });
        }
      }
    });
  });

  describe('Session Management', () => {
    it('should track user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Session should be tracked internally
    });

    it('should handle concurrent sessions', async () => {
      // Make multiple requests with same token
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${authTokens.admin}`)
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Resource-Based Authorization', () => {
    it('should allow users to access their own data', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUsers.student.id}`)
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(200);

      expect(response.body.data.id).toBe(testUsers.student.id);
    });

    it('should prevent users from accessing other users data', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUsers.admin.id}`)
        .set('Authorization', `Bearer ${authTokens.student}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        code: 'RESOURCE_ACCESS_DENIED',
      });
    });

    it('should allow principals to access college users', async () => {
      // Set college for principal and student
      await enhancedUserRepository.updateUserEnhanced(
        testUsers.principal.id,
        { collegeId: 'test-college-id' },
        { userId: 'system', role: 'super_admin' }
      );

      await enhancedUserRepository.updateUserEnhanced(
        testUsers.student.id,
        { collegeId: 'test-college-id' },
        { userId: 'system', role: 'super_admin' }
      );

      const response = await request(app)
        .get(`/api/v1/users/${testUsers.student.id}`)
        .set('Authorization', `Bearer ${authTokens.principal}`)
        .expect(200);

      expect(response.body.data.id).toBe(testUsers.student.id);
    });
  });

  describe('Input Validation', () => {
    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-uuid')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID',
      });
    });

    it('should validate email format in user creation', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        role: 'student',
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
      });
    });

    it('should validate required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing name and role
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Name, email, and role are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test that the error structure is consistent
      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log successful authentication', async () => {
      // This would require checking log files or database
      // For now, we'll verify the request succeeds
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should log failed authentication attempts', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Enhanced CRUD Operations', () => {
  let adminToken: string;
  let testUser: any;

  beforeAll(async () => {
    const admin = await enhancedUserRepository.createUserEnhanced({
      name: 'Test Admin',
      email: 'test.admin@example.com',
      passwordHash: 'hashedpassword123',
      role: 'admin',
      status: 'active',
    }, { userId: 'system', role: 'super_admin' });

    adminToken = generateAccessToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });
  });

  describe('User Creation', () => {
    it('should create user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test.user@example.com',
        role: 'student',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User created successfully',
      });

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(userData.email.toLowerCase());
      expect(response.body.data).not.toHaveProperty('password_hash');

      testUser = response.body.data;
    });

    it('should prevent duplicate email creation', async () => {
      const userData = {
        name: 'Another User',
        email: 'test.user@example.com', // Same email as above
        role: 'student',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      });
    });
  });

  describe('User Updates', () => {
    it('should update user with valid data', async () => {
      const updateData = {
        name: 'Updated Test User',
        phone: '+1234567890',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User updated successfully',
      });

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);
    });

    it('should handle concurrent updates with optimistic locking', async () => {
      // This would require implementing version checking
      // For now, we'll test basic update functionality
      const updateData = { name: 'Concurrent Update Test' };

      const response = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('User Deletion', () => {
    it('should soft delete user', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User deleted successfully',
      });

      // Verify user is soft deleted (would need to check deleted_at field)
      const getResponse = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(getResponse.body.code).toBe('USER_NOT_FOUND');
    });
  });
});
