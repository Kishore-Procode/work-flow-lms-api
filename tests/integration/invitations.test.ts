/**
 * Invitation API Integration Tests
 * 
 * Comprehensive integration tests for the invitation management system
 * following MNC enterprise standards for API testing.
 * 
 * @author Student - ACT Team
 * @version 1.0.0
 */

import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import {
  getTestDb,
  cleanupTestDb,
  seedTestData,
  createTestToken,
  generateTestData,
} from '../setup';

// Mock the app - in real implementation, import your Express app
const createTestApp = (): Express => {
  const express = require('express');
  const app = express();
  
  // Add basic middleware
  app.use(express.json());
  
  // Mock routes for testing
  app.post('/api/v1/invitations', (req, res) => {
    res.status(201).json({
      success: true,
      data: {
        id: 'test-invitation-id',
        email: req.body.email,
        role: req.body.role,
        status: 'pending',
        sentBy: 'test-admin',
        invitationToken: 'test-token',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  });
  
  app.get('/api/v1/invitations', (req, res) => {
    res.json({
      success: true,
      data: [
        {
          id: 'test-invitation-1',
          email: 'test1@example.com',
          role: 'student',
          status: 'pending',
          sentBy: 'test-admin',
          invitationToken: 'test-token-1',
          sentAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });
  
  return app;
};

describe('Invitation API Integration Tests', () => {
  let app: Express;
  let db: Pool;
  let adminToken: string;
  let principalToken: string;
  let studentToken: string;

  beforeAll(async () => {
    app = createTestApp();
    db = getTestDb();
    
    // Create test tokens
    adminToken = createTestToken('test-admin', 'admin');
    principalToken = createTestToken('test-principal', 'principal');
    studentToken = createTestToken('test-student', 'student');
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('POST /api/v1/invitations', () => {
    const validInvitationData = {
      email: 'newuser@example.com',
      role: 'student',
      college_id: 'test-college-1',
      department_id: 'test-dept-1',
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .send(validInvitationData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('should allow admin to create invitations', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          email: validInvitationData.email,
          role: validInvitationData.role,
          status: 'pending',
        });
      });

      it('should allow principal to create invitations', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${principalToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it('should not allow student to create invitations', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
      });
    });

    describe('Input Validation', () => {
      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details.fields).toHaveProperty('email');
        expect(response.body.error.details.fields).toHaveProperty('role');
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: 'invalid-email',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.details.fields.email).toContain('Invalid email format');
      });

      it('should validate role values', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            role: 'invalid-role',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.details.fields.role).toBeDefined();
      });

      it('should validate UUID format for college_id', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            college_id: 'invalid-uuid',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.details.fields.college_id).toBeDefined();
      });

      it('should sanitize input to prevent XSS', async () => {
        const maliciousEmail = 'test<script>alert("xss")</script>@example.com';
        
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: maliciousEmail,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // Should reject malicious input
      });
    });

    describe('Business Logic', () => {
      it('should create invitation with valid data', async () => {
        const testEmail = generateTestData.email();
        
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: testEmail,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          email: testEmail,
          role: validInvitationData.role,
          status: 'pending',
          sentBy: 'test-admin',
        });
        expect(response.body.data.invitationToken).toBeDefined();
        expect(response.body.data.expiresAt).toBeDefined();
      });

      it('should not allow duplicate invitations for same email', async () => {
        const testEmail = generateTestData.email();
        
        // Create first invitation
        await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: testEmail,
          });

        // Try to create duplicate
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validInvitationData,
            email: testEmail,
          });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('RESOURCE_CONFLICT');
      });

      it('should set correct expiration date', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        
        const expiresAt = new Date(response.body.data.expiresAt);
        const sentAt = new Date(response.body.data.sentAt);
        const daysDiff = (expiresAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
        
        expect(daysDiff).toBeCloseTo(7, 0); // Should expire in 7 days
      });
    });

    describe('Response Format', () => {
      it('should return correct response structure', async () => {
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validInvitationData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('role');
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('sentBy');
        expect(response.body.data).toHaveProperty('invitationToken');
        expect(response.body.data).toHaveProperty('sentAt');
        expect(response.body.data).toHaveProperty('expiresAt');
        expect(response.body.data).toHaveProperty('createdAt');
        expect(response.body.data).toHaveProperty('updatedAt');
      });

      it('should include request correlation ID in error responses', async () => {
        const requestId = 'test-correlation-id';
        
        const response = await request(app)
          .post('/api/v1/invitations')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Request-ID', requestId)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.requestId).toBe(requestId);
      });
    });
  });

  describe('GET /api/v1/invitations', () => {
    beforeEach(async () => {
      // Seed some test invitations
      await db.query(`
        INSERT INTO invitations (id, email, role, status, sent_by, invitation_token, sent_at, expires_at, created_at, updated_at)
        VALUES 
          ('test-inv-1', 'test1@example.com', 'student', 'pending', 'test-admin', 'token-1', NOW(), NOW() + INTERVAL '7 days', NOW(), NOW()),
          ('test-inv-2', 'test2@example.com', 'staff', 'accepted', 'test-admin', 'token-2', NOW(), NOW() + INTERVAL '7 days', NOW(), NOW()),
          ('test-inv-3', 'test3@example.com', 'student', 'expired', 'test-admin', 'token-3', NOW(), NOW() - INTERVAL '1 day', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
    });

    it('should return paginated list of invitations', async () => {
      const response = await request(app)
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toMatchObject({
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      });
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every((inv: any) => inv.status === 'pending')).toBe(true);
    });

    it('should support searching by email', async () => {
      const response = await request(app)
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'test1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.some((inv: any) => inv.email.includes('test1'))).toBe(true);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'email', sortOrder: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const emails = response.body.data.map((inv: any) => inv.email);
      const sortedEmails = [...emails].sort();
      expect(emails).toEqual(sortedEmails);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitationData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInvitationData);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
