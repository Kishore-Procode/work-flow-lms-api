/**
 * Department Entity Unit Tests
 * 
 * Comprehensive unit tests for the Department domain entity.
 * Tests business rules, validation, and domain logic.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { Department } from '../../../../src/domain/entities/Department';
import { DomainError } from '../../../../src/domain/errors/DomainError';

describe('Department Entity', () => {
  const validDepartmentProps = {
    name: 'Computer Science',
    code: 'CSE',
    collegeId: 'college-123',
    courseId: 'course-456',
    hodId: 'hod-789',
    established: new Date('2020-01-01'),
    isActive: true,
    isCustom: false,
  };

  describe('Creation', () => {
    it('should create department with valid properties', () => {
      const department = Department.create(validDepartmentProps);

      expect(department.getId()).toBeDefined();
      expect(department.getName()).toBe('Computer Science');
      expect(department.getCode()).toBe('CSE');
      expect(department.getCollegeId()).toBe('college-123');
      expect(department.getCourseId()).toBe('course-456');
      expect(department.getHodId()).toBe('hod-789');
      expect(department.getEstablished()).toEqual(new Date('2020-01-01'));
      expect(department.isActive()).toBe(true);
      expect(department.isCustom()).toBe(false);
    });

    it('should create department with minimal required properties', () => {
      const minimalProps = {
        name: 'Mathematics',
        code: 'MATH',
        collegeId: 'college-123',
      };

      const department = Department.create(minimalProps);

      expect(department.getName()).toBe('Mathematics');
      expect(department.getCode()).toBe('MATH');
      expect(department.getCollegeId()).toBe('college-123');
      expect(department.getCourseId()).toBeUndefined();
      expect(department.getHodId()).toBeUndefined();
      expect(department.isActive()).toBe(true); // Default value
      expect(department.isCustom()).toBe(false); // Default value
    });

    it('should throw error for invalid name', () => {
      const invalidProps = {
        ...validDepartmentProps,
        name: '', // Empty name
      };

      expect(() => Department.create(invalidProps)).toThrow(DomainError);
      expect(() => Department.create(invalidProps)).toThrow('Department name cannot be empty');
    });

    it('should throw error for invalid code', () => {
      const invalidProps = {
        ...validDepartmentProps,
        code: 'INVALID_CODE_TOO_LONG', // Too long
      };

      expect(() => Department.create(invalidProps)).toThrow(DomainError);
      expect(() => Department.create(invalidProps)).toThrow('Department code must be between 2 and 10 characters');
    });

    it('should throw error for invalid college ID', () => {
      const invalidProps = {
        ...validDepartmentProps,
        collegeId: '', // Empty college ID
      };

      expect(() => Department.create(invalidProps)).toThrow(DomainError);
      expect(() => Department.create(invalidProps)).toThrow('College ID is required');
    });
  });

  describe('Business Rules', () => {
    let department: Department;

    beforeEach(() => {
      department = Department.create(validDepartmentProps);
    });

    describe('HOD Assignment', () => {
      it('should assign HOD successfully', () => {
        const newHodId = 'new-hod-123';
        
        department.assignHod(newHodId);
        
        expect(department.getHodId()).toBe(newHodId);
      });

      it('should throw error when assigning invalid HOD ID', () => {
        expect(() => department.assignHod('')).toThrow(DomainError);
        expect(() => department.assignHod('')).toThrow('HOD ID cannot be empty');
      });

      it('should allow removing HOD by assigning undefined', () => {
        department.assignHod(undefined);
        
        expect(department.getHodId()).toBeUndefined();
      });
    });

    describe('Course Association', () => {
      it('should associate with course successfully', () => {
        const newCourseId = 'new-course-123';
        
        department.associateWithCourse(newCourseId);
        
        expect(department.getCourseId()).toBe(newCourseId);
      });

      it('should throw error when associating with invalid course ID', () => {
        expect(() => department.associateWithCourse('')).toThrow(DomainError);
        expect(() => department.associateWithCourse('')).toThrow('Course ID cannot be empty');
      });

      it('should allow removing course association', () => {
        department.associateWithCourse(undefined);
        
        expect(department.getCourseId()).toBeUndefined();
      });
    });

    describe('Student Count Management', () => {
      it('should update student count successfully', () => {
        department.updateStudentCount(150);
        
        expect(department.getStudentCount()).toBe(150);
      });

      it('should throw error for negative student count', () => {
        expect(() => department.updateStudentCount(-1)).toThrow(DomainError);
        expect(() => department.updateStudentCount(-1)).toThrow('Student count cannot be negative');
      });

      it('should allow zero student count', () => {
        department.updateStudentCount(0);
        
        expect(department.getStudentCount()).toBe(0);
      });
    });

    describe('Activation/Deactivation', () => {
      it('should activate department', () => {
        department.deactivate();
        expect(department.isActive()).toBe(false);
        
        department.activate();
        expect(department.isActive()).toBe(true);
      });

      it('should deactivate department', () => {
        expect(department.isActive()).toBe(true);
        
        department.deactivate();
        expect(department.isActive()).toBe(false);
      });
    });

    describe('Deletion Rules', () => {
      it('should allow deletion when no students are enrolled', () => {
        department.updateStudentCount(0);
        
        expect(department.canBeDeleted()).toBe(true);
      });

      it('should not allow deletion when students are enrolled', () => {
        department.updateStudentCount(50);
        
        expect(department.canBeDeleted()).toBe(false);
      });

      it('should not allow deletion when department is active with students', () => {
        department.updateStudentCount(25);
        department.activate();
        
        expect(department.canBeDeleted()).toBe(false);
      });

      it('should allow deletion when department is inactive and no students', () => {
        department.updateStudentCount(0);
        department.deactivate();
        
        expect(department.canBeDeleted()).toBe(true);
      });
    });
  });

  describe('Persistence Mapping', () => {
    it('should convert to persistence format correctly', () => {
      const department = Department.create(validDepartmentProps);
      const persistenceData = department.toPersistence();

      expect(persistenceData).toMatchObject({
        id: department.getId(),
        name: 'Computer Science',
        code: 'CSE',
        collegeId: 'college-123',
        courseId: 'course-456',
        hodId: 'hod-789',
        established: new Date('2020-01-01'),
        isActive: true,
        isCustom: false,
        studentCount: 0, // Default value
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create from persistence data correctly', () => {
      const persistenceData = {
        id: 'dept-123',
        name: 'Physics',
        code: 'PHY',
        collegeId: 'college-456',
        courseId: 'course-789',
        hodId: 'hod-101',
        established: new Date('2019-06-01'),
        isActive: true,
        isCustom: true,
        studentCount: 75,
        createdAt: new Date('2019-06-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      const department = Department.fromPersistence(persistenceData);

      expect(department.getId()).toBe('dept-123');
      expect(department.getName()).toBe('Physics');
      expect(department.getCode()).toBe('PHY');
      expect(department.getCollegeId()).toBe('college-456');
      expect(department.getCourseId()).toBe('course-789');
      expect(department.getHodId()).toBe('hod-101');
      expect(department.getEstablished()).toEqual(new Date('2019-06-01'));
      expect(department.isActive()).toBe(true);
      expect(department.isCustom()).toBe(true);
      expect(department.getStudentCount()).toBe(75);
    });

    it('should convert to plain object for API response', () => {
      const department = Department.create(validDepartmentProps);
      const plainObject = department.toPlainObject();

      expect(plainObject).toMatchObject({
        id: department.getId(),
        name: 'Computer Science',
        code: 'CSE',
        collegeId: 'college-123',
        courseId: 'course-456',
        hodId: 'hod-789',
        established: new Date('2020-01-01'),
        isActive: true,
        isCustom: false,
        studentCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('Equality', () => {
    it('should be equal when IDs match', () => {
      const department1 = Department.create(validDepartmentProps);
      const department2 = Department.fromPersistence({
        id: department1.getId(),
        name: 'Different Name',
        code: 'DIFF',
        collegeId: 'different-college',
        isActive: false,
        isCustom: true,
        studentCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(department1.equals(department2)).toBe(true);
    });

    it('should not be equal when IDs differ', () => {
      const department1 = Department.create(validDepartmentProps);
      const department2 = Department.create(validDepartmentProps);

      expect(department1.equals(department2)).toBe(false);
    });
  });
});
