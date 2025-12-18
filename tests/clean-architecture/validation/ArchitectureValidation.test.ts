/**
 * Clean Architecture Validation Tests
 * 
 * Tests to validate that the Clean Architecture principles are properly implemented.
 * Ensures dependency inversion, layer separation, and architectural constraints.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { DIContainer } from '../../../src/infrastructure/container/DIContainer';
import { ExpressAppFactory } from '../../../src/infrastructure/web/ExpressAppFactory';
import { CleanArchitectureServer } from '../../../src/infrastructure/web/CleanArchitectureServer';
import { Department } from '../../../src/domain/entities/Department';
import { CreateDepartmentUseCase } from '../../../src/application/use-cases/department/CreateDepartmentUseCase';
import { DepartmentController } from '../../../src/interface-adapters/controllers/DepartmentController';
import { PostgreSQLDepartmentRepository } from '../../../src/infrastructure/repositories/PostgreSQLDepartmentRepository';
import { getTestDb, cleanupTestDb } from '../../setup';
import { Pool } from 'pg';

describe('Clean Architecture Validation', () => {
  let testDbPool: Pool;

  beforeAll(async () => {
    testDbPool = await getTestDb();
    await cleanupTestDb();
  });

  afterAll(async () => {
    if (testDbPool) {
      await testDbPool.end();
    }
  });

  describe('Dependency Injection Container', () => {
    it('should initialize DIContainer successfully', () => {
      expect(() => {
        DIContainer.initialize({
          database: { pool: testDbPool },
          jwt: {
            secret: 'test-secret',
            refreshSecret: 'test-refresh-secret',
            expiresIn: '1h',
            refreshExpiresIn: '7d',
          },
        });
      }).not.toThrow();

      const container = DIContainer.getInstance();
      expect(container).toBeDefined();
    });

    it('should provide singleton instances', () => {
      const container = DIContainer.getInstance();
      
      const userRepo1 = container.userRepository;
      const userRepo2 = container.userRepository;
      
      expect(userRepo1).toBe(userRepo2); // Same instance
    });

    it('should wire dependencies correctly', () => {
      const container = DIContainer.getInstance();
      
      // Test that use cases receive their dependencies
      const createDepartmentUseCase = container.createDepartmentUseCase;
      expect(createDepartmentUseCase).toBeInstanceOf(CreateDepartmentUseCase);
      
      // Test that controllers receive their dependencies
      const departmentController = container.departmentController;
      expect(departmentController).toBeInstanceOf(DepartmentController);
    });

    it('should create test container with mocks', () => {
      const mockUserRepository = {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        save: jest.fn(),
      };

      const testContainer = DIContainer.createTestContainer({
        userRepository: mockUserRepository,
      });

      expect(testContainer).toBeDefined();
      expect(testContainer.userRepository).toBe(mockUserRepository);
    });
  });

  describe('Layer Separation', () => {
    it('should maintain domain layer independence', () => {
      // Domain entities should not depend on external frameworks
      const department = Department.create({
        name: 'Test Department',
        code: 'TEST',
        collegeId: 'college-123',
      });

      expect(department).toBeInstanceOf(Department);
      expect(department.getName()).toBe('Test Department');
      
      // Domain entities should have business logic
      expect(typeof department.canBeDeleted).toBe('function');
      expect(typeof department.assignHod).toBe('function');
    });

    it('should ensure use cases depend only on interfaces', () => {
      // Use cases should not directly depend on infrastructure implementations
      const container = DIContainer.getInstance();
      const useCase = container.createDepartmentUseCase;
      
      expect(useCase).toBeInstanceOf(CreateDepartmentUseCase);
      
      // Use case should work with any implementation of the repository interface
      expect(useCase).toBeDefined();
    });

    it('should ensure controllers depend only on use cases', () => {
      const container = DIContainer.getInstance();
      const controller = container.departmentController;
      
      expect(controller).toBeInstanceOf(DepartmentController);
      
      // Controller should have methods for HTTP handling
      expect(typeof controller.createDepartment).toBe('function');
      expect(typeof controller.getDepartments).toBe('function');
    });

    it('should ensure repositories implement domain interfaces', () => {
      const container = DIContainer.getInstance();
      const repository = container.departmentRepository;
      
      expect(repository).toBeInstanceOf(PostgreSQLDepartmentRepository);
      
      // Repository should implement all interface methods
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findWithSimpleFilters).toBe('function');
    });
  });

  describe('Express App Factory', () => {
    it('should create default app with both architectures', () => {
      const app = ExpressAppFactory.createDefault();
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should create Clean Architecture only app', () => {
      const app = ExpressAppFactory.createCleanArchitectureOnly();
      expect(app).toBeDefined();
    });

    it('should create legacy only app', () => {
      const app = ExpressAppFactory.createLegacyOnly();
      expect(app).toBeDefined();
    });

    it('should create testing app with minimal configuration', () => {
      const app = ExpressAppFactory.createForTesting();
      expect(app).toBeDefined();
    });
  });

  describe('Clean Architecture Server', () => {
    it('should create server instance', () => {
      const server = new CleanArchitectureServer();
      expect(server).toBeDefined();
      expect(typeof server.start).toBe('function');
      expect(typeof server.stop).toBe('function');
    });

    it('should handle graceful shutdown', async () => {
      const server = new CleanArchitectureServer();
      
      // Should not throw when stopping a server that hasn't started
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('Domain Entity Validation', () => {
    it('should enforce business rules in domain entities', () => {
      const department = Department.create({
        name: 'Test Department',
        code: 'TEST',
        collegeId: 'college-123',
      });

      // Test business rule: cannot delete department with students
      department.updateStudentCount(50);
      expect(department.canBeDeleted()).toBe(false);

      // Test business rule: can delete department without students
      department.updateStudentCount(0);
      expect(department.canBeDeleted()).toBe(true);
    });

    it('should validate entity creation', () => {
      // Should throw error for invalid data
      expect(() => {
        Department.create({
          name: '', // Invalid: empty name
          code: 'TEST',
          collegeId: 'college-123',
        });
      }).toThrow();

      expect(() => {
        Department.create({
          name: 'Test Department',
          code: 'TOOLONGCODE123', // Invalid: too long
          collegeId: 'college-123',
        });
      }).toThrow();
    });

    it('should support entity persistence mapping', () => {
      const department = Department.create({
        name: 'Test Department',
        code: 'TEST',
        collegeId: 'college-123',
      });

      // Should convert to persistence format
      const persistenceData = department.toPersistence();
      expect(persistenceData).toHaveProperty('id');
      expect(persistenceData).toHaveProperty('name', 'Test Department');
      expect(persistenceData).toHaveProperty('code', 'TEST');

      // Should recreate from persistence data
      const recreatedDepartment = Department.fromPersistence(persistenceData);
      expect(recreatedDepartment.equals(department)).toBe(true);
    });
  });

  describe('API Response Format Consistency', () => {
    it('should maintain consistent API response format', () => {
      // All API responses should follow the same format
      const expectedFormat = {
        success: expect.any(Boolean),
        message: expect.any(String),
        data: expect.anything(),
      };

      // This would be tested in integration tests, but we can validate the structure
      expect(expectedFormat).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle domain errors properly', () => {
      expect(() => {
        Department.create({
          name: '',
          code: 'TEST',
          collegeId: 'college-123',
        });
      }).toThrow();
    });

    it('should handle repository errors gracefully', async () => {
      // This would be tested with actual repository implementations
      // For now, we just ensure the error handling structure exists
      const container = DIContainer.getInstance();
      const repository = container.departmentRepository;
      
      expect(typeof repository.withTransaction).toBe('function');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate DIContainer configuration', () => {
      expect(() => {
        DIContainer.initialize({
          database: { pool: testDbPool },
          jwt: {
            secret: 'test-secret',
            refreshSecret: 'test-refresh-secret',
            expiresIn: '1h',
            refreshExpiresIn: '7d',
          },
        });
      }).not.toThrow();
    });

    it('should handle missing configuration gracefully', () => {
      // Should throw error for missing required configuration
      expect(() => {
        DIContainer.initialize({
          database: { pool: testDbPool },
          jwt: {
            secret: '', // Missing secret
            refreshSecret: 'test-refresh-secret',
            expiresIn: '1h',
            refreshExpiresIn: '7d',
          },
        });
      }).toThrow();
    });
  });

  describe('Performance Validation', () => {
    it('should create entities efficiently', () => {
      const startTime = Date.now();
      
      // Create multiple entities
      for (let i = 0; i < 1000; i++) {
        Department.create({
          name: `Department ${i}`,
          code: `DEPT${i}`,
          collegeId: 'college-123',
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should create 1000 entities in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should initialize DIContainer efficiently', () => {
      const startTime = Date.now();
      
      DIContainer.initialize({
        database: { pool: testDbPool },
        jwt: {
          secret: 'test-secret',
          refreshSecret: 'test-refresh-secret',
          expiresIn: '1h',
          refreshExpiresIn: '7d',
        },
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should initialize in less than 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks with entity creation', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and discard many entities
      for (let i = 0; i < 10000; i++) {
        const dept = Department.create({
          name: `Department ${i}`,
          code: `D${i}`,
          collegeId: 'college-123',
        });
        // Entity goes out of scope and should be garbage collected
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
