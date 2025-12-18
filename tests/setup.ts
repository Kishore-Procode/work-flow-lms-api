/**
 * Jest Test Setup Configuration
 * 
 * This file configures the testing environment for backend API tests
 * following MNC enterprise standards for comprehensive testing.
 * 
 * @author Student - ACT Team
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { Pool } from 'pg';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external services
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

// Mock file system operations for uploads
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = {
        fieldname: 'image',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: 'uploads/test',
        filename: 'test-image-123.jpg',
        path: 'uploads/test/test-image-123.jpg',
        buffer: Buffer.from('test-image-data'),
      };
      next();
    }),
    array: jest.fn(() => (req: any, res: any, next: any) => {
      req.files = [
        {
          fieldname: 'images',
          originalname: 'test-image-1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          destination: 'uploads/test',
          filename: 'test-image-1-123.jpg',
          path: 'uploads/test/test-image-1-123.jpg',
          buffer: Buffer.from('test-image-1-data'),
        },
      ];
      next();
    }),
  }));
  
  multer.diskStorage = jest.fn();
  multer.memoryStorage = jest.fn();
  
  return multer;
});

// Global test database pool
let testDbPool: Pool | null = null;

/**
 * Get test database connection
 */
export const getTestDb = (): Pool => {
  if (!testDbPool) {
    testDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'osot_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 5, // Limit connections for tests
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 2000,
    });
  }
  return testDbPool;
};

/**
 * Clean up test database
 */
export const cleanupTestDb = async (): Promise<void> => {
  const db = getTestDb();
  
  try {
    // Disable foreign key checks temporarily
    await db.query('SET session_replication_role = replica;');
    
    // Get all table names
    const result = await db.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'information_schema'
    `);
    
    // Truncate all tables
    for (const row of result.rows) {
      await db.query(`TRUNCATE TABLE "${row.tablename}" RESTART IDENTITY CASCADE;`);
    }
    
    // Re-enable foreign key checks
    await db.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
};

/**
 * Seed test data
 */
export const seedTestData = async (): Promise<void> => {
  const db = getTestDb();
  
  try {
    // Insert test colleges
    await db.query(`
      INSERT INTO colleges (id, name, code, status, created_at, updated_at)
      VALUES 
        ('test-college-1', 'Test College 1', 'TC1', 'active', NOW(), NOW()),
        ('test-college-2', 'Test College 2', 'TC2', 'active', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    
    // Insert test departments
    await db.query(`
      INSERT INTO departments (id, name, code, college_id, status, created_at, updated_at)
      VALUES 
        ('test-dept-1', 'Test Department 1', 'TD1', 'test-college-1', 'active', NOW(), NOW()),
        ('test-dept-2', 'Test Department 2', 'TD2', 'test-college-1', 'active', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    
    // Insert test users
    await db.query(`
      INSERT INTO users (id, email, name, password, role, status, college_id, department_id, created_at, updated_at)
      VALUES 
        ('test-admin', 'admin@test.com', 'Test Admin', '$2b$10$test.hash', 'admin', 'active', NULL, NULL, NOW(), NOW()),
        ('test-principal', 'principal@test.com', 'Test Principal', '$2b$10$test.hash', 'principal', 'active', 'test-college-1', NULL, NOW(), NOW()),
        ('test-hod', 'hod@test.com', 'Test HOD', '$2b$10$test.hash', 'hod', 'active', 'test-college-1', 'test-dept-1', NOW(), NOW()),
        ('test-staff', 'staff@test.com', 'Test Staff', '$2b$10$test.hash', 'staff', 'active', 'test-college-1', 'test-dept-1', NOW(), NOW()),
        ('test-student', 'student@test.com', 'Test Student', '$2b$10$test.hash', 'student', 'active', 'test-college-1', 'test-dept-1', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
};

/**
 * Create test JWT token
 */
export const createTestToken = (userId: string, role: string = 'student'): string => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId, 
      role,
      email: `${role}@test.com`,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

/**
 * Mock request object
 */
export const createMockRequest = (overrides: any = {}): any => ({
  method: 'GET',
  url: '/test',
  originalUrl: '/test',
  path: '/test',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'test-agent',
    'x-request-id': 'test-request-id',
  },
  body: {},
  params: {},
  query: {},
  ip: '127.0.0.1',
  user: null,
  ...overrides,
});

/**
 * Mock response object
 */
export const createMockResponse = (): any => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
};

/**
 * Mock next function
 */
export const createMockNext = (): jest.Mock => jest.fn();

/**
 * Wait for async operations
 */
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random test data
 */
export const generateTestData = {
  email: (): string => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
  name: (): string => `Test User ${Math.random().toString(36).substr(2, 9)}`,
  uuid: (): string => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  phone: (): string => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
};

// Global test setup
beforeAll(async () => {
  // Ensure test database is clean
  await cleanupTestDb();
  await seedTestData();
});

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  if (testDbPool) {
    await testDbPool.end();
    testDbPool = null;
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

export default {
  getTestDb,
  cleanupTestDb,
  seedTestData,
  createTestToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  waitFor,
  generateTestData,
};
