/**
 * CreateDepartmentUseCase Unit Tests
 * 
 * Comprehensive unit tests for the CreateDepartmentUseCase.
 * Tests business logic, validation, and error handling.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { CreateDepartmentUseCase } from '../../../../src/application/use-cases/department/CreateDepartmentUseCase';
import { CreateDepartmentRequest } from '../../../../src/application/dtos/department/CreateDepartmentRequest';
import { CreateDepartmentResponse } from '../../../../src/application/dtos/department/CreateDepartmentResponse';
import { IDepartmentRepository } from '../../../../src/domain/repositories/IDepartmentRepository';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { Department } from '../../../../src/domain/entities/Department';
import { User } from '../../../../src/domain/entities/User';
import { DomainError } from '../../../../src/domain/errors/DomainError';

// Mock repositories
const mockDepartmentRepository: jest.Mocked<IDepartmentRepository> = {
  findById: jest.fn(),
  findByCode: jest.fn(),
  findWithFilters: jest.fn(),
  findWithSimpleFilters: jest.fn(),
  countWithFilters: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  existsByCode: jest.fn(),
  getStatistics: jest.fn(),
  withTransaction: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findWithFilters: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  existsByEmail: jest.fn(),
  count: jest.fn(),
  findByRole: jest.fn(),
  findByCollege: jest.fn(),
  findByDepartment: jest.fn(),
  withTransaction: jest.fn(),
};

describe('CreateDepartmentUseCase', () => {
  let useCase: CreateDepartmentUseCase;
  let mockAdminUser: User;
  let mockPrincipalUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create use case instance
    useCase = new CreateDepartmentUseCase(mockDepartmentRepository, mockUserRepository);

    // Create mock users
    mockAdminUser = User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      collegeId: 'college-123',
    });

    mockPrincipalUser = User.create({
      name: 'Principal User',
      email: 'principal@test.com',
      password: 'hashedpassword',
      role: 'principal',
      collegeId: 'college-123',
    });
  });

  describe('Successful Department Creation', () => {
    it('should create department successfully with admin user', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
          courseId: 'course-456',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      const expectedDepartment = Department.create({
        name: 'Computer Science',
        code: 'CSE',
        collegeId: 'college-123',
        courseId: 'course-456',
      });

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockDepartmentRepository.save.mockResolvedValue(expectedDepartment);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeInstanceOf(CreateDepartmentResponse);
      expect(response.toApiResponse()).toMatchObject({
        success: true,
        message: 'Department created successfully',
        data: expect.objectContaining({
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
          courseId: 'course-456',
        }),
      });

      // Verify repository calls
      expect(mockDepartmentRepository.existsByCode).toHaveBeenCalledWith('CSE', 'college-123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockAdminUser.getId());
      expect(mockDepartmentRepository.save).toHaveBeenCalledWith(expect.any(Department));
    });

    it('should create department successfully with principal user', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Mathematics',
          code: 'MATH',
          collegeId: 'college-123',
        },
        {
          id: mockPrincipalUser.getId(),
          role: 'principal',
          collegeId: 'college-123',
        }
      );

      const expectedDepartment = Department.create({
        name: 'Mathematics',
        code: 'MATH',
        collegeId: 'college-123',
      });

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(mockPrincipalUser);
      mockDepartmentRepository.save.mockResolvedValue(expectedDepartment);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response).toBeInstanceOf(CreateDepartmentResponse);
      expect(response.toApiResponse().success).toBe(true);
      expect(response.toApiResponse().data.name).toBe('Mathematics');
      expect(response.toApiResponse().data.code).toBe('MATH');
    });

    it('should create department with HOD assignment', async () => {
      // Arrange
      const hodUser = User.create({
        name: 'HOD User',
        email: 'hod@test.com',
        password: 'hashedpassword',
        role: 'hod',
        collegeId: 'college-123',
      });

      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Physics',
          code: 'PHY',
          collegeId: 'college-123',
          hodId: hodUser.getId(),
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      const expectedDepartment = Department.create({
        name: 'Physics',
        code: 'PHY',
        collegeId: 'college-123',
        hodId: hodUser.getId(),
      });

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(hodUser);
      mockDepartmentRepository.save.mockResolvedValue(expectedDepartment);

      // Act
      const response = await useCase.execute(request);

      // Assert
      expect(response.toApiResponse().data.hodId).toBe(hodUser.getId());
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findById).toHaveBeenNthCalledWith(2, hodUser.getId());
    });
  });

  describe('Validation Errors', () => {
    it('should throw error for invalid request data', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: '', // Invalid: empty name
          code: 'CSE',
          collegeId: 'college-123',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('Invalid request data');
    });

    it('should throw error for duplicate department code', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(true); // Department code exists
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('Department with code CSE already exists in this college');
    });

    it('should throw error for non-existent requesting user', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
        },
        {
          id: 'non-existent-user',
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(null); // User not found

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('Requesting user not found');
    });

    it('should throw error for non-existent HOD user', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
          hodId: 'non-existent-hod',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(null); // HOD not found

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('HOD user not found');
    });
  });

  describe('Authorization Errors', () => {
    it('should throw error when principal tries to create department for different college', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'different-college-456', // Different college
        },
        {
          id: mockPrincipalUser.getId(),
          role: 'principal',
          collegeId: 'college-123', // Principal's college
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(mockPrincipalUser);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('Principals can only create departments in their own college');
    });

    it('should throw error when HOD user is from different college', async () => {
      // Arrange
      const hodFromDifferentCollege = User.create({
        name: 'HOD Different College',
        email: 'hod.diff@test.com',
        password: 'hashedpassword',
        role: 'hod',
        collegeId: 'different-college-456',
      });

      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
          hodId: hodFromDifferentCollege.getId(),
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockAdminUser)
        .mockResolvedValueOnce(hodFromDifferentCollege);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(DomainError);
      await expect(useCase.execute(request)).rejects.toThrow('HOD must be from the same college as the department');
    });
  });

  describe('Repository Error Handling', () => {
    it('should handle repository save errors', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockDepartmentRepository.save.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
    });

    it('should handle repository existsByCode errors', async () => {
      // Arrange
      const request = CreateDepartmentRequest.fromHttpRequest(
        {
          name: 'Computer Science',
          code: 'CSE',
          collegeId: 'college-123',
        },
        {
          id: mockAdminUser.getId(),
          role: 'admin',
          collegeId: 'college-123',
        }
      );

      // Mock repository responses
      mockDepartmentRepository.existsByCode.mockRejectedValue(new Error('Database query failed'));

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Database query failed');
    });
  });
});
