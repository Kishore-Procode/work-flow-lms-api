// =====================================================
// Get Current Semester Use Case DTOs
// =====================================================

export interface GetCurrentSemesterRequest {
  studentId: string;
}

export interface GetCurrentSemesterResponse {
  studentId: string;
  studentName: string;
  courseType: string;
  courseName: string;
  departmentName: string;
  batchYear: number;
  currentSemester: number;
  academicYearId: string;
  academicYearName: string;
  semesterStartDate: Date;
  semesterEndDate: Date;
}

// =====================================================
// Get Available Subjects Use Case DTOs
// =====================================================

export interface GetAvailableSubjectsRequest {
  studentId: string;
  semesterNumber: number;
}

export interface AvailableSubjectDTO {
  id: string; // content_map_sub_details_id
  actSubjectId: string;
  actSubjectCode: string;
  actSubjectName: string;
  actSubjectCredits: number;
  lmsLearningResourceId: string | null;
  isEnrolled: boolean;
  enrollmentId?: string;
}

export interface GetAvailableSubjectsResponse {
  semesterNumber: number;
  subjects: AvailableSubjectDTO[];
  totalSubjects: number;
  enrolledSubjects: number;
  contentMapMasterId: string;
  contentMapSemDetailsId: string;
}

// =====================================================
// Enroll Subjects Use Case DTOs
// =====================================================

export interface EnrollSubjectsRequest {
  studentId: string;
  semesterNumber: number;
  academicYearId: string;
  subjectIds: string[]; // Array of content_map_sub_details_id
}

export interface EnrolledSubjectDTO {
  enrollmentId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  enrollmentDate: Date;
}

export interface EnrollSubjectsResponse {
  message: string;
  enrolledSubjects: EnrolledSubjectDTO[];
  totalEnrolled: number;
  semesterNumber: number;
}

// =====================================================
// Get Enrolled Subjects Use Case DTOs
// =====================================================

export interface GetEnrolledSubjectsRequest {
  studentId: string;
  semesterNumber?: number; // Optional: filter by semester
  academicYearId?: string; // Optional: filter by academic year
}

export interface LessonPlanDTO {
  id: string;
  moduleName: string;
  title: string;
  pdfUrl: string | null;
  duration: number | null;
}

export interface EnrolledSubjectDetailDTO {
  enrollmentId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  semesterNumber: number;
  enrollmentDate: Date;
  status: string;
  progressPercentage: number;
  completedAt: Date | null;
  grade: string | null;
  marksObtained: number | null;
  totalMarks: number | null;
  lmsLearningResourceId: string | null;
  // Additional fields for UI enhancements
  regulationId: string | null;
  regulationName: string | null;
  syllabusPdfUrl: string | null;
  lessonPlans: LessonPlanDTO[];
}

export interface GetEnrolledSubjectsResponse {
  enrollments: EnrolledSubjectDetailDTO[];
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
}

// =====================================================
// Get Subject Learning Content Use Case DTOs
// =====================================================

export interface GetSubjectLearningContentRequest {
  studentId: string;
  enrollmentId: string;
}

export interface LearningResourceDTO {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  contentUrl: string | null;
  duration: number | null;
  order: number;
}

export interface GetSubjectLearningContentResponse {
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
  actSubjectId: string;
  // Course details from workflowmgmt.courses
  credits: number;
  courseType: string;
  durationWeeks: number;
  description: string | null;
  prerequisites: string | null;
  learningObjectives: string | null;
  learningOutcomes: string | null;
  // Syllabus content from workflowmgmt.syllabi
  syllabusContent: string | null;
  // Enrollment progress
  progressPercentage: number;
  status: string;
}

// =====================================================
// Drop Enrollment Use Case DTOs
// =====================================================

export interface DropEnrollmentRequest {
  studentId: string;
  enrollmentId: string;
}

export interface DropEnrollmentResponse {
  message: string;
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
}

