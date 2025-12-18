/**
 * Subject Staff Assignment DTOs
 * 
 * Data Transfer Objects for subject-staff assignment operations.
 * Used by HOD to assign staff to subjects in their department.
 * 
 * @author ACT-LMS Team
 * @version 1.0.0
 */

// ==================== GET SEMESTERS FOR HOD ====================

export interface GetHODSemestersRequest {
  hodId: string;
  academicYearId?: string; // Optional: filter by academic year
}

export interface HODSemesterDTO {
  semesterNumber: number;
  semesterName: string;
  totalSubjects: number;
  assignedSubjects: number;
  unassignedSubjects: number;
  contentMapSemDetailsId: string;
}

export interface GetHODSemestersResponse {
  departmentId: string;
  departmentName: string;
  academicYearId: string;
  academicYearName: string;
  semesters: HODSemesterDTO[];
}

// ==================== GET SUBJECTS FOR ASSIGNMENT ====================

export interface GetSubjectsForAssignmentRequest {
  hodId: string;
  semesterNumber: number;
  academicYearId: string;
}

export interface SubjectForAssignmentDTO {
  id: string; // content_map_sub_details_id
  subjectCode: string;
  subjectName: string;
  credits: number;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedStaffEmail: string | null;
  assignedAt: Date | null;
  assignmentId: string | null;
  isAssigned: boolean;
}

export interface GetSubjectsForAssignmentResponse {
  departmentId: string;
  departmentName: string;
  semesterNumber: number;
  academicYearId: string;
  subjects: SubjectForAssignmentDTO[];
  totalSubjects: number;
  assignedCount: number;
  unassignedCount: number;
}

// ==================== GET AVAILABLE STAFF ====================

export interface GetAvailableStaffRequest {
  hodId: string;
  semesterNumber?: number; // Optional: to show workload for this semester
  academicYearId?: string; // Optional: content map sem details ID to filter workload
}

export interface StaffForAssignmentDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  qualification: string | null;
  experience: string | null;
  assignedSubjectsCount: number;
  assignedSubjects: Array<{
    subjectCode: string;
    subjectName: string;
    semesterNumber: number;
  }>;
}

export interface GetAvailableStaffResponse {
  departmentId: string;
  departmentName: string;
  staff: StaffForAssignmentDTO[];
  totalStaff: number;
}

// ==================== ASSIGN STAFF TO SUBJECT ====================

export interface AssignStaffToSubjectRequest {
  hodId: string;
  contentMapSubDetailsId: string;
  staffId: string;
  semesterNumber: number;
  academicYearId: string;
  notes?: string;
}

export interface AssignStaffToSubjectResponse {
  success: boolean;
  message: string;
  assignment: {
    assignmentId: string;
    subjectCode: string;
    subjectName: string;
    staffName: string;
    staffEmail: string;
    assignedAt: Date;
  };
}

// ==================== BULK ASSIGN STAFF ====================

export interface BulkAssignmentItem {
  contentMapSubDetailsId: string;
  staffId: string;
  notes?: string;
}

export interface BulkAssignStaffRequest {
  hodId: string;
  semesterNumber: number;
  academicYearId: string;
  assignments: BulkAssignmentItem[];
}

export interface BulkAssignStaffResponse {
  success: boolean;
  message: string;
  successCount: number;
  failureCount: number;
  results: Array<{
    contentMapSubDetailsId: string;
    subjectName: string;
    success: boolean;
    message: string;
  }>;
}

// ==================== REMOVE STAFF ASSIGNMENT ====================

export interface RemoveStaffAssignmentRequest {
  hodId: string;
  assignmentId: string;
}

export interface RemoveStaffAssignmentResponse {
  success: boolean;
  message: string;
}

// ==================== GET STAFF WORKLOAD ====================

export interface GetStaffWorkloadRequest {
  hodId: string;
  academicYearId: string;
}

export interface StaffWorkloadDTO {
  staffId: string;
  staffName: string;
  staffEmail: string;
  totalSubjects: number;
  semesterWiseLoad: Array<{
    semesterNumber: number;
    subjectsCount: number;
    subjects: Array<{
      subjectCode: string;
      subjectName: string;
      credits: number;
    }>;
  }>;
  totalCredits: number;
}

export interface GetStaffWorkloadResponse {
  departmentId: string;
  departmentName: string;
  academicYearId: string;
  academicYearName: string;
  staffWorkloads: StaffWorkloadDTO[];
}
