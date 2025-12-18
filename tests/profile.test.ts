/**
 * Profile Management Tests
 * 
 * Comprehensive test suite for profile management functionality
 * including fetching real user data, updating profiles, and password changes.
 * 
 * @author Student - ACT Team
 * @version 2.0.0
 */

import request from 'supertest';
import { app } from '../src/app';
import { enhancedUserRepository } from '../src/modules/user/repositories/enhanced-user.repository';
import { generateAccessToken, hashPassword } from '../src/utils/auth.utils';

describe('Profile Management', () => {
  let testUser: any;
  let authToken: string;
  let testCollege: any;
  let testDepartment: any;

  beforeAll(async () => {
    // Create test college
    const collegeQuery = `
      INSERT INTO colleges (id, name, location, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const collegeResult = await enhancedUserRepository.query(collegeQuery, [
      'test-college-id',
      'Test College',
      'Test Location',
      'active'
    ]);
    testCollege = collegeResult.rows[0];

    // Create test department
    const deptQuery = `
      INSERT INTO departments (id, name, college_id, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const deptResult = await enhancedUserRepository.query(deptQuery, [
      'test-dept-id',
      'Test Department',
      'test-college-id',
      true
    ]);
    testDepartment = deptResult.rows[0];

    // Create test user with real data
    testUser = await enhancedUserRepository.createUserEnhanced({
      name: 'John Doe',
      email: 'john.doe@test.com',
      passwordHash: await hashPassword('TestPassword123!'),
      role: 'student',
      status: 'active',
      phone: '+1234567890',
      collegeId: 'test-college-id',
      departmentId: 'test-dept-id',
      rollNumber: 'ST001',
      class: '2nd Year',
      semester: '4',
    }, { userId: 'system', role: 'super_admin' });

    authToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    // Cleanup
    await enhancedUserRepository.delete(testUser.id);
    await enhancedUserRepository.query('DELETE FROM departments WHERE id = $1', ['test-dept-id']);
    await enhancedUserRepository.query('DELETE FROM colleges WHERE id = $1', ['test-college-id']);
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return complete user profile with real data', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile retrieved successfully',
      });

      const profile = response.body.data;
      expect(profile).toMatchObject({
        id: testUser.id,
        name: 'John Doe',
        email: 'john.doe@test.com',
        role: 'student',
        status: 'active',
        phone: '+1234567890',
        college_id: 'test-college-id',
        department_id: 'test-dept-id',
        roll_number: 'ST001',
        class: '2nd Year',
        semester: '4',
        collegeName: 'Test College',
        departmentName: 'Test Department',
      });

      // Should not include sensitive data
      expect(profile).not.toHaveProperty('password_hash');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        code: 'AUTH_REQUIRED',
      });
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    it('should update profile with valid data', async () => {
      const updateData = {
        name: 'John Updated Doe',
        phone: '+9876543210',
        class: '3rd Year',
        semester: '5',
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
      });

      const updatedProfile = response.body.data;
      expect(updatedProfile).toMatchObject({
        name: 'John Updated Doe',
        phone: '+9876543210',
        class: '3rd Year',
        semester: '5',
      });
    });

    it('should validate name length', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'A' }) // Too short
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'INVALID_NAME',
      });
    });

    it('should validate phone format', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: 'invalid-phone' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'INVALID_PHONE',
      });
    });

    it('should validate semester range', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ semester: '9' }) // Invalid semester
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password with valid data', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully',
      });

      // Verify password was actually changed by trying to login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'INVALID_CURRENT_PASSWORD',
      });
    });

    it('should reject mismatched passwords', async () => {
      const passwordData = {
        currentPassword: 'NewPassword123!',
        newPassword: 'AnotherPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'PASSWORD_MISMATCH',
      });
    });

    it('should reject weak passwords', async () => {
      const passwordData = {
        currentPassword: 'NewPassword123!',
        newPassword: 'weak',
        confirmPassword: 'weak',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'PASSWORD_TOO_SHORT',
      });
    });

    it('should require password complexity', async () => {
      const passwordData = {
        currentPassword: 'NewPassword123!',
        newPassword: 'simplepassword',
        confirmPassword: 'simplepassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        code: 'PASSWORD_TOO_WEAK',
      });
    });
  });

  describe('Profile Data Integrity', () => {
    it('should maintain data consistency across updates', async () => {
      // Get initial profile
      const initialResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialProfile = initialResponse.body.data;

      // Update profile
      const updateData = { name: 'Consistency Test User' };
      await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Get updated profile
      const updatedResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedProfile = updatedResponse.body.data;

      // Verify only name changed, other data remained consistent
      expect(updatedProfile.name).toBe('Consistency Test User');
      expect(updatedProfile.email).toBe(initialProfile.email);
      expect(updatedProfile.role).toBe(initialProfile.role);
      expect(updatedProfile.college_id).toBe(initialProfile.college_id);
      expect(updatedProfile.department_id).toBe(initialProfile.department_id);
    });

    it('should include related entity names', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profile = response.body.data;

      // Should include college and department names
      expect(profile.collegeName).toBe('Test College');
      expect(profile.departmentName).toBe('Test Department');
    });
  });
});
