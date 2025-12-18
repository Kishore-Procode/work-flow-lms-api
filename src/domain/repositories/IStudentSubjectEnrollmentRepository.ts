import { StudentSubjectEnrollment } from '../entities/StudentSubjectEnrollment';

export interface IStudentSubjectEnrollmentRepository {
  /**
   * Save a new enrollment
   */
  save(enrollment: StudentSubjectEnrollment): Promise<StudentSubjectEnrollment>;

  /**
   * Update an existing enrollment
   */
  update(enrollment: StudentSubjectEnrollment): Promise<StudentSubjectEnrollment>;

  /**
   * Find enrollment by ID
   */
  findById(id: string): Promise<StudentSubjectEnrollment | null>;

  /**
   * Find all enrollments for a student
   */
  findByStudentId(studentId: string): Promise<StudentSubjectEnrollment[]>;

  /**
   * Find enrollments for a student in a specific semester
   */
  findByStudentIdAndSemester(studentId: string, semesterNumber: number): Promise<StudentSubjectEnrollment[]>;

  /**
   * Find enrollments for a student in a specific academic year
   */
  findByStudentIdAndAcademicYear(studentId: string, academicYearId: string): Promise<StudentSubjectEnrollment[]>;

  /**
   * Check if student is already enrolled in a subject
   */
  isStudentEnrolled(studentId: string, contentMapSubDetailsId: string, academicYearId: string): Promise<boolean>;

  /**
   * Get enrollment count for a subject
   */
  getEnrollmentCount(contentMapSubDetailsId: string): Promise<number>;

  /**
   * Bulk save enrollments (for enrolling in multiple subjects at once)
   */
  bulkSave(enrollments: StudentSubjectEnrollment[]): Promise<StudentSubjectEnrollment[]>;

  /**
   * Delete an enrollment
   */
  delete(id: string): Promise<void>;
}

