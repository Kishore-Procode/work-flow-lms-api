import { v4 as uuidv4 } from 'uuid';
import { DomainError } from '../errors/DomainError';

export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'failed';

export interface StudentSubjectEnrollmentProps {
  id?: string;
  studentId: string;
  contentMapSubDetailsId: string;
  semesterNumber: number;
  academicYearId: string;
  enrollmentDate?: Date;
  status?: EnrollmentStatus;
  progressPercentage?: number;
  completedAt?: Date | null;
  grade?: string | null;
  marksObtained?: number | null;
  totalMarks?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentSubjectEnrollmentPersistence {
  id: string;
  student_id: string;
  content_map_sub_details_id: string;
  semester_number: number;
  academic_year_id: string;
  enrollment_date: Date;
  status: EnrollmentStatus;
  progress_percentage: number;
  completed_at: Date | null;
  grade: string | null;
  marks_obtained: number | null;
  total_marks: number | null;
  created_at: Date;
  updated_at: Date;
}

export class StudentSubjectEnrollment {
  private constructor(private props: Required<Omit<StudentSubjectEnrollmentProps, 'completedAt' | 'grade' | 'marksObtained' | 'totalMarks'>> & {
    completedAt: Date | null;
    grade: string | null;
    marksObtained: number | null;
    totalMarks: number | null;
  }) {}

  public static create(props: StudentSubjectEnrollmentProps): StudentSubjectEnrollment {
    // Validate required fields
    if (!props.studentId) {
      throw new DomainError('Student ID is required');
    }
    if (!props.contentMapSubDetailsId) {
      throw new DomainError('Content map subject details ID is required');
    }
    if (!props.semesterNumber || props.semesterNumber < 1 || props.semesterNumber > 10) {
      throw new DomainError('Semester number must be between 1 and 10');
    }
    if (!props.academicYearId) {
      throw new DomainError('Academic year ID is required');
    }

    // Validate progress percentage
    const progressPercentage = props.progressPercentage ?? 0;
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new DomainError('Progress percentage must be between 0 and 100');
    }

    const now = new Date();

    return new StudentSubjectEnrollment({
      id: props.id || uuidv4(),
      studentId: props.studentId,
      contentMapSubDetailsId: props.contentMapSubDetailsId,
      semesterNumber: props.semesterNumber,
      academicYearId: props.academicYearId,
      enrollmentDate: props.enrollmentDate || now,
      status: props.status || 'active',
      progressPercentage,
      completedAt: props.completedAt ?? null,
      grade: props.grade ?? null,
      marksObtained: props.marksObtained ?? null,
      totalMarks: props.totalMarks ?? null,
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now,
    });
  }

  public static fromPersistence(data: StudentSubjectEnrollmentPersistence): StudentSubjectEnrollment {
    return new StudentSubjectEnrollment({
      id: data.id,
      studentId: data.student_id,
      contentMapSubDetailsId: data.content_map_sub_details_id,
      semesterNumber: data.semester_number,
      academicYearId: data.academic_year_id,
      enrollmentDate: data.enrollment_date,
      status: data.status,
      progressPercentage: data.progress_percentage,
      completedAt: data.completed_at,
      grade: data.grade,
      marksObtained: data.marks_obtained,
      totalMarks: data.total_marks,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  public toPersistence(): StudentSubjectEnrollmentPersistence {
    return {
      id: this.props.id,
      student_id: this.props.studentId,
      content_map_sub_details_id: this.props.contentMapSubDetailsId,
      semester_number: this.props.semesterNumber,
      academic_year_id: this.props.academicYearId,
      enrollment_date: this.props.enrollmentDate,
      status: this.props.status,
      progress_percentage: this.props.progressPercentage,
      completed_at: this.props.completedAt,
      grade: this.props.grade,
      marks_obtained: this.props.marksObtained,
      total_marks: this.props.totalMarks,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }

  // Getters
  public getId(): string {
    return this.props.id;
  }

  public getStudentId(): string {
    return this.props.studentId;
  }

  public getContentMapSubDetailsId(): string {
    return this.props.contentMapSubDetailsId;
  }

  public getSemesterNumber(): number {
    return this.props.semesterNumber;
  }

  public getAcademicYearId(): string {
    return this.props.academicYearId;
  }

  public getEnrollmentDate(): Date {
    return this.props.enrollmentDate;
  }

  public getStatus(): EnrollmentStatus {
    return this.props.status;
  }

  public getProgressPercentage(): number {
    return this.props.progressPercentage;
  }

  public getCompletedAt(): Date | null {
    return this.props.completedAt;
  }

  public getGrade(): string | null {
    return this.props.grade;
  }

  public getMarksObtained(): number | null {
    return this.props.marksObtained;
  }

  public getTotalMarks(): number | null {
    return this.props.totalMarks;
  }

  public getCreatedAt(): Date {
    return this.props.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  public updateProgress(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new DomainError('Progress percentage must be between 0 and 100');
    }
    this.props.progressPercentage = percentage;
    this.props.updatedAt = new Date();

    // Auto-complete if 100%
    if (percentage === 100 && this.props.status === 'active') {
      this.complete();
    }
  }

  public complete(): void {
    if (this.props.status === 'completed') {
      throw new DomainError('Enrollment is already completed');
    }
    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.progressPercentage = 100;
    this.props.updatedAt = new Date();
  }

  public drop(): void {
    if (this.props.status === 'completed') {
      throw new DomainError('Cannot drop a completed enrollment');
    }
    this.props.status = 'dropped';
    this.props.updatedAt = new Date();
  }

  public fail(): void {
    this.props.status = 'failed';
    this.props.updatedAt = new Date();
  }

  public assignGrade(grade: string, marksObtained?: number, totalMarks?: number): void {
    this.props.grade = grade;
    this.props.marksObtained = marksObtained ?? null;
    this.props.totalMarks = totalMarks ?? null;
    this.props.updatedAt = new Date();
  }

  public isActive(): boolean {
    return this.props.status === 'active';
  }

  public isCompleted(): boolean {
    return this.props.status === 'completed';
  }
}

