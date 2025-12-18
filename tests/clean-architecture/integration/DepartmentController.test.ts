/**
 * Department Controller Integration Tests (Clean Architecture)
 * 
 * Integration tests for the Clean Architecture Department endpoints.
 * Tests the complete flow from HTTP request to database and back.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import request from 'supertest';
import { Application } from 'express';
import { ExpressAppFactory } from '../../../src/infrastructure/web/ExpressAppFactory';
import { DIContainer } from '../../../src/infrastructure/container/DIContainer';
import { getTestDb, cleanupTestDb, seedTestData, createTestToken, generateTestData } from '../../setup';
import { Pool } from 'pg';

describe('Department Controller Integration Tests (Clean Architecture)', () => {
  let app: Application;
  let testDbPool: Pool;
  let adminToken: string;
  let principalToken: string;
  let studentToken: string;
  let testCollegeId: string;
  let testCourseId: string;

  beforeAll(async () => {
    // Setup test database
    testDbPool = await getTestDb();
    await cleanupTestDb();
    await seedTestData();

    // Initialize DIContainer with test database
    DIContainer.initialize({
      database: { pool: testDbPool },
      jwt: {
        secret: process.env.JWT_SECRET || 'test-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        expiresIn: '1h',
        refreshExpiresIn: '7d',
      },
    });

    // Create Express app with Clean Architecture only
    app = ExpressAppFactory.createCleanArchitectureOnly();

    // Create test tokens
    adminToken = createTestToken({
      id: 'test-admin-id',
      email: 'admin@test.com',
      role: 'admin',
      collegeId: 'test-college-id',
    });

    principalToken = createTestToken({
      id: 'test-principal-id',
      email: 'principal@test.com',
      role: 'principal',
      collegeId: 'test-college-id',
    });

    studentToken = createTestToken({
      id: 'test-student-id',
      email: 'student@test.com',
      role: 'student',
      collegeId: 'test-college-id',
    });

    // Set test IDs
    testCollegeId = 'test-college-id';
    testCourseId = 'test-course-id';
  });

  afterAll(async () => {
    await cleanupTestDb();
    if (testDbPool) {
      await testDbPool.end();
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    await testDbPool.query('DELETE FROM departments WHERE code LIKE $1', ['TEST%']);
  });

  describe('POST /api/v1/departments-ca', () => {
    const validDepartmentData = {
      name: 'Test Computer Science',
      code: 'TESTCSE',
      collegeId: 'test-college-id',
      courseId: 'test-course-id',
    };

    it('should create department successfully with admin token', async () => {
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDepartmentData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Department created successfully',
        data: expect.objectContaining({
          id: expect.any(String),
          name: 'Test Computer Science',
          code: 'TESTCSE',
          collegeId: 'test-college-id',
          courseId: 'test-course-id',
          isActive: true,
          isCustom: false,
          studentCount: 0,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });

      // Verify department was saved to database
      const dbResult = await testDbPool.query(
        'SELECT * FROM departments WHERE code = $1',
        ['TESTCSE']
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].name).toBe('Test Computer Science');
    });

    it('should create department successfully with principal token', async () => {
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          ...validDepartmentData,
          code: 'TESTMATH',
          name: 'Test Mathematics',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TESTMATH');
      expect(response.body.data.name).toBe('Test Mathematics');
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .send(validDepartmentData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Access token required',
      });
    });

    it('should return 403 for insufficient permissions (student)', async () => {
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validDepartmentData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Insufficient permissions',
      });
    });

    it('should return 400 for invalid request data', async () => {
      const invalidData = {
        name: '', // Empty name
        code: 'TESTINVALID',
        collegeId: testCollegeId,
      };

      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('Department name must be at least 2 characters'),
          }),
        ]),
      });
    });

    it('should return 409 for duplicate department code', async () => {
      // Create first department
      await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDepartmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDepartmentData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Department with code TESTCSE already exists'),
      });
    });
  });

  describe('GET /api/v1/departments-ca', () => {
    beforeEach(async () => {
      // Create test departments
      await testDbPool.query(`
        INSERT INTO departments (id, name, code, college_id, course_id, is_active, is_custom, student_count, created_at, updated_at)
        VALUES 
          ('dept-1', 'Computer Science', 'CSE', $1, $2, true, false, 50, NOW(), NOW()),
          ('dept-2', 'Mathematics', 'MATH', $1, $2, true, false, 30, NOW(), NOW()),
          ('dept-3', 'Physics', 'PHY', $1, $2, false, true, 0, NOW(), NOW())
      `, [testCollegeId, testCourseId]);
    });

    it('should get departments with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Departments retrieved successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            code: expect.any(String),
            collegeId: testCollegeId,
            isActive: expect.any(Boolean),
          }),
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should filter departments by search term', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Computer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Computer Science');
    });

    it('should filter departments by college ID', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ collegeId: testCollegeId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((dept: any) => {
        expect(dept.collegeId).toBe(testCollegeId);
      });
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Access token required',
      });
    });
  });

  describe('GET /api/v1/departments-ca/:departmentId', () => {
    let testDepartmentId: string;

    beforeEach(async () => {
      // Create test department
      const result = await testDbPool.query(`
        INSERT INTO departments (id, name, code, college_id, course_id, is_active, is_custom, student_count, created_at, updated_at)
        VALUES ('test-dept-detail', 'Test Department Detail', 'TESTDETAIL', $1, $2, true, false, 25, NOW(), NOW())
        RETURNING id
      `, [testCollegeId, testCourseId]);
      
      testDepartmentId = result.rows[0].id;
    });

    it('should get department by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/departments-ca/${testDepartmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Department retrieved successfully',
        data: {
          id: testDepartmentId,
          name: 'Test Department Detail',
          code: 'TESTDETAIL',
          collegeId: testCollegeId,
          courseId: testCourseId,
          isActive: true,
          isCustom: false,
          studentCount: 25,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Department not found',
      });
    });

    it('should return 400 for invalid department ID format', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'departmentId',
            message: expect.stringContaining('Department ID must be a valid UUID'),
          }),
        ]),
      });
    });
  });

  describe('GET /api/v1/departments-ca/public', () => {
    beforeEach(async () => {
      // Create test departments for public access
      await testDbPool.query(`
        INSERT INTO departments (id, name, code, college_id, course_id, is_active, is_custom, student_count, created_at, updated_at)
        VALUES 
          ('pub-dept-1', 'Public Computer Science', 'PUBCSE', $1, $2, true, false, 100, NOW(), NOW()),
          ('pub-dept-2', 'Public Mathematics', 'PUBMATH', $1, $2, true, false, 75, NOW(), NOW())
      `, [testCollegeId, testCourseId]);
    });

    it('should get public departments without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca/public')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Departments retrieved successfully',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            code: expect.any(String),
            collegeId: expect.any(String),
            isActive: true, // Only active departments should be returned
          }),
        ]),
      });

      // Verify all returned departments are active
      response.body.data.forEach((dept: any) => {
        expect(dept.isActive).toBe(true);
      });
    });

    it('should support pagination for public departments', async () => {
      const response = await request(app)
        .get('/api/v1/departments-ca/public')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close the database connection to simulate error
      await testDbPool.end();

      const response = await request(app)
        .get('/api/v1/departments-ca/public')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Internal server error'),
      });

      // Reconnect for cleanup
      testDbPool = await getTestDb();
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/departments-ca')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid JSON'),
      });
    });
  });
});
