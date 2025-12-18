// User types
export type UserRole = 'super_admin' | 'admin' | 'principal' | 'hod' | 'staff' | 'student';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  college_id?: string;
  department_id?: string;
  course_id?: string; // New: Reference to course
  section_id?: string; // New: Reference to section
  academic_year_id?: string; // New: Reference to academic year
  year_of_study?: string; // New: Year of study (1st Year, 2nd Year, etc.)
  class_in_charge?: string; // For staff members
  class?: string; // For students (legacy, use section_id instead)
  semester?: string; // For students
  roll_number?: string; // For students
  profile_image_url?: string;
  qualification?: string; // Educational qualification for staff
  experience?: string; // Work experience for staff
  employee_id?: string; // Employee ID for staff
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  // Joined fields from related tables
  college_name?: string;
  department_name?: string;
  course_name?: string;
  course_code?: string;
  section_name?: string;
  academic_year_name?: string;
}

// College types
export type CollegeStatus = 'active' | 'inactive' | 'suspended';

export interface College {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  established?: string;
  principalId?: string;
  status: CollegeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface State{
  id:string,
  name:string
}

export interface District{
  id:string,
  name:string
}

// Course types
export type CourseType = 'BE' | 'ME' | 'BTech' | 'MTech' | 'PhD' | 'Diploma' | 'Certificate';

export interface Course {
  id: string;
  name: string; // e.g., "Bachelor of Engineering", "Master of Technology"
  code: string; // e.g., "BE", "MTech"
  type: CourseType;
  duration_years?: number; // Course duration in years (optional - legacy field)
  college_id: string;
  department_id?: string; // Department ID (optional)
  is_active: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Academic Year types
export interface AcademicYear {
  id: string;
  course_id: string;
  year_number: number; // 1, 2, 3, 4
  year_name: string; // "1st Year", "2nd Year", etc.
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Section types
export type SectionStatus = 'active' | 'inactive' | 'archived';

export interface Section {
  id: string;
  name: string; // "A", "B", "C", etc.
  course_id: string;
  department_id: string;
  academic_year_id: string;
  class_in_charge_id?: string;
  max_students: number;
  current_students: number;
  status: SectionStatus;
  academic_session?: string; // "2024-25", "2025-26"
  created_at: Date;
  updated_at: Date;
}

// Department types
export interface Department {
  id: string;
  name: string;
  code: string;
  collegeId: string;
  course_id?: string; // New: Reference to course
  hodId?: string;
  totalStudents: number;
  totalStaff: number;
  established?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invitation types
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  sentBy: string;
  sentAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  expiresAt: Date;
  collegeId: string;
  departmentId?: string;
  invitationToken: string;
  createdAt: Date;
  // Additional fields for invitation details
  name?: string;
  phone?: string;
  yearOfStudy?: number;
  section?: string;
  rollNumber?: string;
  academicYearId?: string;
  courseId?: string;
  sectionId?: string;
  designation?: string;
  qualification?: string;
  experience?: number;
}

// Registration request types
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationRequest {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  status: RequestStatus;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  collegeId?: string;
  departmentId?: string;
  // New course-related fields
  courseId?: string; // Reference to course
  sectionId?: string; // Reference to section
  academicYearId?: string; // Reference to academic year
  class?: string; // For student requests (legacy, use sectionId instead)
  rollNumber?: string; // For student requests
  semester?: string; // For student requests
  batchYear?: number; // For student requests
  yearOfStudy?: string; // For student requests
  collegeName?: string; // For new college requests
  // Address fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  // Personal fields
  aadharNumber?: string;
  dateOfBirth?: Date;
  // SPOC fields for college registration
  spocName?: string;
  spocEmail?: string;
  spocPhone?: string;
  rejectionReason?: string;
  createdAt: Date;
}

// resource types
export type resourcestatus = 'assigned' | 'healthy' | 'needs_attention' | 'deceased' | 'replaced';

export interface resource {
  id: string;
  resourceId: string;
  resourceCode: string;
  category: string;
  startedDate: Date;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  assignedStudentId?: string;
  assignedDate?: Date;
  status: resourcestatus;
  collegeId: string;
  departmentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// resource monitoring types
export interface resourceMonitoringRecord {
  id: string;
  resourceId: string;
  studentId: string;
  monitoringDate: Date;
  heightCm?: number;
  trunkDiameterCm?: number;
  healthStatus: string;
  watered: boolean;
  fertilized: boolean;
  pruned: boolean;
  pestIssues?: string;
  diseaseIssues?: string;
  generalNotes?: string;
  weatherConditions?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

// resource photo types
export interface resourcePhoto {
  id: string;
  resourceId: string;
  monitoringRecordId?: string;
  uploadedBy: string;
  photoUrl: string;
  photoType: string;
  caption?: string;
  takenAt: Date;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: Date;
}

// Pagination types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface AuthTokenPayload {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  collegeId?: string;
  departmentId?: string;
  status?: UserStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  refreshToken: string;
}

// Request types with authentication
export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter types
export interface UserFilter extends PaginationQuery {
  role?: UserRole;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  search?: string;
}

export interface resourceFilter extends PaginationQuery {
  status?: resourcestatus;
  collegeId?: string;
  departmentId?: string;
  assignedStudentId?: string | null;
  category?: string;
  search?: string;
  filterByStudentDepartment?: boolean; // Filter by student's department instead of resource's department
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  totalColleges: number;
  totalresources: number;
  totalMonitoringRecords: number;
  recentActivity: any[];
}

// Email types
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Filter types
export interface DepartmentFilter {
  collegeId?: string;
  hodId?: string;
  status?: string;
  search?: string;
}

export interface InvitationFilter {
  role?: UserRole;
  status?: InvitationStatus;
  collegeId?: string;
  departmentId?: string;
  search?: string;
}

export interface RegistrationRequestFilter {
  role?: UserRole;
  status?: RegistrationRequestStatus;
  collegeId?: string;
  departmentId?: string;
  search?: string;
}

export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  collegeId?: string;
  departmentId?: string;
  search?: string;
}

// Registration Request Status
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected';
